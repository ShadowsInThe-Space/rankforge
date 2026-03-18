import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { firecrawl } from "@/lib/firecrawl";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { hasCredits, consumeCredit, refundCredit } from "@/lib/credits";
import type { HeadingStructure } from "@/types/audit";
import { calculateScore, scoreToGrade } from "@/lib/analyzers/scoring";
import { fetchCoreWebVitals } from "@/lib/analyzers/pagespeed";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";

// ─── Timeout Constants ──────────────────────────────────────
const CRAWL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max for 200 pages
const PAGE_CAPTURE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes per page for headless browser

// Global cancellation map
const cancelledAudits = new Set<string>();

// Validate URL to prevent SSRF
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    // Block private/internal IPs
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

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authCheck = requireAuth(request);
  if (authCheck) return authCheck;

  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check credits
  const canAudit = await hasCredits(user.userId);
  if (!canAudit) {
    return NextResponse.json(
      {
        error: "Keine Credits mehr übrig",
        code: "UPGRADE_REQUIRED",
        upgradeUrl: "/upgrade",
      },
      { status: 402 }
    );
  }

  // Consume credit now (refund on error)
  await consumeCredit(user.userId);

  const body = await request.json();
  const { url, keywords = [] } = body as {
    url: string;
    keywords?: string[];
  };

  if (!url) {
    await refundCredit(user.userId);
    return NextResponse.json({ error: "URL ist erforderlich" }, { status: 400 });
  }

  // Validate URL to prevent SSRF
  if (!isValidUrl(url)) {
    await refundCredit(user.userId);
    return NextResponse.json({ error: "Ungültige oder nicht erlaubte URL" }, { status: 400 });
  }

  // Domain extrahieren
  let domain: string;
  try {
    domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    await refundCredit(user.userId);
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
  runAuditPipeline(audit.id, normalizedUrl, domain, keywords).catch(
    async (err) => {
      console.error("Audit pipeline error:", err);
      await prisma.audit.update({
        where: { id: audit.id },
        data: { status: "error", error: String(err) },
      });
      // Refund credit on failure
      await refundCredit(user.userId);
    }
  );

  return NextResponse.json({ id: audit.id, status: "mapping" });
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authCheck = requireAuth(request);
  if (authCheck) return authCheck;

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
      grade: true,
      pagesFound: true,
      createdAt: true,
    },
  });

  // Calculate progress percentage based on status
  const auditsWithProgress = audits.map((audit) => {
    let progress = 0;
    switch (audit.status) {
      case "pending":
        progress = 0;
        break;
      case "mapping":
        progress = 10;
        break;
      case "crawling":
        // Estimate progress based on pages found (assume max 100 pages)
        progress = 10 + Math.min(40, (audit.pagesFound / 50) * 40);
        break;
      case "analyzing":
        progress = 50 + 30; // 80%
        break;
      case "done":
        progress = 100;
        break;
      case "error":
        progress = 0;
        break;
      default:
        progress = 0;
    }
    return { ...audit, progress: Math.round(progress) };
  });

  return NextResponse.json(auditsWithProgress);
}

// ─── Cancel Audit Endpoint ─────────────────────────────────
export async function DELETE(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authCheck = requireAuth(request);
  if (authCheck) return authCheck;

  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const auditId = searchParams.get("id");

  if (!auditId) {
    return NextResponse.json({ error: "Audit ID erforderlich" }, { status: 400 });
  }

  // Verify audit belongs to user before cancelling
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { userId: true },
  });

  if (!audit || audit.userId !== user.userId) {
    return NextResponse.json({ error: "Audit nicht gefunden" }, { status: 404 });
  }

  // Mark as cancelled
  cancelledAudits.add(auditId);

  // Update audit status
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ success: true, message: "Audit cancelled" });
}

// Check if audit is cancelled
function isAuditCancelled(auditId: string): boolean {
  return cancelledAudits.has(auditId);
}

// ─── Audit Pipeline ────────────────────────────────────────

