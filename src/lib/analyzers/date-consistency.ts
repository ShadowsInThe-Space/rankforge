// src/lib/analyzers/date-consistency.ts
// Date Consistency Analyzer - Based on Google API Leak 2024
// Detects date conflicts that trigger Google penalties

import type { FirecrawlPageData } from "@/types/audit";
import * as cheerio from "cheerio";

export interface DateConsistencyReport {
  url: string;

  dates: {
    structuredData: {
      found: boolean;
      date: Date | null;
      schema: "Article" | "NewsArticle" | "BlogPosting" | null;
    };
    urlDate: {
      found: boolean;
      date: Date | null;
      pattern: string | null;
    };
    titleDate: {
      found: boolean;
      date: Date | null;
      text: string | null;
    };
    bylineDate: {
      found: boolean;
      date: Date | null;
      selector: string | null;
    };
    sitemapDate: {
      found: boolean;
      date: Date | null;
      lastmod: string | null;
    };
    ogDate: {
      found: boolean;
      date: Date | null;
      tag: string | null;
    };
  };

  conflicts: Array<{
    severity: "HIGH" | "MEDIUM" | "LOW";
    source1: string;
    date1: Date;
    source2: string;
    date2: Date;
    discrepancyDays: number;
  }>;

  score: number; // 0-100
  recommendation: string;
}

/**
 * Extract date from structured data (JSON-LD, Microdata)
 */
function extractStructuredDataDate(html: string): {
  found: boolean;
  date: Date | null;
  schema: "Article" | "NewsArticle" | "BlogPosting" | null;
} {
  const $ = cheerio.load(html);

  // Try JSON-LD first
  const jsonLdScripts = $('script[type="application/ld+json"]');

  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse($(script).html() || "{}");

      // Handle @graph arrays
      const items = Array.isArray(data["@graph"]) ? data["@graph"] : [data];

      for (const item of items) {
        const type = item["@type"];

        if (["Article", "NewsArticle", "BlogPosting"].includes(type)) {
          const datePublished = item.datePublished || item.dateCreated;

          if (datePublished) {
            return {
              found: true,
              date: new Date(datePublished),
              schema: type as "Article" | "NewsArticle" | "BlogPosting",
            };
          }
        }
      }
    } catch (e) {
      // Invalid JSON, continue
    }
  }

  // Try Microdata
  const articleMeta = $('meta[itemprop="datePublished"]');
  if (articleMeta.length > 0) {
    const content = articleMeta.attr("content");
    if (content) {
      return {
        found: true,
        date: new Date(content),
        schema: "Article",
      };
    }
  }

  return { found: false, date: null, schema: null };
}

/**
 * Extract date from URL patterns
 * Common patterns:
 * - /2024/02/21/title
 * - /blog/2024-02-21-title
 * - /articles/20240221/title
 */
function extractUrlDate(url: string): {
  found: boolean;
  date: Date | null;
  pattern: string | null;
} {
  const patterns = [
    // YYYY/MM/DD
    /\/(\d{4})\/(\d{2})\/(\d{2})\//,
    // YYYY-MM-DD
    /\/(\d{4})-(\d{2})-(\d{2})/,
    // YYYYMMDD
    /\/(\d{4})(\d{2})(\d{2})/,
    // YYYY/MM
    /\/(\d{4})\/(\d{2})\//,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      const month = match[2] ? parseInt(match[2]) : 1;
      const day = match[3] ? parseInt(match[3]) : 1;

      // Validate date
      if (
        year >= 1990 &&
        year <= 2030 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        return {
          found: true,
          date: new Date(year, month - 1, day),
          pattern: pattern.source,
        };
      }
    }
  }

  return { found: false, date: null, pattern: null };
}

/**
 * Extract date from page title
 */
function extractTitleDate(title: string): {
  found: boolean;
  date: Date | null;
  text: string | null;
} {
  const patterns = [
    // "February 21, 2024"
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    // "21 Feb 2024"
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
    // "2024-02-21"
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return {
            found: true,
            date,
            text: match[0],
          };
        }
      } catch (e) {
        // Invalid date, continue
      }
    }
  }

  return { found: false, date: null, text: null };
}

/**
 * Extract date from OG and meta tags
 * Checks for:
 * - og:updated_time
 * - article:published_time
 */
function extractOgDate(html: string): {
  found: boolean;
  date: Date | null;
  tag: string | null;
} {
  const $ = cheerio.load(html);

  // Prefer og:updated_time (more accurate for article freshness)
  const ogUpdatedTime = $('meta[property="og:updated_time"]');
  if (ogUpdatedTime.length > 0) {
    const content = ogUpdatedTime.attr("content");
    if (content) {
      try {
        const date = new Date(content);
        if (!isNaN(date.getTime())) {
          return { found: true, date, tag: "og:updated_time" };
        }
      } catch (e) {
        // Invalid date
      }
    }
  }

  // Fall back to article:published_time
  const articlePublishedTime = $('meta[property="article:published_time"]');
  if (articlePublishedTime.length > 0) {
    const content = articlePublishedTime.attr("content");
    if (content) {
      try {
        const date = new Date(content);
        if (!isNaN(date.getTime())) {
          return { found: true, date, tag: "article:published_time" };
        }
      } catch (e) {
        // Invalid date
      }
    }
  }

  return { found: false, date: null, tag: null };
}

