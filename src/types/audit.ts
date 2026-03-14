// ─── SEO Issue Types ───────────────────────────────────────

export type IssueSeverity = "P0" | "P1" | "P2";

export type IssueCategory =
  | "title"
  | "meta"
  | "heading"
  | "content"
  | "canonical"
  | "status"
  | "links"
  | "images"
  | "security"
  | "performance"
  | "mobile"
  | "schema"
  | "twitter"
  | "indexing"
  | "og"
  | "core-web-vitals";

export interface SeoIssue {
  type: IssueCategory;
  severity: IssueSeverity;
  page: string;
  message: string;
  fix: string;
}

// ─── Core Web Vitals Types ────────────────────────────────

export interface CoreWebVitals {
  lcp: number | null; // Largest Contentful Paint in seconds
  fid: number | null; // First Input Delay in ms
  cls: number | null; // Cumulative Layout Shift score
  lcpRating: "good" | "needs-improvement" | "poor" | null;
  fidRating: "good" | "needs-improvement" | "poor" | null;
  clsRating: "good" | "needs-improvement" | "poor" | null;
  overallRating: "good" | "needs-improvement" | "poor";
}

export interface CoreWebVitalsResult {
  url: string;
  metrics: CoreWebVitals;
  analyzedAt: string;
}

// PageSpeed Insights API response types
export interface PageSpeedInsightsResponse {
  lighthouseResult: {
    audits: Record<string, {
      numericValue?: number;
      score?: number;
      displayValue?: string;
    }>;
    categories: {
      performance: {
        score: number;
      };
    };
  };
  loadingExperience: {
    metrics: Record<string, {
      percentile: number;
      category: "FAST" | "AVERAGE" | "SLOW";
    }>;
  };
}

// ─── Technical SEO Analysis ────────────────────────────────

export interface TechnicalAnalysis {
  issues: SeoIssue[];
  stats: {
    totalPages: number;
    pagesWithIssues: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
}

// ─── Link Graph Analysis ───────────────────────────────────

export interface LinkNode {
  url: string;
  internalIncoming: number;
  internalOutgoing: number;
  externalOutgoing: number;
  crawlDepth: number;
}

export interface LinkGraphAnalysis {
  nodes: LinkNode[];
  edges: Array<{ source: string; target: string }>;
  orphanPages: string[];
  deadEndPages: string[];
  avgInternalLinks: number;
  maxCrawlDepth: number;
  sitemapCoverage: number; // 0-1
  // Backlink Analysis v2.0
  externalBacklinks?: ExternalBacklinkAnalysis;
}

// ─── External Backlink Analysis ───────────────────────────

export interface ExternalBacklinkAnalysis {
  totalExternalLinks: number;
  uniqueDomains: number;
  pagesWithExternalLinks: number;
  avgExternalLinksPerPage: number;
  linkQuality: LinkQualityMetrics;
  anchorText: AnchorTextAnalysis;
  pages: ExternalBacklinkPage[];
}

export interface ExternalBacklinkPage {
  url: string;
  externalLinks: ExternalLink[];
  totalExternalLinks: number;
}

export interface ExternalLink {
  url: string;
  text: string; // Anchor text
  rel: string[]; // nofollow, sponsored, ugc, etc.
  isDoFollow: boolean;
}

export interface AnchorTextAnalysis {
  exactMatch: number;
  partialMatch: number;
  branded: number;
  naked: number;
  generic: number;
  image: number;
  totalAnchors: number;
  distribution: Record<string, number>;
}

export interface LinkQualityMetrics {
  doFollow: number;
  noFollow: number;
  sponsored: number;
  ugc: number;
  megaSites: number; // Wikipedia, YouTube, etc.
  socialMedia: number;
  news: number;
  eduGov: number;
}

// ─── Content Intelligence ──────────────────────────────────

export interface ContentMetrics {
  url: string;
  wordCount: number;
  headings: HeadingStructure;
  internalLinkCount: number;
  externalLinkCount: number;
  linkRatio: number; // internal / total
  contentType: ContentType;
  readabilityScore?: number;
}

export interface HeadingStructure {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

export type ContentType =
  | "homepage"
  | "blog"
  | "product"
  | "landing"
  | "contact"
  | "legal"
  | "about"
  | "category"
  | "other";

export interface ContentBenchmark {
  keyword: string;
  userPage: {
    url: string;
    wordCount: number;
    headingDepth: number;
    linkDensity: number;
  };
  topResults: Array<{
    url: string;
    title: string;
    wordCount: number;
    headingDepth: number;
    linkDensity: number;
  }>;
  avgWordCount: number;
  avgHeadingDepth: number;
  avgLinkDensity: number;
  score: number; // 0-100
}

export interface ContentAnalysis {
  pages: ContentMetrics[];
  benchmarks: ContentBenchmark[];
  avgWordCount: number;
  thinContentPages: string[];
  contentTypeDistribution: Record<ContentType, number>;
}

// ─── Score Breakdown ───────────────────────────────────────

export type ScoreGrade = "A" | "B" | "C" | "D" | "F";

export interface ScoreBreakdown {
  overall: number; // 0-100
  // New granular breakdown (v2.0)
  technical?: number;
  onPage?: number;
  contentQuality?: number;
  userSignals?: number;
  backlinks?: number;
  // Legacy support (v1.0)
  content?: number;
  links?: number;
}

// ─── AI Recommendations ───────────────────────────────────

export interface AiRecommendation {
  priority: IssueSeverity;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  category: IssueCategory;
}

export interface AuditSummary {
  executiveSummary: string;
  scoreBreakdown: ScoreBreakdown;
  topActions: AiRecommendation[];
  phasePlan: Array<{
    phase: string;
    title: string;
    actions: string[];
  }>;
}

// ─── Firecrawl API Types ───────────────────────────────────

export interface FirecrawlMapResult {
  success: boolean;
  links: string[];
}

export interface FirecrawlCrawlResult {
  success: boolean;
  id: string;
}

export interface FirecrawlCrawlStatus {
  status: "scraping" | "completed" | "failed" | "timeout";
  total: number;
  completed: number;
  data: FirecrawlPageData[];
  statusNotes?: string;
}

export interface FirecrawlPageData {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  metadata?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    statusCode?: number;
    sourceURL?: string;
    [key: string]: unknown;
  };
}

export interface FirecrawlSearchResult {
  success: boolean;
  data: Array<{
    url: string;
    title: string;
    description: string;
    markdown?: string;
  }>;
}

// ─── Audit Status ──────────────────────────────────────────

export type AuditStatus =
  | "pending"
  | "mapping"
  | "crawling"
  | "analyzing"
  | "done"
  | "error";
