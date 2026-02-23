// src/lib/analyzers/index-tier.ts
// Index Tier Predictor - Based on Google API Leak 2024
// Predicts which tier (Base/Zeppelin/Landfill) Google stores a page

import * as cheerio from "cheerio";

export enum IndexTier {
  BASE = "Base (Flash/RAM)",
  ZEPPELIN = "Zeppelin (SSD)",
  LANDFILL = "Landfill (HDD)",
}

export interface TierPrediction {
  url: string;
  tier: IndexTier;
  confidence: number; // 0-100

  overallScore: number; // 0-100

  factors: {
    freshness: {
      daysSinceUpdate: number | null;
      lastModified: Date | null;
      score: number; // 0-100
    };
    updateFrequency: {
      estimatedFrequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "never"
        | "unknown";
      updatesPerMonth: number | null;
      score: number;
    };
    backlinkQuality: {
      internalBacklinks: number;
      orphanPage: boolean;
      score: number;
    };
    pageSpeed: {
      lcp: number | null;
      inp: number | null;
      cls: number | null;
      estimatedScore: number;
      score: number;
    };
    userEngagement: {
      wordCount: number;
      hasMultimedia: boolean;
      headingDepth: number;
      linkDensity: number;
      score: number;
    };
  };

  recommendation: string;
}

interface PageData {
  url: string;
  html?: string;
  markdown?: string;
  metadata?: any;
  wordCount?: number;
  headings?: any;
  links?: { internal: string[]; external: string[] };
}

interface AnalysisOptions {
  sitemapLastmod?: string;
  internalBacklinks?: number;
  externalBacklinks?: Array<{ domain: string; authority: number }>;
  dateConsistencyBonus?: number; // 0-5 bonus points
}

/**
 * Calculate freshness score (0-100)
 * Based on days since last update
 */
