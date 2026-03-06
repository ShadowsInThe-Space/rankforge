import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { firecrawl } from "@/lib/firecrawl";
import { getAuthUser } from "@/lib/auth";
import type { HeadingStructure } from "@/types/audit";

export async function POST(request: NextRequest) {
  // Require authentication
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Audit erstellen mit userId
  const audit = await prisma.audit.create({
    data: {
      url: normalizedUrl,
      domain,
      status: "mapping",
      keywords,
      userId: user.userId,
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

export async function GET(request: NextRequest) {
  // Require authentication
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return only user's audits
  const audits = await prisma.audit.findMany({
    where: { userId: user.userId },
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
    limit: 10000, // Max pages to crawl (virtually unlimited)
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

  // Phase 4.1: Headless Browser Capture - Get full HTML including <head>
  // Firecrawl only captures <body>, so we need Playwright for technical SEO
  const { captureMultiplePages, closeBrowser } = await import("@/lib/headless-browser");

  // Get unique URLs to capture
  const pageUrls = crawlStatus.data
    .map(p => p.metadata?.sourceURL)
    .filter((url): url is string => !!url);

  console.log(`Capturing full HTML for ${pageUrls.length} pages using headless browser...`);
  const fullHtmlData = await captureMultiplePages(pageUrls, 3);
  console.log(`Captured full HTML for ${fullHtmlData.size} pages`);

  // Close browser after capture
  await closeBrowser();

  for (const page of crawlStatus.data) {
    const pageUrl = page.metadata?.sourceURL || "";
    if (!pageUrl) continue;

    // Use full HTML from headless browser if available, otherwise fallback to Firecrawl
    const headlessData = fullHtmlData.get(pageUrl);
    const fullHtml = (headlessData?.html) || (page.html) || "";

    // Prefer title/description/canonical from headless browser (more accurate)
    const headlessTitle = headlessData?.title;
    const headlessDesc = headlessData?.description;
    const title = (headlessTitle !== undefined && headlessTitle !== null) ? headlessTitle : (page.metadata?.title ?? null);
    const description = (headlessDesc !== undefined && headlessDesc !== null) ? headlessDesc : (page.metadata?.description ?? null);

    const headings = extractHeadings(fullHtml);
    const wordCount = countWords(page.markdown || "");

    await prisma.page.create({
      data: {
        auditId,
        url: pageUrl,
        statusCode: page.metadata?.statusCode ?? null,
        title,
        description,
        h1: headings.h1[0] ?? null,
        wordCount,
        markdown: page.markdown ?? null,
        html: fullHtml,
        links: JSON.parse(JSON.stringify(categorizeLinks(page.links || [], pageUrl, domain))),
        headings: JSON.parse(JSON.stringify(headings)),
        contentType: null,
      },
    });
  }

  // Phase 4.5: Enterprise Analysis - Date Consistency (Google Leak 2024)
  const { analyzeDateConsistency } = await import("@/lib/analyzers/date-consistency");
  
  const dateAnalysis = await Promise.all(
    crawlStatus.data.map(async (page) => {
      const pageUrl = page.metadata?.sourceURL || "";
      if (!pageUrl) return null;
      
      try {
        const report = await analyzeDateConsistency(page);
        return {
          url: pageUrl,
          report,
        };
      } catch (e) {
        console.error(`Date analysis failed for ${pageUrl}:`, e);
        return null;
      }
    })
  );

  const dateAnalysisFiltered = dateAnalysis.filter((d) => d !== null);

  // Phase 4.6: Enterprise Analysis - Index Tier Prediction (Google Leak 2024)
  const { predictIndexTier } = await import("@/lib/analyzers/index-tier");
  
  // Calculate internal backlink counts
  const internalBacklinks = new Map<string, number>();
  for (const page of crawlStatus.data) {
    const pageUrl = page.metadata?.sourceURL || "";
    if (!pageUrl) continue;
    
    const links = categorizeLinks(page.links || [], pageUrl, domain);
    for (const link of links.internal) {
      internalBacklinks.set(link, (internalBacklinks.get(link) || 0) + 1);
    }
  }
  
  const tierAnalysis = await Promise.all(
    crawlStatus.data.map(async (page) => {
      const pageUrl = page.metadata?.sourceURL || "";
      if (!pageUrl) return null;
      
      try {
        const headings = extractHeadings(page.html || "");
        const wordCount = countWords(page.markdown || "");
        const links = categorizeLinks(page.links || [], pageUrl, domain);
        
        // Check if this page has perfect date consistency (for bonus)
        const dateReport = dateAnalysisFiltered.find((d) => d?.url === pageUrl);
        const dateConsistencyBonus = dateReport?.report.score === 100 ? 5 : 0;
        
        const prediction = await predictIndexTier(
          {
            url: pageUrl,
            html: page.html,
            markdown: page.markdown,
            metadata: page.metadata,
            wordCount,
            headings,
            links,
          },
          {
            internalBacklinks: internalBacklinks.get(pageUrl) || 0,
            dateConsistencyBonus,
          }
        );
        
        return {
          url: pageUrl,
          prediction,
        };
      } catch (e) {
        console.error(`Index tier prediction failed for ${pageUrl}:`, e);
        return null;
      }
    })
  );
  
  const tierAnalysisFiltered = tierAnalysis.filter((t) => t !== null);

  // Phase 4.7: Enterprise Analysis - NavBoost Simulator (Google Leak 2024)
  const { analyzeNavBoost } = await import("@/lib/analyzers/navboost");
  
  const navboostReport = analyzeNavBoost(crawlStatus.data.map(page => ({
    url: page.metadata?.sourceURL || "",
    markdown: page.markdown || "",
    html: page.html || "",
    metadata: page.metadata,
    links: page.links || []
  })));

  // Phase 4.8: Enterprise Analysis - Link Tier Analyzer (Google Leak 2024)
  const { analyzeLinkTiers } = await import("@/lib/analyzers/link-tier");
  
  const linkTierReport = analyzeLinkTiers(
    crawlStatus.data.map(page => ({
      url: page.metadata?.sourceURL || "",
      links: {
        internal: (page.links || []).filter(link => {
          try {
            const linkUrl = new URL(link);
            return linkUrl.hostname === domain || linkUrl.hostname.endsWith(`.${domain}`);
          } catch {
            return false;
          }
        }),
        external: (page.links || []).filter(link => {
          try {
            const linkUrl = new URL(link);
            return !(linkUrl.hostname === domain || linkUrl.hostname.endsWith(`.${domain}`));
          } catch {
            return false;
          }
        })
      }
    })),
    tierAnalysisFiltered
  );

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

  // Helper: Safe JSON serialization (handles Dates + Maps)
  const safeSerialize = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }));
  };

  // Phase 7: Ergebnisse in DB speichern
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "done",
      score: score.overall,
      technical: safeSerialize(technicalResult),
      content: safeSerialize(contentResult),
      links: safeSerialize(linkResult),
      summary: safeSerialize(summary),
      dateConsistency: safeSerialize(dateAnalysisFiltered),
      indexTier: safeSerialize(tierAnalysisFiltered),
      navboostScore: navboostReport.overallScore,
      navboostAnalysis: safeSerialize(navboostReport),
      linkTierScore: linkTierReport.overallScore,
      linkTierAnalysis: safeSerialize(linkTierReport),
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
        issues: safeSerialize(pageIssues),
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
