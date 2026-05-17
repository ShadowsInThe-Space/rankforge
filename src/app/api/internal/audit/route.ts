import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { firecrawl } from "@/lib/firecrawl";
import type { HeadingStructure } from "@/types/audit";
import { calculateScore, scoreToGrade } from "@/lib/analyzers/scoring";
import { analyzeTechnicalSeo } from "@/lib/analyzers/technical";
import { analyzeLinkGraph } from "@/lib/analyzers/links";
import { analyzeContent } from "@/lib/analyzers/content";

// ─── Internal B2B API (Mission Control → RankForge) ─────────
// Uses INTERNAL_API_KEY header instead of NextAuth JWT

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

function requireInternalApiKey(request: NextRequest): NextResponse | null {
  const key = request.headers.get("x-internal-api-key");
  if (!key || key !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.endsWith(".local") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname) && hostname.startsWith("169.254.")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// POST /api/internal/audit — Start audit (no credit check, no auth required)
export async function POST(request: NextRequest) {
  const authError = requireInternalApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { url, keywords = [] } = body as { url: string; keywords?: string[] };

  if (!url) {
    return NextResponse.json({ error: "URL ist erforderlich" }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "Ungültige oder nicht erlaubte URL" }, { status: 400 });
  }

  let domain: string;
  try {
    domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });
  }

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  // Create audit with system user
  const audit = await prisma.audit.create({
    data: {
      url: normalizedUrl,
      domain,
      status: "mapping",
      keywords,
      userId: "00000000-0000-0000-0000-000000000000",
    },
  });

  // Start async pipeline
  runAuditPipeline(audit.id, normalizedUrl, domain, keywords).catch(
    async (err) => {
      console.error("Internal audit pipeline error:", err);
      await prisma.audit.update({
        where: { id: audit.id },
        data: { status: "error", error: String(err) },
      });
    }
  );

  return NextResponse.json({ id: audit.id, status: "mapping", url: normalizedUrl, domain });
}

// GET /api/internal/audit/[id] — Get audit result
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireInternalApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      pages: {
        select: {
          id: true,
          url: true,
          statusCode: true,
          title: true,
          description: true,
          h1: true,
          wordCount: true,
          score: true,
          contentType: true,
          issues: true,
        },
        orderBy: { url: "asc" },
      },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit nicht gefunden" }, { status: 404 });
  }

  let progress = 0;
  switch (audit.status) {
    case "pending": progress = 0; break;
    case "mapping": progress = 10; break;
    case "crawling": progress = 10 + Math.min(40, ((audit.pagesFound || 0) / 50) * 40); break;
    case "analyzing": progress = 80; break;
    case "done": progress = 100; break;
    case "error": progress = 0; break;
    default: progress = 0;
  }

  return NextResponse.json({ ...audit, progress: Math.round(progress) });
}

