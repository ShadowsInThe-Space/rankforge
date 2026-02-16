import type {
  ContentMetrics,
  ContentType,
  ContentAnalysis,
  ContentBenchmark,
  HeadingStructure,
} from "@/types/audit";

// ─── Input Types ──────────────────────────────────────────

interface PageInput {
  url: string;
  wordCount: number | null;
  markdown: string | null;
  headings: HeadingStructure | null;
  links: { internal: string[]; external: string[] } | null;
}

// ─── Content Type Classification ──────────────────────────

const CONTENT_TYPE_PATTERNS: Array<{
  type: ContentType;
  test: (url: string) => boolean;
}> = [
  {
    type: "homepage",
    test: (url) => {
      try {
        const path = new URL(url).pathname;
        return path === "/" || path === "";
      } catch {
        return false;
      }
    },
  },
  {
    type: "blog",
    test: (url) =>
      /\/(blog|artikel|post|news|beitrag|article)\b/i.test(url),
  },
  {
    type: "product",
    test: (url) =>
      /\/(product|produkt|shop|item|ware)\b/i.test(url),
  },
  {
    type: "contact",
    test: (url) =>
      /\/(kontakt|contact|impressum)\b/i.test(url),
  },
  {
    type: "legal",
    test: (url) =>
      /\/(datenschutz|privacy|agb|terms|legal|disclaimer)\b/i.test(url),
  },
  {
    type: "about",
    test: (url) =>
      /\/(about|ueber-uns|ueber|team|unternehmen|company)\b/i.test(url),
  },
  {
    type: "category",
    test: (url) =>
      /\/(kategorie|category|categories|tag|tags)\b/i.test(url),
  },
];

function classifyContentType(url: string, headings: HeadingStructure | null): ContentType {
  for (const pattern of CONTENT_TYPE_PATTERNS) {
    if (pattern.test(url)) {
      return pattern.type;
    }
  }

  // Heading-based heuristics as fallback
  if (headings) {
    const h1Text = headings.h1.join(" ").toLowerCase();
    if (/willkommen|welcome|home/i.test(h1Text)) return "homepage";
    if (/blog|news|artikel/i.test(h1Text)) return "blog";
    if (/produkt|product|shop|kaufen|buy/i.test(h1Text)) return "product";
  }

  return "other";
}

// ─── Page Metrics Calculation ─────────────────────────────

function computePageMetrics(page: PageInput): ContentMetrics {
  const headings: HeadingStructure = page.headings ?? {
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  };

  const wordCount = page.wordCount ?? 0;
  const internalLinkCount = page.links?.internal.length ?? 0;
  const externalLinkCount = page.links?.external.length ?? 0;
  const totalLinks = internalLinkCount + externalLinkCount;

  return {
    url: page.url,
    wordCount,
    headings,
    internalLinkCount,
    externalLinkCount,
    linkRatio: totalLinks > 0 ? internalLinkCount / totalLinks : 0,
    contentType: classifyContentType(page.url, headings),
  };
}

// ─── Content Analysis (Local) ─────────────────────────────

const THIN_CONTENT_THRESHOLD = 300;

export function analyzeContent(
  pages: PageInput[],
): Omit<ContentAnalysis, "benchmarks"> {
  const metrics = pages.map(computePageMetrics);

  // Average word count
  const totalWords = metrics.reduce((sum, m) => sum + m.wordCount, 0);
  const avgWordCount = metrics.length > 0 ? Math.round(totalWords / metrics.length) : 0;

  // Thin content pages
  const thinContentPages = metrics
    .filter((m) => m.wordCount < THIN_CONTENT_THRESHOLD)
    .map((m) => m.url);

  // Content type distribution
  const contentTypeDistribution = {} as Record<ContentType, number>;
  const allTypes: ContentType[] = [
    "homepage", "blog", "product", "landing", "contact",
    "legal", "about", "category", "other",
  ];
  for (const type of allTypes) {
    contentTypeDistribution[type] = 0;
  }
  for (const m of metrics) {
    contentTypeDistribution[m.contentType]++;
  }

  return {
    pages: metrics,
    avgWordCount,
    thinContentPages,
    contentTypeDistribution,
  };
}

// ─── Content Benchmark (Async, needs search) ─────────────

function countWords(text: string | undefined | null): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function getHeadingDepth(markdown: string | undefined | null): number {
  if (!markdown) return 0;
  let maxDepth = 0;
  const headingRegex = /^(#{1,6})\s/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const depth = match[1].length;
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function getLinkDensity(markdown: string | undefined | null): number {
  if (!markdown) return 0;
  const words = countWords(markdown);
  if (words === 0) return 0;
  const links = (markdown.match(/\[([^\]]*)\]\([^)]*\)/g) || []).length;
  return links / words;
}

export async function benchmarkContent(
  keyword: string,
  userPageUrl: string,
  userPageMetrics: ContentMetrics,
  searchFn: (query: string) => Promise<Array<{ url: string; title: string; markdown?: string }>>,
): Promise<ContentBenchmark> {
  const results = await searchFn(keyword);

  // Take top 5 results, exclude user's own page
  const topResults = results
    .filter((r) => r.url !== userPageUrl)
    .slice(0, 5)
    .map((r) => ({
      url: r.url,
      title: r.title,
      wordCount: countWords(r.markdown),
      headingDepth: getHeadingDepth(r.markdown),
      linkDensity: getLinkDensity(r.markdown),
    }));

  const avgWordCount =
    topResults.length > 0
      ? Math.round(topResults.reduce((s, r) => s + r.wordCount, 0) / topResults.length)
      : 0;
  const avgHeadingDepth =
    topResults.length > 0
      ? Math.round((topResults.reduce((s, r) => s + r.headingDepth, 0) / topResults.length) * 10) / 10
      : 0;
  const avgLinkDensity =
    topResults.length > 0
      ? Math.round((topResults.reduce((s, r) => s + r.linkDensity, 0) / topResults.length) * 1000) / 1000
      : 0;

  // Score user content against competitors (0-100)
  const headingEntries = Object.entries(userPageMetrics.headings) as Array<[string, string[]]>;
  const userHeadingDepth = Math.max(
    ...headingEntries
      .filter(([, arr]) => arr.length > 0)
      .map(([key]) => parseInt(key.replace("h", ""), 10)),
    0,
  );
  const userLinkDensity =
    userPageMetrics.wordCount > 0
      ? (userPageMetrics.internalLinkCount + userPageMetrics.externalLinkCount) / userPageMetrics.wordCount
      : 0;

  let score = 50; // Start neutral

  // Word count scoring (40% weight)
  if (avgWordCount > 0) {
    const wordRatio = userPageMetrics.wordCount / avgWordCount;
    score += Math.max(-20, Math.min(20, (wordRatio - 1) * 40));
  }

  // Heading depth scoring (30% weight)
  if (avgHeadingDepth > 0) {
    const headingRatio = userHeadingDepth / avgHeadingDepth;
    score += Math.max(-15, Math.min(15, (headingRatio - 1) * 30));
  }

  // Link density scoring (30% weight)
  if (avgLinkDensity > 0) {
    const linkRatio = userLinkDensity / avgLinkDensity;
    score += Math.max(-15, Math.min(15, (linkRatio - 1) * 30));
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  return {
    keyword,
    userPage: {
      url: userPageUrl,
      wordCount: userPageMetrics.wordCount,
      headingDepth: userHeadingDepth,
      linkDensity: userLinkDensity,
    },
    topResults,
    avgWordCount,
    avgHeadingDepth,
    avgLinkDensity,
    score,
  };
}
