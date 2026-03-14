import type {
  TechnicalAnalysis,
  SeoIssue,
  IssueSeverity,
  IssueCategory,
  HeadingStructure,
  CoreWebVitalsResult,
} from "@/types/audit";

// ─── Input Type ──────────────────────────────────────────

interface PageInput {
  url: string;
  statusCode: number | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  wordCount: number | null;
  markdown: string | null;
  html: string | null;
  links: unknown; // JSON { internal: string[], external: string[] }
  headings: unknown; // JSON HeadingStructure
  coreWebVitals?: CoreWebVitalsResult; // Optional Core Web Vitals data
}

// ─── Extended Input Type for Pages with Core Web Vitals ───

interface PageInputWithCWV extends PageInput {
  coreWebVitals: CoreWebVitalsResult;
}

// ─── Helpers ─────────────────────────────────────────────

function issue(
  type: IssueCategory,
  severity: IssueSeverity,
  page: string,
  message: string,
  fix: string,
): SeoIssue {
  return { type, severity, page, message, fix };
}

function simpleHash(text: string): string {
  let hash = 0;
  const normalized = text.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function parseCanonical(html: string): string | null {
  // More robust regex - handles various HTML formats
  const match = html.match(/<link[^>]*\s+rel\s*=\s*["']?canonical["']?[^>]*>/i);
  if (!match) return null;
  const hrefMatch = match[0].match(/href\s*=\s*["']([^"']+)["']/i);
  return hrefMatch ? hrefMatch[1] : null;
}

function hasNoindex(html: string): boolean {
  const metaRobots = html.match(
    /<meta[^>]+name\s*=\s*["']robots["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  );
  if (metaRobots) return metaRobots[1].toLowerCase().includes("noindex");

  const metaRobotsAlt = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']robots["']/i,
  );
  if (metaRobotsAlt) return metaRobotsAlt[1].toLowerCase().includes("noindex");

  return false;
}

function parseHeadings(headings: unknown): HeadingStructure | null {
  if (!headings || typeof headings !== "object") return null;
  const h = headings as Record<string, unknown>;
  return {
    h1: Array.isArray(h.h1) ? h.h1 : [],
    h2: Array.isArray(h.h2) ? h.h2 : [],
    h3: Array.isArray(h.h3) ? h.h3 : [],
    h4: Array.isArray(h.h4) ? h.h4 : [],
    h5: Array.isArray(h.h5) ? h.h5 : [],
    h6: Array.isArray(h.h6) ? h.h6 : [],
  };
}

function findImagesWithoutAlt(html: string): number {
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let count = 0;
  for (const tag of imgTags) {
    const hasAlt = /\salt\s*=\s*["'][^"']+["']/i.test(tag);
    if (!hasAlt) count++;
  }
  return count;
}

function findNofollowInternalLinks(html: string): number {
  const anchorTags = html.match(/<a[^>]*>/gi) || [];
  let count = 0;
  for (const tag of anchorTags) {
    const hasNofollow = /\brel\s*=\s*["'][^"']*nofollow[^"']*["']/i.test(tag);
    const isExternal =
      /\bhref\s*=\s*["']https?:\/\//i.test(tag) &&
      !/\bhref\s*=\s*["']https?:\/\/(www\.)?localhost/i.test(tag);
    if (hasNofollow && !isExternal) count++;
  }
  return count;
}

function hasOgTag(html: string, property: string): boolean {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]+content\\s*=\\s*["'][^"']+["']`,
    "i",
  );
  const patternAlt = new RegExp(
    `<meta[^>]+content\\s*=\\s*["'][^"']+["'][^>]+(?:property|name)\\s*=\\s*["']${property}["']`,
    "i",
  );
  return pattern.test(html) || patternAlt.test(html);
}

// ─── P0 Checks (Blocker) ────────────────────────────────

function checkDuplicateTitles(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const titleMap = new Map<string, string[]>();

  for (const page of pages) {
    if (!page.title) continue;
    const hash = simpleHash(page.title);
    const existing = titleMap.get(hash) || [];
    existing.push(page.url);
    titleMap.set(hash, existing);
  }

  for (const [, urls] of titleMap) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push(
          issue(
            "title",
            "P0",
            url,
            `Duplicate Title Tag found on ${urls.length} pages`,
            "Create unique, descriptive title tags for each page",
          ),
        );
      }
    }
  }
  return issues;
}

function checkDuplicateContent(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const reported = new Set<string>();

  for (let i = 0; i < pages.length; i++) {
    const a = pages[i];
    if (!a.markdown) continue;

    for (let j = i + 1; j < pages.length; j++) {
      const b = pages[j];
      if (!b.markdown) continue;

      const pairKey = `${a.url}|${b.url}`;
      if (reported.has(pairKey)) continue;

      const similarity = jaccardSimilarity(a.markdown, b.markdown);
      if (similarity > 0.9) {
        reported.add(pairKey);
        const pct = Math.round(similarity * 100);
        issues.push(
          issue(
            "content",
            "P0",
            a.url,
            `${pct}% content similarity with ${b.url}`,
            "Consolidate duplicate content or add canonical tags",
          ),
        );
        issues.push(
          issue(
            "content",
            "P0",
            b.url,
            `${pct}% content similarity with ${a.url}`,
            "Consolidate duplicate content or add canonical tags",
          ),
        );
      }
    }
  }
  return issues;
}

function checkCanonicals(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const canonicalMap = new Map<string, string[]>();

  for (const page of pages) {
    if (!page.html) {
      issues.push(
        issue(
          "canonical",
          "P0",
          page.url,
          "No HTML available to check canonical tag",
          "Ensure pages have a canonical tag pointing to their preferred URL",
        ),
      );
      continue;
    }

    const canonical = parseCanonical(page.html);

    // Firecrawl often doesn't return the <head> section - only <body>
    // Check if we actually have head content before flagging canonical issues
    const hasHeadContent = page.html && page.html.includes("<head>");

    if (!canonical && hasHeadContent) {
      // Only flag as missing if we have full HTML
      issues.push(
        issue(
          "canonical",
          "P0",
          page.url,
          "Missing canonical tag",
          'Add <link rel="canonical" href="..."> to the page head',
        ),
      );
    } else if (!canonical && !hasHeadContent) {
      // Can't verify - Firecrawl didn't capture head
      // Skip this check gracefully
    }

    if (canonical) {
      const existing = canonicalMap.get(canonical) || [];
      existing.push(page.url);
      canonicalMap.set(canonical, existing);
    }
  }

  for (const [canonical, urls] of canonicalMap) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push(
          issue(
            "canonical",
            "P0",
            url,
            `Duplicate canonical URL "${canonical}" shared by ${urls.length} pages`,
            "Ensure each page has a unique canonical or intentionally canonicalizes to the primary version",
          ),
        );
      }
    }
  }

  return issues;
}

