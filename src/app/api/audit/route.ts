import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { firecrawl } from "@/lib/firecrawl";
import type { HeadingStructure } from "@/types/audit";

export async function POST(request: Request) {
  const body = await request.json();
  const { url, keywords = [] } = body as {
    url: string;
    keywords?: string[];
  };

  if (!url) {
    return NextResponse.json({ error: "URL ist erforderlich" }, { status: 400 });
  }

  // Domain extrahieren
  let domain: string;
  try {
    domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });
  }

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  // Audit erstellen
  const audit = await prisma.audit.create({
    data: {
      url: normalizedUrl,
      domain,
      status: "mapping",
      keywords,
    },
  });

  // Pipeline async starten (nicht blockierend)
  runAuditPipeline(audit.id, normalizedUrl, domain).catch(
    async (err) => {
      console.error("Audit pipeline error:", err);
      await prisma.audit.update({
        where: { id: audit.id },
        data: { status: "error", error: String(err) },
      });
    }
  );

  return NextResponse.json({ id: audit.id, status: "mapping" });
}

export async function GET() {
  const audits = await prisma.audit.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      domain: true,
      status: true,
      score: true,
      pagesFound: true,
      createdAt: true,
    },
  });

  return NextResponse.json(audits);
}

// ─── Audit Pipeline ────────────────────────────────────────

async function runAuditPipeline(
  auditId: string,
  url: string,
  domain: string,
) {
  // Phase 1: URL Discovery via /map
  let mapUrls: string[] = [];
  try {
    const mapResult = await firecrawl.map(url);
    if (mapResult.success) {
      mapUrls = mapResult.links;
    }
  } catch (e) {
    console.warn("Map failed, continuing with crawl:", e);
  }

  // Phase 2: Full-Domain Crawl
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "crawling" },
  });

  const crawlResult = await firecrawl.crawl(url, {
    limit: 100,
    scrapeOptions: {
      formats: ["markdown", "html", "links"],
    },
  });

  if (!crawlResult.success) {
    throw new Error("Crawl konnte nicht gestartet werden");
  }

  await prisma.audit.update({
    where: { id: auditId },
    data: { crawlJobId: crawlResult.id },
  });

  // Phase 3: Auf Crawl warten
  const crawlStatus = await firecrawl.waitForCrawl(
    crawlResult.id,
    async (status) => {
      await prisma.audit.update({
        where: { id: auditId },
        data: { pagesFound: status.completed },
      });
    }
  );

  if (crawlStatus.status === "failed") {
    throw new Error("Crawl fehlgeschlagen");
  }

  // Phase 4: Seiten in DB schreiben
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "analyzing", pagesFound: crawlStatus.data.length },
  });

  for (const page of crawlStatus.data) {
    const pageUrl = page.metadata?.sourceURL || "";
    if (!pageUrl) continue;

    const headings = extractHeadings(page.html || "");
    const wordCount = countWords(page.markdown || "");

    await prisma.page.create({
      data: {
        auditId,
        url: pageUrl,
        statusCode: page.metadata?.statusCode ?? null,
        title: page.metadata?.title ?? null,
        description: page.metadata?.description ?? null,
        h1: headings.h1[0] ?? null,
        wordCount,
        markdown: page.markdown ?? null,
        html: page.html ?? null,
        links: JSON.parse(JSON.stringify(categorizeLinks(page.links || [], pageUrl, domain))),
        headings: JSON.parse(JSON.stringify(headings)),
        contentType: null,
      },
    });
  }

  // Phase 5: Analyse ausführen
  const pages = await prisma.page.findMany({ where: { auditId } });

  // Dynamic imports für Analyzer
  const { analyzeTechnicalSeo } = await import("@/lib/analyzers/technical");
  const { analyzeLinkGraph } = await import("@/lib/analyzers/links");
  const { analyzeContent } = await import("@/lib/analyzers/content");
  const { calculateScore } = await import("@/lib/analyzers/scoring");
  const { generateRecommendations } = await import("@/lib/ai/recommendations");

  const technicalResult = analyzeTechnicalSeo(
    pages.map((p) => ({
      url: p.url,
      statusCode: p.statusCode,
      title: p.title,
      description: p.description,
      h1: p.h1,
      wordCount: p.wordCount,
      markdown: p.markdown,
      html: p.html,
      links: p.links,
      headings: p.headings,
    }))
  );

  const linkResult = analyzeLinkGraph(
    pages.map((p) => ({
      url: p.url,
      links: p.links as { internal: string[]; external: string[] } | null,
    })),
    mapUrls,
    url
  );

  const contentResult = analyzeContent(
    pages.map((p) => ({
      url: p.url,
      wordCount: p.wordCount,
      markdown: p.markdown,
      headings: p.headings as HeadingStructure | null,
      links: p.links as { internal: string[]; external: string[] } | null,
    }))
  );

  const score = calculateScore(technicalResult, linkResult, contentResult);

  // Phase 6: AI Recommendations
  let summary;
  try {
    summary = await generateRecommendations({
      domain,
      score,
      technical: technicalResult,
      links: linkResult,
      content: contentResult,
    });
  } catch {
    summary = {
      executiveSummary: `SEO-Audit für ${domain} abgeschlossen. Score: ${score.overall}/100.`,
      scoreBreakdown: score,
      topActions: [],
      phasePlan: [],
    };
  }

  // Phase 7: Ergebnisse in DB speichern
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "done",
      score: score.overall,
      technical: JSON.parse(JSON.stringify(technicalResult)),
      content: JSON.parse(JSON.stringify(contentResult)),
      links: JSON.parse(JSON.stringify(linkResult)),
      summary: JSON.parse(JSON.stringify(summary)),
    },
  });

  // Page-Issues und Scores aktualisieren
  for (const page of pages) {
    const pageIssues = technicalResult.issues.filter(
      (i) => i.page === page.url
    );
    const contentPage = contentResult.pages.find(
      (p) => p.url === page.url
    );

    await prisma.page.update({
      where: { id: page.id },
      data: {
        issues: JSON.parse(JSON.stringify(pageIssues)),
        contentType: contentPage?.contentType ?? null,
        score: pageIssues.length === 0 ? 100 : Math.max(0, 100 - pageIssues.length * 10),
      },
    });
  }
}

// ─── Hilfsfunktionen ───────────────────────────────────────

function extractHeadings(html: string): HeadingStructure {
  const headings: HeadingStructure = {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
  };

  const regex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = `h${match[1]}` as keyof HeadingStructure;
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (text) headings[level].push(text);
  }

  return headings;
}

function countWords(markdown: string): number {
  if (!markdown) return 0;
  return markdown
    .replace(/[#*\[\]()_`~>|]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function categorizeLinks(
  links: string[],
  pageUrl: string,
  domain: string
): { internal: string[]; external: string[] } {
  const internal: string[] = [];
  const external: string[] = [];

  for (const link of links) {
    try {
      const linkUrl = new URL(link, pageUrl);
      if (linkUrl.hostname === domain || linkUrl.hostname.endsWith(`.${domain}`)) {
        internal.push(linkUrl.href);
      } else {
        external.push(linkUrl.href);
      }
    } catch {
      // Ungültige URL ignorieren
    }
  }

  return { internal, external };
}
