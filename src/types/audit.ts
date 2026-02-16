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
  | "indexing"
  | "og";

export interface SeoIssue {
  type: IssueCategory;
  severity: IssueSeverity;
  page: string;
  message: string;
  fix: string;
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

export interface ScoreBreakdown {
  overall: number; // 0-100
  technical: number;
  content: number;
  links: number;
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
  status: "scraping" | "completed" | "failed";
  total: number;
  completed: number;
  data: FirecrawlPageData[];
}

export interface FirecrawlPageData {
  markdown?: string;
  html?: string;
  links?: string[];
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