function checkStatusCodes(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (page.statusCode === null) continue;
    if (page.statusCode >= 400 && page.statusCode < 500) {
      issues.push(
        issue(
          "status",
          "P0",
          page.url,
          `HTTP ${page.statusCode} Client Error`,
          "Fix or remove the URL; update internal links pointing to this page",
        ),
      );
    } else if (page.statusCode >= 500) {
      issues.push(
        issue(
          "status",
          "P0",
          page.url,
          `HTTP ${page.statusCode} Server Error`,
          "Investigate and fix the server-side error causing this response",
        ),
      );
    }
  }
  return issues;
}

function checkNoindex(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.html) continue;
    if (hasNoindex(page.html)) {
      issues.push(
        issue(
          "indexing",
          "P0",
          page.url,
          "Page has noindex directive",
          'Remove noindex from <meta name="robots"> if this page should be indexed',
        ),
      );
    }
  }
  return issues;
}

// ─── P1 Checks (Critical) ───────────────────────────────

function checkTitleLength(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.title) {
      issues.push(
        issue(
          "title",
          "P1",
          page.url,
          "Missing title tag",
          "Add a descriptive title tag between 30-60 characters",
        ),
      );
      continue;
    }
    const len = page.title.length;
    if (len < 30) {
      issues.push(
        issue(
          "title",
          "P1",
          page.url,
          `Title too short (${len} chars, minimum 30)`,
          "Expand the title to be more descriptive (30-60 characters)",
        ),
      );
    } else if (len > 60) {
      issues.push(
        issue(
          "title",
          "P1",
          page.url,
          `Title too long (${len} chars, maximum 60)`,
          "Shorten the title to 60 characters or fewer to avoid truncation in SERPs",
        ),
      );
    }
  }
  return issues;
}

function checkMetaDescription(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.description) {
      issues.push(
        issue(
          "meta",
          "P1",
          page.url,
          "Missing meta description",
          "Add a compelling meta description between 70-160 characters",
        ),
      );
    }
  }
  return issues;
}

function checkH1(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    const headings = parseHeadings(page.headings);
    if (!headings) {
      if (!page.h1) {
        issues.push(
          issue(
            "heading",
            "P1",
            page.url,
            "Missing H1 heading",
            "Add exactly one H1 heading that describes the page content",
          ),
        );
      }
      continue;
    }

    if (headings.h1.length === 0) {
      issues.push(
        issue(
          "heading",
          "P1",
          page.url,
          "Missing H1 heading",
          "Add exactly one H1 heading that describes the page content",
        ),
      );
    } else if (headings.h1.length > 1) {
      issues.push(
        issue(
          "heading",
          "P1",
          page.url,
          `Multiple H1 headings found (${headings.h1.length})`,
          "Use only one H1 per page; convert extras to H2 or lower",
        ),
      );
    }
  }
  return issues;
}