function calculateFreshnessScore(
  lastModified: Date | null,
  sitemapLastmod?: string
): {
  daysSinceUpdate: number | null;
  lastModified: Date | null;
  score: number;
} {
  let date: Date | null = null;

  // Try Last-Modified header first
  if (lastModified) {
    date = lastModified;
  }
  // Fallback to sitemap
  else if (sitemapLastmod) {
    try {
      date = new Date(sitemapLastmod);
    } catch (e) {
      // Invalid date
    }
  }

  if (!date || isNaN(date.getTime())) {
    // No date info = assume moderate staleness
    return {
      daysSinceUpdate: null,
      lastModified: null,
      score: 40, // Moderate default
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let score: number;

  if (daysSince <= 7) score = 100; // Ultra fresh
  else if (daysSince <= 30) score = 80; // Fresh
  else if (daysSince <= 90) score = 60; // Moderate
  else if (daysSince <= 180) score = 40; // Stale
  else if (daysSince <= 365) score = 20; // Very stale
  else score = 0; // Ancient

  return {
    daysSinceUpdate: daysSince,
    lastModified: date,
    score,
  };
}

/**
 * Estimate update frequency score (0-100)
 * Since we don't have historical data, estimate from page type
 */
function calculateUpdateFrequencyScore(
  url: string,
  metadata?: any
): {
  estimatedFrequency:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "yearly"
    | "never"
    | "unknown";
  updatesPerMonth: number | null;
  score: number;
} {
  // Heuristics based on URL patterns
  const urlLower = url.toLowerCase();

  // Blog posts - moderate frequency
  if (
    urlLower.includes("/blog/") ||
    urlLower.includes("/artikel/") ||
    urlLower.includes("/news/")
  ) {
    return {
      estimatedFrequency: "monthly",
      updatesPerMonth: 1,
      score: 60,
    };
  }

  // Homepage - high frequency
  if (
    urlLower.endsWith("/") ||
    urlLower.match(/\/(index|home)(\.html?)?$/)
  ) {
    return {
      estimatedFrequency: "weekly",
      updatesPerMonth: 4,
      score: 80,
    };
  }

  // Product pages - moderate-high frequency
  if (
    urlLower.includes("/product/") ||
    urlLower.includes("/shop/") ||
    urlLower.includes("/strain/")
  ) {
    return {
      estimatedFrequency: "monthly",
      updatesPerMonth: 1,
      score: 60,
    };
  }

  // Static pages - low frequency
  if (
    urlLower.includes("/about") ||
    urlLower.includes("/contact") ||
    urlLower.includes("/imprint") ||
    urlLower.includes("/privacy")
  ) {
    return {
      estimatedFrequency: "yearly",
      updatesPerMonth: 0.08,
      score: 20,
    };
  }

  // Default - moderate
  return {
    estimatedFrequency: "unknown",
    updatesPerMonth: null,
    score: 50,
  };
}

/**
 * Calculate backlink quality score (0-100)
 */
function calculateBacklinkQualityScore(options?: {
  internalBacklinks?: number;
  externalBacklinks?: Array<{ domain: string; authority: number }>;
}): {
  internalBacklinks: number;
  orphanPage: boolean;
  score: number;
} {
  const internalLinks = options?.internalBacklinks ?? 0;
  const orphan = internalLinks === 0;

  let score: number;

  if (orphan) {
    score = 0; // Orphan pages = Landfill
  } else if (internalLinks >= 10) {
    score = 80; // Many internal links
  } else if (internalLinks >= 5) {
    score = 60; // Some internal links
  } else if (internalLinks >= 1) {
    score = 40; // Few internal links
  } else {
    score = 20; // Very few
  }

  // Bonus from external backlinks (if available)
  if (options?.externalBacklinks && options.externalBacklinks.length > 0) {
    const avgAuthority =
      options.externalBacklinks.reduce((sum, link) => sum + link.authority, 0) /
      options.externalBacklinks.length;

    if (avgAuthority >= 70) score = Math.min(100, score + 20);
    else if (avgAuthority >= 50) score = Math.min(100, score + 10);
  }

  return {
    internalBacklinks: internalLinks,
    orphanPage: orphan,
    score,
  };
}

/**
 * Calculate page speed score (0-100)
 * Based on Core Web Vitals (if available)
 */
function calculatePageSpeedScore(
  html?: string,
  metadata?: any
): {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  estimatedScore: number;
  score: number;
} {
  // In real implementation, would use Lighthouse API or PageSpeed Insights
  // For now, estimate from page size

  let estimatedScore = 50; // Default moderate

  if (html) {
    const sizeKB = html.length / 1024;

    if (sizeKB < 500) {
      estimatedScore = 80; // Small page = likely fast
    } else if (sizeKB < 1000) {
      estimatedScore = 60; // Medium page
    } else {
      estimatedScore = 40; // Large page = likely slow
    }

    // Check for optimizations
    const hasLazyLoading = html.includes('loading="lazy"');
    const hasAsyncScripts = html.includes("async");

    if (hasLazyLoading) estimatedScore = Math.min(100, estimatedScore + 10);
    if (hasAsyncScripts) estimatedScore = Math.min(100, estimatedScore + 10);
  }

  return {
    lcp: null, // Would be measured with real tools
    inp: null,
    cls: null,
    estimatedScore,
    score: estimatedScore,
  };
}

/**
 * Calculate user engagement score (0-100)
 * Based on content quality signals
 */
function calculateUserEngagementScore(
  wordCount?: number,
  html?: string,
  headings?: any,
  links?: { internal: string[]; external: string[] }
): {
  wordCount: number;
  hasMultimedia: boolean;
  headingDepth: number;
  linkDensity: number;
  score: number;
} {
  const words = wordCount ?? 0;
  let score = 0;

  // Base score from word count
  if (words >= 1500) score = 100; // Comprehensive
  else if (words >= 800) score = 80; // Good
  else if (words >= 400) score = 60; // Moderate
  else if (words >= 200) score = 30; // Thin
  else score = 0; // Very thin

  // Check for multimedia
  const hasImages = html?.includes("<img") ?? false;
  const hasVideos = html?.includes("<video") ?? false;
  const hasMultimedia = hasImages || hasVideos;

  if (hasMultimedia) {
    score = Math.min(100, score + 10);
  }

  // Check heading structure
  const headingDepth = headings
    ? Object.keys(headings).filter((key) => headings[key].length > 0).length
    : 0;

  if (headingDepth >= 3) {
    score = Math.min(100, score + 10); // Good structure
  }

  // Check link density
  let linkDensity = 0;
  if (words > 0 && links) {
    const totalLinks = links.internal.length + links.external.length;
    linkDensity = (totalLinks / words) * 100;

    // Reasonable link density (2-5%) is good
    if (linkDensity >= 2 && linkDensity <= 5) {
      score = Math.min(100, score + 10);
    }
  }

  return {
    wordCount: words,
    hasMultimedia,
    headingDepth,
    linkDensity,
    score,
  };
}

/**
 * Extract dates from various page sources
 */
function extractDatesFromPage(page: PageData, sitemapLastmod?: string): Date[] {
  const dates: Date[] = [];

  // 1. From metadata.lastModified
  if (page.metadata?.lastModified) {
    const lastMod = new Date(page.metadata.lastModified);
    if (!isNaN(lastMod.getTime())) {
      dates.push(lastMod);
    }
  }

  // 2. From sitemap lastmod
  if (sitemapLastmod) {
    const sitemapDate = new Date(sitemapLastmod);
    if (!isNaN(sitemapDate.getTime())) {
      dates.push(sitemapDate);
    }
  }

  // 3. From URL patterns (YYYY/MM/DD, YYYY-MM-DD)
  if (page.url) {
    const urlPatterns = [
      /\/(\d{4})\/(\d{2})\/(\d{2})\//,
      /\/(\d{4})-(\d{2})-(\d{2})/,
      /\/(\d{4})(\d{2})(\d{2})/,
    ];

    for (const pattern of urlPatterns) {
      const match = page.url.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = match[2] ? parseInt(match[2]) : 1;
        const day = match[3] ? parseInt(match[3]) : 1;

        if (year >= 1990 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const urlDate = new Date(year, month - 1, day);
          if (!isNaN(urlDate.getTime())) {
            dates.push(urlDate);
          }
          break; // Only use first match
        }
      }
    }
  }

  // 4. From structured data (JSON-LD)
  if (page.html) {
    const $ = cheerio.load(page.html);
    const jsonLdScripts = $('script[type="application/ld+json"]');

    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse($(script).html() || "{}");
        const items = Array.isArray(data["@graph"]) ? data["@graph"] : [data];

        for (const item of items) {
          if (["Article", "NewsArticle", "BlogPosting"].includes(item["@type"])) {
            const datePublished = item.datePublished || item.dateCreated;
            if (datePublished) {
              const sdDate = new Date(datePublished);
              if (!isNaN(sdDate.getTime())) {
                dates.push(sdDate);
              }
              break;
            }
          }
        }
      } catch (e) {
        // Invalid JSON
      }
    }
  }

  // 5. From OG meta tags
  if (page.html) {
    const $ = cheerio.load(page.html);
    const ogUpdatedTime = $('meta[property="og:updated_time"]');
    if (ogUpdatedTime.length > 0) {
      const content = ogUpdatedTime.attr("content");
      if (content) {
        const ogDate = new Date(content);
        if (!isNaN(ogDate.getTime())) {
          dates.push(ogDate);
        }
      }
    }
  }

  return dates;
}