async function runAuditPipeline(
  auditId: string,
  url: string,
  domain: string,
  keywords: string[] = [],
) {
  // Check for cancellation at start
  if (isAuditCancelled(auditId)) {
    console.log(`Audit ${auditId} was cancelled before starting`);
    return;
  }

  // Phase 1: URL Discovery via /map (with timeout)
  let mapUrls: string[] = [];
  try {
    const mapPromise = firecrawl.map(url);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Map timeout after 60s")), 60000)
    );
    const mapResult = await Promise.race([mapPromise, timeoutPromise]);
    if (mapResult.success) {
      mapUrls = mapResult.links;
    }
  } catch (e) {
    console.warn("Map failed or timed out, continuing with crawl:", e);
  }

  // Phase 2: Full-Domain Crawl (with timeout)
  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "crawling" },
  });

  let crawlResult;
  let crawlStatus: import("@/types/audit").FirecrawlCrawlStatus | undefined;
  let crawlTimedOut = false;

  try {
    // Start crawl with timeout
    const crawlPromise = firecrawl.crawl(url, {
      limit: 200, // Max 200 pages per audit for comprehensive analysis
      scrapeOptions: {
        formats: ["markdown", "rawHtml", "links"],
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Crawl start timeout")), 30000)
    );

    crawlResult = await Promise.race([crawlPromise, timeoutPromise]);

    if (!crawlResult.success) {
      throw new Error("Crawl konnte nicht gestartet werden");
    }

    await prisma.audit.update({
      where: { id: auditId },
      data: { crawlJobId: crawlResult.id },
    });

    // Wait for crawl with overall timeout (3 minutes)
    crawlStatus = await firecrawl.waitForCrawl(
      crawlResult.id,
      async (status, elapsedMs) => {
        // Update progress: "Scanning X pages..."
        console.log(`[Crawl Progress] ${status.completed || 0} pages scanned (elapsed: ${Math.round(elapsedMs/1000)}s)`);
        
        // Update database with current progress
        await prisma.audit.update({
          where: { id: auditId },
          data: { pagesFound: status.completed || 0 },
        });
        
        // Log timeout warning
        if (elapsedMs > CRAWL_TIMEOUT_MS - 30000) { // Warn 30s before timeout
          console.warn(`[Crawl] Approaching timeout (${Math.round(elapsedMs/1000)}s elapsed)...`);
        }
      },
      5000, // poll every 5s
      CRAWL_TIMEOUT_MS // 3 minute timeout
    );

    // Check if crawl timed out
    if (crawlStatus.status === "timeout") {
      console.warn(`Crawl timed out, switching to homepage-only mode`);
      crawlTimedOut = true;
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (errorMessage.includes("timeout")) {
      console.warn("Crawl timed out, falling back to homepage-only audit");
      crawlTimedOut = true;
    } else {
      throw e;
    }
  }

  // Fallback: Homepage-only audit if crawl timed out
  if (crawlTimedOut) {
    console.log("Performing homepage-only audit due to timeout");
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "analyzing", pagesFound: 1 },
    });

    // Capture only the homepage with timeout
    const { captureFullPageHtml, closeBrowser } = await import("@/lib/headless-browser");
    
    let homepageData = null;
    try {
      const capturePromise = captureFullPageHtml(url);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Homepage capture timeout")), PAGE_CAPTURE_TIMEOUT_MS)
      );
      homepageData = await Promise.race([capturePromise, timeoutPromise]);
    } catch (e) {
      console.warn("Homepage capture failed:", e);
    }

    // Also try Firecrawl scrape as fallback
    let firecrawlData = null;
    try {
      const scrapePromise = firecrawl.scrape(url, {
        formats: ["markdown", "rawHtml", "links"],
      });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firecrawl scrape timeout")), 30000)
      );
      const result = await Promise.race([scrapePromise, timeoutPromise]);
      if (result.success) {
        firecrawlData = result.data;
      }
    } catch (e) {
      console.warn("Firecrawl scrape failed:", e);
    }

    await closeBrowser();

    // Use the better data available
    const html = homepageData?.html || firecrawlData?.rawHtml || firecrawlData?.html || "";
    const title = homepageData?.title || firecrawlData?.metadata?.title || null;
    const description = homepageData?.description || firecrawlData?.metadata?.description || null;
    const markdown = firecrawlData?.markdown || "";
    const links = firecrawlData?.links || [];

    const headings = extractHeadings(html);
    const wordCount = countWords(markdown);

    // Save homepage to database
    await prisma.page.create({
      data: {
        auditId,
        url: url,
        statusCode: 200,
        title,
        description,
        h1: headings.h1[0] ?? null,
        wordCount,
        markdown,
        html,
        links: JSON.parse(JSON.stringify(categorizeLinks(links, url, domain))),
        headings: JSON.parse(JSON.stringify(headings)),
        contentType: null,
      },
    });

    // Run simplified analysis on homepage only
    await runHomepageAnalysis(auditId, url, domain);
    return;
  }

  // Normal flow continues here...

  if (!crawlStatus || crawlStatus.status === "failed") {
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
  
  // Add timeout to headless browser capture (2 minutes max per page)
  let fullHtmlData: Map<string, { html?: string; title?: string; description?: string }> | undefined;
  try {
    const capturePromise = captureMultiplePages(pageUrls, 3);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Headless capture timeout after ${PAGE_CAPTURE_TIMEOUT_MS}ms`)), PAGE_CAPTURE_TIMEOUT_MS)
    );
    fullHtmlData = await Promise.race([capturePromise, timeoutPromise]) as Map<string, { html?: string; title?: string; description?: string }>;
  } catch (e) {
    console.warn("Headless browser capture timed out or failed:", e);
    fullHtmlData = new Map();
  }
  console.log(`Captured full HTML for ${fullHtmlData?.size ?? 0} pages`);

  // Close browser after capture
  await closeBrowser();

  for (const page of crawlStatus.data) {
    const pageUrl = page.metadata?.sourceURL || "";
    if (!pageUrl) continue;

    // Use priority: rawHtml (includes <head>) > headless browser > html
    // Firecrawl v2.x crawl returns rawHtml by default which includes meta tags
    const headlessData = fullHtmlData.get(pageUrl);
    const fullHtml = (headlessData?.html) || (page.rawHtml) || (page.html) || "";

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
  const { analyzeAdvancedSeo } = await import("@/lib/analyzers/advanced-seo");
  const { analyzeLinkGraph, analyzeExternalBacklinks } = await import("@/lib/analyzers/links");
  const { analyzeContent } = await import("@/lib/analyzers/content");
  const { calculateScore } = await import("@/lib/analyzers/scoring");
  const { generateRecommendations } = await import("@/lib/ai/recommendations");

  // Core Web Vitals are critical for SEO - Google uses them as ranking signals
  let coreWebVitalsResult = null;
  try {
    console.log("Fetching Core Web Vitals for:", url);
    const { fetchCoreWebVitals } = await import("@/lib/analyzers/pagespeed");
    coreWebVitalsResult = await fetchCoreWebVitals(url, process.env.GOOGLE_PAGESPEED_API_KEY);
    console.log("Core Web Vitals fetched:", coreWebVitalsResult.metrics);
  } catch (e) {
    console.warn("Failed to fetch Core Web Vitals:", e);
  }

  // Pass Core Web Vitals array to technical analyzer
  const cwvArray = coreWebVitalsResult ? [coreWebVitalsResult] : undefined;
  
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
      // Pass Core Web Vitals to technical analyzer for homepage only
      coreWebVitals: (p.url === url && coreWebVitalsResult) ? coreWebVitalsResult : undefined,
    })),
    cwvArray
  );

  // Advanced SEO Analysis - Comprehensive checks matching SEOptimer
  const primaryKeyword = keywords && keywords.length > 0 ? keywords[0] : "";
  const advancedSeoResult = analyzeAdvancedSeo(
    pages.map((p) => ({
      url: p.url,
      html: p.html,
      title: p.title,
      description: p.description,
      h1: p.h1,
      wordCount: p.wordCount,
      headings: p.headings as HeadingStructure | null,
    })),
    primaryKeyword
  );

  // GEO / AI Search Optimization Analysis (Generative Engine Optimization)
  const { analyzeGeo } = await import("@/lib/analyzers/geo-signals");
  const geoResult = analyzeGeo(
    pages.map((p) => ({
      url: p.url,
      html: p.html,
      wordCount: p.wordCount,
      headings: p.headings as HeadingStructure | null,
      links: p.links as { internal: string[]; external: string[] } | null,
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

  // Phase 5.5: External Backlink Analysis (NEW v2.1)
  // Analyze external links from HTML - anchor text, quality, etc.
  const externalBacklinksResult = analyzeExternalBacklinks(
    pages.map((p) => ({
      url: p.url,
      html: p.html || "",
      links: p.links as { internal: string[]; external: string[] } | null,
    }))
  );

  // Include external backlinks in the result
  linkResult.externalBacklinks = externalBacklinksResult;

  const score = calculateScore(
    technicalResult, 
    linkResult, 
    contentResult, 
    advancedSeoResult, 
    externalBacklinksResult,
    coreWebVitalsResult ? [coreWebVitalsResult] : undefined,
    geoResult
  );

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
  const safeSerialize = (obj: unknown) => {
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
      grade: scoreToGrade(score.overall),
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
      advancedSeo: safeSerialize(advancedSeoResult),
      geo: safeSerialize(geoResult),
      coreWebVitals: safeSerialize(coreWebVitalsResult),
    },
  });

  // Page-Issues und Scores aktualisieren
  for (const page of pages) {
    const pageIssues = technicalResult.issues.filter(
      (i) => i.page === page.url
    );
    // Also include advanced SEO issues
    const advancedPageIssues = advancedSeoResult.issues.filter(
      (i) => i.page === page.url
    );
    const allPageIssues = [...pageIssues, ...advancedPageIssues];
    const contentPage = contentResult.pages.find(
      (p) => p.url === page.url
    );

    await prisma.page.update({
      where: { id: page.id },
      data: {
        issues: safeSerialize(allPageIssues),
        contentType: contentPage?.contentType ?? null,
        score: allPageIssues.length === 0 ? 100 : Math.max(0, 100 - allPageIssues.length * 10),
      },
    });
  }

  // Phase 8: Save audit snapshot to history for comparison
  await saveAuditSnapshot(auditId, domain, score.overall, scoreToGrade(score.overall), {
    technical: technicalResult,
    content: contentResult,
    links: linkResult,
    summary,
    advancedSeo: advancedSeoResult,
    geo: geoResult,
    dateConsistency: dateAnalysisFiltered,
    indexTier: tierAnalysisFiltered,
    navboostScore: navboostReport.overallScore,
    navboostAnalysis: navboostReport,
    linkTierScore: linkTierReport.overallScore,
    linkTierAnalysis: linkTierReport,
  }, pages.length);
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

// ─── Save Audit Snapshot for History ───────────────────────

interface AuditSnapshotData {
  technical: ReturnType<typeof import("@/lib/analyzers/technical").analyzeTechnicalSeo>;
  content: ReturnType<typeof import("@/lib/analyzers/content").analyzeContent>;
  links: ReturnType<typeof import("@/lib/analyzers/links").analyzeLinkGraph>;
  summary: import("@/types/audit").AuditSummary;
  advancedSeo: ReturnType<typeof import("@/lib/analyzers/advanced-seo").analyzeAdvancedSeo>;
  geo: ReturnType<typeof import("@/lib/analyzers/geo-signals").analyzeGeo>;
  dateConsistency: Array<{ url: string; report: unknown }>;
  indexTier: Array<{ url: string; prediction: unknown }>;
  navboostScore: number;
  navboostAnalysis: unknown;
  linkTierScore: number;
  linkTierAnalysis: unknown;
}

async function saveAuditSnapshot(
  auditId: string,
  domain: string,
  score: number,
  grade: string,
  data: AuditSnapshotData,
  pagesFound: number
) {
  try {
    // Safe JSON serialization helper
    const safeSerialize = (obj: unknown) => {
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

    await prisma.auditHistory.create({
      data: {
        auditId,
        domain,
        score,
        grade,
        technical: safeSerialize(data.technical),
        content: safeSerialize(data.content),
        links: safeSerialize(data.links),
        summary: safeSerialize(data.summary),
        advancedSeo: safeSerialize(data.advancedSeo),
        geo: safeSerialize(data.geo),
        dateConsistency: safeSerialize(data.dateConsistency),
        indexTier: safeSerialize(data.indexTier),
        navboostScore: data.navboostScore,
        navboostAnalysis: safeSerialize(data.navboostAnalysis),
        linkTierScore: data.linkTierScore,
        linkTierAnalysis: safeSerialize(data.linkTierAnalysis),
        pagesFound,
      },
    });
    console.log(`Audit snapshot saved for ${domain} (score: ${score})`);
  } catch (error) {
    console.error("Failed to save audit snapshot:", error);
    // Don't fail the main audit if snapshot fails
  }
}

// ─── Homepage Analysis (Fallback Mode) ─────────────────────

async function runHomepageAnalysis(
  auditId: string,
  url: string,
  domain: string
) {
  // Run simplified analysis on just the homepage
  const pages = await prisma.page.findMany({ where: { auditId } });

  const { analyzeTechnicalSeo } = await import("@/lib/analyzers/technical");
  const { analyzeAdvancedSeo } = await import("@/lib/analyzers/advanced-seo");
  const { analyzeLinkGraph, analyzeExternalBacklinks } = await import("@/lib/analyzers/links");
  const { analyzeContent } = await import("@/lib/analyzers/content");
  const { calculateScore } = await import("@/lib/analyzers/scoring");
  const { generateRecommendations } = await import("@/lib/ai/recommendations");

  // Fetch Core Web Vitals for homepage
  let coreWebVitalsResult = null;
  try {
    console.log("Fetching Core Web Vitals (homepage mode):", url);
    coreWebVitalsResult = await fetchCoreWebVitals(url, process.env.GOOGLE_PAGESPEED_API_KEY);
    console.log("Core Web Vitals fetched:", coreWebVitalsResult.metrics);
  } catch (e) {
    console.warn("Failed to fetch Core Web Vitals:", e);
  }

  // Pass Core Web Vitals array to technical analyzer
  const cwvArray = coreWebVitalsResult ? [coreWebVitalsResult] : undefined;
  
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
      // Pass Core Web Vitals to technical analyzer for homepage only
      coreWebVitals: (p.url === url && coreWebVitalsResult) ? coreWebVitalsResult : undefined,
    })),
    cwvArray
  );

  const advancedSeoResult = analyzeAdvancedSeo(
    pages.map((p) => ({
      url: p.url,
      html: p.html,
      title: p.title,
      description: p.description,
      h1: p.h1,
      wordCount: p.wordCount,
      headings: p.headings as HeadingStructure | null,
    })),
    ""
  );

  // GEO / AI Search Optimization (Homepage mode)
  const { analyzeGeo: geoAnalyzer } = await import("@/lib/analyzers/geo-signals");
  const geoResult = geoAnalyzer(
    pages.map((p) => ({
      url: p.url,
      html: p.html,
      wordCount: p.wordCount,
      headings: p.headings as HeadingStructure | null,
      links: p.links as { internal: string[]; external: string[] } | null,
    }))
  );

  const linkResult = analyzeLinkGraph(
    pages.map((p) => ({
      url: p.url,
      links: p.links as { internal: string[]; external: string[] } | null,
    })),
    [],
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

  // External Backlink Analysis (Homepage mode)
  const externalBacklinksResult = analyzeExternalBacklinks(
    pages.map((p) => ({
      url: p.url,
      html: p.html || "",
      links: p.links as { internal: string[]; external: string[] } | null,
    }))
  );

  // Include external backlinks in the result
  linkResult.externalBacklinks = externalBacklinksResult;

  const score = calculateScore(
    technicalResult, 
    linkResult, 
    contentResult, 
    advancedSeoResult, 
    externalBacklinksResult,
    coreWebVitalsResult ? [coreWebVitalsResult] : undefined,
    geoResult
  );

  // Generate summary
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
      executiveSummary: `SEO-Audit für ${domain} abgeschlossen (Homepage nur). Score: ${score.overall}/100.`,
      scoreBreakdown: score,
      topActions: [],
      phasePlan: [],
    };
  }

  // Safe JSON serialization
  const safeSerialize = (obj: unknown) => {
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

  // Save results
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "done",
      score: score.overall,
      grade: scoreToGrade(score.overall),
      technical: safeSerialize(technicalResult),
      content: safeSerialize(contentResult),
      links: safeSerialize(linkResult),
      summary: safeSerialize(summary),
      advancedSeo: safeSerialize(advancedSeoResult),
      geo: safeSerialize(geoResult),
      coreWebVitals: safeSerialize(coreWebVitalsResult),
    },
  });

  // Update page scores
  for (const page of pages) {
    const pageIssues = technicalResult.issues.filter((i) => i.page === page.url);
    const advancedPageIssues = advancedSeoResult.issues.filter((i) => i.page === page.url);
    const allPageIssues = [...pageIssues, ...advancedPageIssues];

    await prisma.page.update({
      where: { id: page.id },
      data: {
        issues: safeSerialize(allPageIssues),
        score: allPageIssues.length === 0 ? 100 : Math.max(0, 100 - allPageIssues.length * 10),
      },
    });
  }

  // Save audit snapshot to history for comparison
  await saveAuditSnapshot(auditId, domain, score.overall, scoreToGrade(score.overall), {
    technical: technicalResult,
    content: contentResult,
    links: linkResult,
    summary,
    advancedSeo: advancedSeoResult,
    geo: geoResult,
    dateConsistency: [],
    indexTier: [],
    navboostScore: 0,
    navboostAnalysis: null,
    linkTierScore: 0,
    linkTierAnalysis: null,
  }, pages.length);
}