function checkOpenGraph(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.html) continue;
    const missingTags: string[] = [];
    if (!hasOgTag(page.html, "og:title")) missingTags.push("og:title");
    if (!hasOgTag(page.html, "og:description"))
      missingTags.push("og:description");

    if (missingTags.length > 0) {
      issues.push(
        issue(
          "og",
          "P1",
          page.url,
          `Missing Open Graph tags: ${missingTags.join(", ")}`,
          "Add the missing OG meta tags for better social media sharing",
        ),
      );
    }
  }
  return issues;
}

function checkThinContent(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    const words = page.wordCount ?? 0;
    if (words < 300) {
      issues.push(
        issue(
          "content",
          "P1",
          page.url,
          `Thin content (${words} words, minimum 300)`,
          "Expand the page content to at least 300 words with valuable information",
        ),
      );
    }
  }
  return issues;
}

// ─── P2 Checks (Medium) ─────────────────────────────────

function checkHeadingHierarchy(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    const headings = parseHeadings(page.headings);
    if (!headings) continue;

    const levels: number[] = [];
    const levelKeys = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
    for (let i = 0; i < levelKeys.length; i++) {
      const key = levelKeys[i];
      for (let j = 0; j < headings[key].length; j++) {
        levels.push(i + 1);
      }
    }

    // Check if H2 appears before H1 (need order info - use simple heuristic)
    if (headings.h2.length > 0 && headings.h1.length === 0) {
      issues.push(
        issue(
          "heading",
          "P2",
          page.url,
          "H2 present without H1 - heading hierarchy broken",
          "Add an H1 heading before using H2 headings",
        ),
      );
    }

    // Check for skipped levels
    const usedLevels = new Set(levels);
    if (usedLevels.size > 0) {
      const maxLevel = Math.max(...usedLevels);
      for (let i = 1; i < maxLevel; i++) {
        if (!usedLevels.has(i) && usedLevels.has(i + 1)) {
          issues.push(
            issue(
              "heading",
              "P2",
              page.url,
              `Skipped heading level: H${i} missing but H${i + 1} used`,
              `Add H${i} headings to maintain proper hierarchy`,
            ),
          );
          break;
        }
      }
    }
  }
  return issues;
}

function checkImageAltText(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.html) continue;
    const missingCount = findImagesWithoutAlt(page.html);
    if (missingCount > 0) {
      issues.push(
        issue(
          "images",
          "P2",
          page.url,
          `${missingCount} image(s) missing alt text`,
          "Add descriptive alt attributes to all images for accessibility and SEO",
        ),
      );
    }
  }
  return issues;
}

function checkInternalNofollow(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.html) continue;
    const count = findNofollowInternalLinks(page.html);
    if (count > 0) {
      issues.push(
        issue(
          "links",
          "P2",
          page.url,
          `${count} internal link(s) with nofollow`,
          "Remove nofollow from internal links to allow proper PageRank flow",
        ),
      );
    }
  }
  return issues;
}

function checkUrlLength(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (page.url.length > 200) {
      issues.push(
        issue(
          "links",
          "P2",
          page.url,
          `URL too long (${page.url.length} chars, maximum 200)`,
          "Shorten the URL to be more concise and under 200 characters",
        ),
      );
    }
  }
  return issues;
}

function checkDescriptionLength(pages: PageInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const page of pages) {
    if (!page.description) continue; // missing description is P1, handled elsewhere
    const len = page.description.length;
    if (len < 70) {
      issues.push(
        issue(
          "meta",
          "P2",
          page.url,
          `Meta description too short (${len} chars, minimum 70)`,
          "Expand the meta description to at least 70 characters",
        ),
      );
    } else if (len > 160) {
      issues.push(
        issue(
          "meta",
          "P2",
          page.url,
          `Meta description too long (${len} chars, maximum 160)`,
          "Shorten the meta description to 160 characters to avoid SERP truncation",
        ),
      );
    }
  }
  return issues;
}

// ─── Core Web Vitals Checks (P0/P1) ───────────────────────
// Based on Google's Core Web Vitals thresholds

function checkLCP(pages: PageInputWithCWV[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    const cwv = page.coreWebVitals?.metrics;
    if (!cwv || cwv.lcp === null) continue;
    
    // LCP thresholds: Good ≤2.5s, Needs Improvement ≤4.0s, Poor >4.0s
    if (cwv.lcpRating === "poor") {
      issues.push(
        issue(
          "core-web-vitals",
          "P0",
          page.url,
          `Poor LCP (${cwv.lcp.toFixed(2)}s) - Largest Contentful Paint too slow`,
          "Optimize LCP: improve server response time, use CDN, optimize images, preload hero image",
        ),
      );
    } else if (cwv.lcpRating === "needs-improvement") {
      issues.push(
        issue(
          "core-web-vitals",
          "P1",
          page.url,
          `LCP needs improvement (${cwv.lcp.toFixed(2)}s)`,
          "Improve LCP: enable text compression, optimize CSS delivery, reduce render-blocking resources",
        ),
      );
    }
  }
  return issues;
}