// ─── Audit Pipeline ────────────────────────────────────────
async function runAuditPipeline(auditId: string, url: string, domain: string, keywords: string[] = []) {
  // Phase 1: Map URLs
  let mapUrls: string[] = [];
  try {
    const mapResult = await firecrawl.map(url);
    if (mapResult.success) mapUrls = mapResult.links;
  } catch (e) {
    console.warn("Map failed:", e);
  }

  // Phase 2: Crawl
  await prisma.audit.update({ where: { id: auditId }, data: { status: "crawling" } });

  let crawlResult;
  let crawlTimedOut = false;
  let crawlPages: import("@/types/audit").FirecrawlPageData[] = [];

  try {
    crawlResult = await firecrawl.crawl(url, { limit: 200, scrapeOptions: { formats: ["markdown", "rawHtml", "links"] } });
    if (!crawlResult.success) throw new Error("Crawl failed");

    await prisma.audit.update({ where: { id: auditId }, data: { crawlJobId: crawlResult.id } });

    const crawlStatus = await firecrawl.waitForCrawl(crawlResult.id, async (status, elapsedMs) => {
      console.log(`[Crawl] ${status.completed || 0} pages (${Math.round(elapsedMs/1000)}s)`);
      await prisma.audit.update({ where: { id: auditId }, data: { pagesFound: status.completed || 0 } });
    }, 5000, 180000);

    if (crawlStatus.status === "timeout") crawlTimedOut = true;
    if (!crawlStatus || crawlStatus.status === "failed") throw new Error("Crawl failed");

    // Get actual page data after crawl completes
    try {
      const crawlDataStatus = await firecrawl.crawlStatus(crawlResult.id);
      crawlPages = crawlDataStatus.data || [];
    } catch (e) {
      console.warn("Failed to get crawl data:", e);
    }
  } catch (e) {
    console.warn("Crawl error, using homepage-only mode:", e);
    crawlTimedOut = true;
  }

  if (crawlTimedOut) {
    await prisma.audit.update({ where: { id: auditId }, data: { status: "analyzing", pagesFound: 1 } });
    try {
      const scrape = await firecrawl.scrape(url, { formats: ["markdown", "rawHtml", "links"] });
      if (scrape.success && scrape.data) {
        const headings = extractHeadings(scrape.data.rawHtml || "");
        await prisma.page.create({
          data: {
            auditId,
            url,
            statusCode: 200,
            title: scrape.data.metadata?.title || null,
            description: scrape.data.metadata?.description || null,
            h1: headings.h1[0] ?? null,
            wordCount: countWords(scrape.data.markdown || ""),
            markdown: scrape.data.markdown || null,
            html: scrape.data.rawHtml || "",
            links: JSON.stringify(categorizeLinks(scrape.data.links || [], url, domain)),
            headings: JSON.stringify(headings),
            contentType: null,
          },
        });
      }
    } catch (e) {
      console.warn("Homepage scrape failed:", e);
    }
    await runHomepageAnalysis(auditId, url, domain);
    return;
  }

  // Normal flow: Save all pages
  await prisma.audit.update({ where: { id: auditId }, data: { status: "analyzing", pagesFound: crawlPages.length } });

  for (const page of crawlPages) {
    const pageUrl = page.metadata?.sourceURL || "";
    if (!pageUrl) continue;

    const headings = extractHeadings(page.rawHtml || page.html || "");
    await prisma.page.create({
      data: {
        auditId,
        url: pageUrl,
        statusCode: page.metadata?.statusCode ?? null,
        title: page.metadata?.title ?? null,
        description: page.metadata?.description ?? null,
        h1: headings.h1[0] ?? null,
        wordCount: countWords(page.markdown || ""),
        markdown: page.markdown ?? null,
        html: page.rawHtml || page.html || "",
        links: JSON.stringify(categorizeLinks(page.links || [], pageUrl, domain)),
        headings: JSON.stringify(headings),
        contentType: null,
      },
    });
  }

  // ── Phase 3: Analyze and score all saved pages ─────────────────────
  const savedPages = await prisma.page.findMany({ where: { auditId } });
  if (savedPages.length > 0) {
    // Simple, fast scoring per page
    for (const page of savedPages) {
      const pageIssues: import("@/types/audit").Issue[] = [];
      let pageScore = 100;

      // Title checks
      if (!page.title) {
        pageIssues.push({ code: "TITLE_MISSING", message: "Title tag fehlt", severity: "critical", element: "head > title" });
        pageScore -= 15;
      } else if (page.title.length < 30) {
        pageIssues.push({ code: "TITLE_TOO_SHORT", message: `Title zu kurz (${page.title.length} Zeichen)`, severity: "warning", element: "head > title" });
        pageScore -= 5;
      } else if (page.title.length > 60) {
        pageIssues.push({ code: "TITLE_TOO_LONG", message: `Title zu lang (${page.title.length} Zeichen)`, severity: "warning", element: "head > title" });
        pageScore -= 3;
      }

      // Description checks
      if (!page.description) {
        pageIssues.push({ code: "DESC_MISSING", message: "Meta description fehlt", severity: "major", element: 'meta[name="description"]' });
        pageScore -= 10;
      } else if (page.description.length < 120) {
        pageIssues.push({ code: "DESC_TOO_SHORT", message: `Meta description zu kurz (${page.description.length} Zeichen)`, severity: "warning", element: 'meta[name="description"]' });
        pageScore -= 5;
      }

      // Content quality
      if ((page.wordCount || 0) < 300) {
        pageIssues.push({ code: "THIN_CONTENT", message: `Thin content (${page.wordCount || 0} words)`, severity: "warning", element: "body" });
        pageScore -= 20;
      } else if ((page.wordCount || 0) > 1500) {
        pageScore += 5; // bonus
      }

      // Status code
      if (page.statusCode && page.statusCode >= 400) {
        pageIssues.push({ code: "HTTP_ERROR", message: `HTTP ${page.statusCode}`, severity: "critical", element: "server" });
        pageScore -= 25;
      }

      pageScore = Math.max(0, Math.min(100, pageScore));
      await prisma.page.update({
        where: { id: page.id },
        data: {
          score: pageScore,
          issues: JSON.stringify(pageIssues),
        },
      });
    }

    // Aggregate score
    const pageScores = savedPages.map(p => {
      const p2 = savedPages.find(x => x.id === p.id)!;
      return p2.score ?? 0;
    }).filter(s => s > 0);
    const avgScore = pageScores.length > 0
      ? Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length)
      : 0;

    await prisma.audit.update({
      where: { id: auditId },
      data: { score: avgScore, grade: scoreToGrade(avgScore) },
    });
  }

  // Finalize
  await finalizeAudit(auditId, domain);
}