/**
 * Calculate date consistency score (0-100)
 * Returns 100 only if all dates are consistent (all within 7 days)
 * Returns lower scores for inconsistent dates
 * Returns 50 for single date source (not perfect, but not broken either)
 */
function calculateDateConsistencyScore(dates: Date[]): number {
  if (dates.length <= 1) {
    return 50; // Single date source = not perfect, not broken
  }

  // Find the earliest and latest dates
  let minDate = dates[0];
  let maxDate = dates[0];

  for (const date of dates) {
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;
  }

  const diffMs = maxDate.getTime() - minDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Perfect consistency: all dates within 7 days
  if (diffDays <= 7) {
    return 100;
  }

  // Calculate score based on days difference
  let score = 100;
  if (diffDays > 7) score -= 15;
  if (diffDays > 30) score -= 30;
  if (diffDays > 90) score -= 50;

  return Math.max(0, score);
}

/**
 * Main analyzer function
 * Predicts which Index Tier (Base/Zeppelin/Landfill) Google stores the page
 */
export async function predictIndexTier(
  page: PageData,
  options?: AnalysisOptions
): Promise<TierPrediction> {
  const url = page.url;

  // Extract Last-Modified from metadata (if available)
  const lastModified = page.metadata?.lastModified
    ? new Date(page.metadata.lastModified)
    : null;

  // Calculate factor scores
  const freshness = calculateFreshnessScore(
    lastModified,
    options?.sitemapLastmod
  );

  const updateFrequency = calculateUpdateFrequencyScore(url, page.metadata);

  const backlinkQuality = calculateBacklinkQualityScore({
    internalBacklinks: options?.internalBacklinks,
    externalBacklinks: options?.externalBacklinks,
  });

  const pageSpeed = calculatePageSpeedScore(page.html, page.metadata);

  const userEngagement = calculateUserEngagementScore(
    page.wordCount,
    page.html,
    page.headings,
    page.links
  );

  // Calculate weighted overall score
  const overallScore =
    freshness.score * 0.3 +
    updateFrequency.score * 0.25 +
    backlinkQuality.score * 0.25 +
    pageSpeed.score * 0.1 +
    userEngagement.score * 0.1;

  // Internal backlinks bonus: +15 points per 5 backlinks
  const backlinkBonus = Math.floor((options?.internalBacklinks || 0) / 5) * 15;

  // Auto-calculate date consistency bonus if not provided
  let dateConsistencyBonus = options?.dateConsistencyBonus ?? 0;

  if (dateConsistencyBonus === 0) {
    // Only auto-calculate if no explicit bonus was provided
    const extractedDates = extractDatesFromPage(page, options?.sitemapLastmod);
    const dateConsistencyScore = calculateDateConsistencyScore(extractedDates);

    // Auto-add +5 bonus if perfect date consistency (score = 100)
    if (dateConsistencyScore === 100) {
      dateConsistencyBonus = 5;
    }
  }

  // Apply all bonuses
  const finalScore = Math.min(
    100,
    overallScore + backlinkBonus + dateConsistencyBonus
  );

  // Classify tier
  let tier: IndexTier;
  let confidence: number;

  if (finalScore >= 80) {
    tier = IndexTier.BASE;
    confidence = Math.min(100, 70 + (finalScore - 80) * 1.5); // 70-100%
  } else if (finalScore >= 50) {
    tier = IndexTier.ZEPPELIN;
    confidence = Math.min(100, 60 + (finalScore - 50)); // 60-90%
  } else {
    tier = IndexTier.LANDFILL;
    confidence = Math.min(100, 50 + (50 - finalScore)); // 50-100%
  }

  // Generate recommendation
  let recommendation: string;

  if (tier === IndexTier.BASE) {
    recommendation =
      "✅ Premium tier! This page is likely stored in Google's fastest storage (Flash/RAM). Links from this page have HIGHEST value. Maintain freshness and quality.";
  } else if (tier === IndexTier.ZEPPELIN) {
    recommendation =
      "👍 Mid-tier storage (SSD). Good rankings possible. To reach Base tier: update more frequently, improve page speed, or earn more quality backlinks.";
  } else {
    recommendation =
      "⚠️ Low-priority tier (HDD). This page may rank poorly and get crawled infrequently. Fix: update content, fix orphan status, improve engagement signals.";
  }

  return {
    url,
    tier,
    confidence: Math.round(confidence),
    overallScore: Math.round(finalScore),
    factors: {
      freshness,
      updateFrequency,
      backlinkQuality,
      pageSpeed,
      userEngagement,
    },
    recommendation,
  };
}