function checkFID(pages: PageInputWithCWV[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    const cwv = page.coreWebVitals?.metrics;
    if (!cwv || cwv.fid === null) continue;
    
    // FID thresholds: Good ≤100ms, Needs Improvement ≤300ms, Poor >300ms
    if (cwv.fidRating === "poor") {
      issues.push(
        issue(
          "core-web-vitals",
          "P0",
          page.url,
          `Poor FID (${cwv.fid}ms) - First Input Delay too high`,
          "Optimize FID: reduce JavaScript execution time, break up long tasks, defer non-critical JS",
        ),
      );
    } else if (cwv.fidRating === "needs-improvement") {
      issues.push(
        issue(
          "core-web-vitals",
          "P1",
          page.url,
          `FID needs improvement (${cwv.fid}ms)`,
          "Improve FID: minimize main thread work, reduce payload size, use code splitting",
        ),
      );
    }
  }
  return issues;
}

function checkCLS(pages: PageInputWithCWV[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  
  for (const page of pages) {
    const cwv = page.coreWebVitals?.metrics;
    if (!cwv || cwv.cls === null) continue;
    
    // CLS thresholds: Good ≤0.1, Needs Improvement ≤0.25, Poor >0.25
    if (cwv.clsRating === "poor") {
      issues.push(
        issue(
          "core-web-vitals",
          "P0",
          page.url,
          `Poor CLS (${cwv.cls.toFixed(3)}) - Cumulative Layout Shift too high`,
          "Fix CLS: set explicit width/height for images and embeds, reserve space for ads, avoid dynamic content injection",
        ),
      );
    } else if (cwv.clsRating === "needs-improvement") {
      issues.push(
        issue(
          "core-web-vitals",
          "P1",
          page.url,
          `CLS needs improvement (${cwv.cls.toFixed(3)})`,
          "Improve CLS: add size attributes to media, use font-display: swap, pre-load fonts",
        ),
      );
    }
  }
  return issues;
}

// ─── Main Analyzer ───────────────────────────────────────

export function analyzeTechnicalSeo(
  pages: PageInput[], 
  coreWebVitals?: CoreWebVitalsResult[]
): TechnicalAnalysis {
  const allIssues: SeoIssue[] = [
    // P0 Checks
    ...checkDuplicateTitles(pages),
    ...checkDuplicateContent(pages),
    ...checkCanonicals(pages),
    ...checkStatusCodes(pages),
    ...checkNoindex(pages),
    // P1 Checks
    ...checkTitleLength(pages),
    ...checkMetaDescription(pages),
    ...checkH1(pages),
    ...checkOpenGraph(pages),
    ...checkThinContent(pages),
    // P2 Checks
    ...checkHeadingHierarchy(pages),
    ...checkImageAltText(pages),
    ...checkInternalNofollow(pages),
    ...checkUrlLength(pages),
    ...checkDescriptionLength(pages),
  ];

  // Add Core Web Vitals issues if data is available
  if (coreWebVitals && coreWebVitals.length > 0) {
    // Map pages with their Core Web Vitals data
    const pagesWithCWV: PageInputWithCWV[] = pages.map(page => {
      const matchedCwv = coreWebVitals.find((c: CoreWebVitalsResult) => {
        // Match by URL (handle trailing slashes)
        const pageUrl = page.url.replace(/\/$/, "");
        const cwvUrl = c.url.replace(/\/$/, "");
        return pageUrl === cwvUrl || pageUrl.includes(cwvUrl) || cwvUrl.includes(pageUrl);
      });
      return { ...page, coreWebVitals: matchedCwv };
    }).filter((p): p is PageInputWithCWV => !!p.coreWebVitals);
    
    if (pagesWithCWV.length > 0) {
      allIssues.push(...checkLCP(pagesWithCWV));
      allIssues.push(...checkFID(pagesWithCWV));
      allIssues.push(...checkCLS(pagesWithCWV));
    }
  }

  const pagesWithIssues = new Set(allIssues.map((i) => i.page)).size;

  return {
    issues: allIssues,
    stats: {
      totalPages: pages.length,
      pagesWithIssues,
      p0Count: allIssues.filter((i) => i.severity === "P0").length,
      p1Count: allIssues.filter((i) => i.severity === "P1").length,
      p2Count: allIssues.filter((i) => i.severity === "P2").length,
    },
  };
}

export type { PageInput };