async function runHomepageAnalysis(auditId: string, url: string, domain: string) {
  const pages = await prisma.page.findMany({ where: { auditId } });
  if (pages.length === 0) return;
  const page = pages[0];
  const issues: import("@/types/audit").Issue[] = [];

  const titleLen = (page.title || "").length;
  if (titleLen === 0) issues.push({ code: "TITLE_MISSING", message: "Title tag fehlt", severity: "critical", element: "head > title" });
  else if (titleLen < 30) issues.push({ code: "TITLE_TOO_SHORT", message: `Title zu kurz (${titleLen} Zeichen)`, severity: "warning", element: "head > title" });
  else if (titleLen > 60) issues.push({ code: "TITLE_TOO_LONG", message: `Title zu lang (${titleLen} Zeichen)`, severity: "warning", element: "head > title" });

  const descLen = (page.description || "").length;
  if (descLen === 0) issues.push({ code: "DESC_MISSING", message: "Meta description fehlt", severity: "critical", element: 'meta[name="description"]' });
  else if (descLen < 120) issues.push({ code: "DESC_TOO_SHORT", message: `Meta description zu kurz (${descLen} Zeichen)`, severity: "warning", element: 'meta[name="description"]' });

  await prisma.page.update({ where: { id: page.id }, data: { issues: JSON.stringify(issues) } });
  await finalizeAudit(auditId, domain);
}

async function finalizeAudit(auditId: string, domain: string) {
  const pages = await prisma.page.findMany({ where: { auditId } });
  const pageScores = pages.map(p => p.score).filter((s): s is number => s !== null);
  const avgScore = pageScores.length > 0 ? Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length) : 0;
  const grade = scoreToGrade(avgScore);

  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "done", score: avgScore, grade, pagesFound: pages.length },
  });
}

function extractHeadings(html: string): HeadingStructure {
  const getText = (tag: string) => {
    const matches: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let match;
    while ((match = regex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text) matches.push(text);
    }
    return matches;
  };
  return { h1: getText("h1"), h2: getText("h2"), h3: getText("h3"), h4: getText("h4"), h5: getText("h5"), h6: getText("h6") };
}

function countWords(text: string): number {
  return text.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
}

function categorizeLinks(links: string[], sourceUrl: string, domain: string) {
  const categorized = { internal: [] as string[], external: [] as string[], nofollow: [] as string[] };
  for (const link of links) {
    try {
      const target = link.startsWith("http") ? link : `https://${domain}${link.startsWith("/") ? "" : "/"}${link}`;
      const parsed = new URL(target);
      if (parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)) categorized.internal.push(link);
      else categorized.external.push(link);
    } catch {
      categorized.internal.push(link);
    }
  }
  return categorized;
}