/**
 * Extract byline date from common selectors
 */
function extractBylineDate(html: string): {
  found: boolean;
  date: Date | null;
  selector: string | null;
} {
  const $ = cheerio.load(html);

  const selectors = [
    "time[datetime]",
    ".publish-date",
    ".published-date",
    ".post-date",
    ".entry-date",
    '[class*="date"]',
  ];

  for (const selector of selectors) {
    const elements = $(selector);

    for (const el of elements) {
      const datetime = $(el).attr("datetime");
      const text = $(el).text().trim();

      // Try datetime attribute first
      if (datetime) {
        try {
          const date = new Date(datetime);
          if (!isNaN(date.getTime())) {
            return { found: true, date, selector };
          }
        } catch (e) {
          // Invalid
        }
      }

      // Try parsing text content
      if (text) {
        try {
          const date = new Date(text);
          if (!isNaN(date.getTime())) {
            return { found: true, date, selector };
          }
        } catch (e) {
          // Invalid
        }
      }
    }
  }

  return { found: false, date: null, selector: null };
}

/**
 * Main analyzer
 *
 * Detects date conflicts across:
 * - Structured data (JSON-LD, Microdata)
 * - URL patterns
 * - Page title
 * - Byline/publish date
 * - Sitemap lastmod
 *
 * Based on Google's leaked signals:
 * - bylineDate (explicit structured data)
 * - syntacticDate (URL extraction)
 * - semanticDate (content parsing)
 */
export async function analyzeDateConsistency(
  page: FirecrawlPageData,
  options?: {
    sitemapLastmod?: string;
  }
): Promise<DateConsistencyReport> {
  const url = page.metadata?.sourceURL || "";
  const html = page.html || "";
  const title = page.metadata?.title || "";

  // Extract dates from all sources
  const structuredData = extractStructuredDataDate(html);
  const urlDate = extractUrlDate(url);
  const titleDate = extractTitleDate(title);
  const bylineDate = extractBylineDate(html);
  const ogDate = extractOgDate(html);

  const sitemapDate = options?.sitemapLastmod
    ? {
        found: true,
        date: new Date(options.sitemapLastmod),
        lastmod: options.sitemapLastmod,
      }
    : { found: false, date: null, lastmod: null };

  // Detect conflicts
  const conflicts: DateConsistencyReport["conflicts"] = [];
  const sources = [
    { name: "structuredData", date: structuredData.date, priority: 1 },
    { name: "urlDate", date: urlDate.date, priority: 2 },
    { name: "ogDate", date: ogDate.date, priority: 2.5 },
    { name: "bylineDate", date: bylineDate.date, priority: 3 },
    { name: "titleDate", date: titleDate.date, priority: 4 },
    { name: "sitemapDate", date: sitemapDate.date, priority: 5 },
  ].filter((s) => s.date !== null) as Array<{
    name: string;
    date: Date;
    priority: number;
  }>;

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const source1 = sources[i];
      const source2 = sources[j];

      const diffMs = Math.abs(source1.date.getTime() - source2.date.getTime());
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Conflict if >7 days apart
      if (diffDays > 7) {
        let severity: "HIGH" | "MEDIUM" | "LOW" = "LOW";

        // URL vs. Structured Data = HIGH
        if (
          (source1.name === "urlDate" && source2.name === "structuredData") ||
          (source1.name === "structuredData" && source2.name === "urlDate")
        ) {
          severity = "HIGH";
        }
        // Byline vs. Structured Data = MEDIUM
        else if (
          (source1.name === "bylineDate" &&
            source2.name === "structuredData") ||
          (source1.name === "structuredData" && source2.name === "bylineDate")
        ) {
          severity = "MEDIUM";
        }
        // OG Date vs. Structured Data = MEDIUM
        else if (
          (source1.name === "ogDate" && source2.name === "structuredData") ||
          (source1.name === "structuredData" && source2.name === "ogDate")
        ) {
          severity = "MEDIUM";
        }

        conflicts.push({
          severity,
          source1: source1.name,
          date1: source1.date,
          source2: source2.name,
          date2: source2.date,
          discrepancyDays: diffDays,
        });
      }
    }
  }

  // Calculate score
  let score = 100;

  for (const conflict of conflicts) {
    if (conflict.severity === "HIGH") {
      score -= 30;
    } else if (conflict.severity === "MEDIUM") {
      score -= 15;
    } else {
      score -= 5;
    }
  }

  score = Math.max(0, score);

  // Generate recommendation
  let recommendation = "";

  if (conflicts.length === 0) {
    recommendation = "✅ Perfect date consistency! All sources match.";
  } else {
    const highConflicts = conflicts.filter((c) => c.severity === "HIGH");

    if (highConflicts.length > 0) {
      recommendation = `⚠️ Critical: ${highConflicts.length} high-priority conflict(s). Fix URL vs. structured data immediately.`;
    } else {
      recommendation = `⚡ ${conflicts.length} date inconsistency(ies) found. Align all sources to the same date.`;
    }
  }

  return {
    url,
    dates: {
      structuredData,
      urlDate,
      titleDate,
      bylineDate,
      sitemapDate,
      ogDate,
    },
    conflicts,
    score,
    recommendation,
  };
}
