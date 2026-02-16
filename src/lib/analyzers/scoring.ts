import type {
  TechnicalAnalysis,
  LinkGraphAnalysis,
  ContentAnalysis,
  ScoreBreakdown,
} from "@/types/audit";

// ─── Weight Configuration ────────────────────────────────

const WEIGHTS = {
  technical: 0.4,
  content: 0.35,
  links: 0.25,
} as const;

const ISSUE_PENALTIES: Record<string, number> = {
  P0: 20,
  P1: 10,
  P2: 5,
};

// ─── Technical Score (40%) ────────────────────────────────

function scoreTechnical(technical: TechnicalAnalysis): number {
  let score = 100;

  score -= technical.stats.p0Count * ISSUE_PENALTIES.P0;
  score -= technical.stats.p1Count * ISSUE_PENALTIES.P1;
  score -= technical.stats.p2Count * ISSUE_PENALTIES.P2;

  return Math.max(0, Math.min(100, score));
}

// ─── Content Score (35%) ──────────────────────────────────

const IDEAL_AVG_WORD_COUNT = 800;
const THIN_CONTENT_MAX_RATIO = 0.3;

function scoreContent(content: Omit<ContentAnalysis, "benchmarks">): number {
  let score = 100;

  // Thin content penalty: up to -40 points
  const totalPages = content.pages.length || 1;
  const thinRatio = content.thinContentPages.length / totalPages;
  score -= Math.min(40, Math.round(thinRatio * (40 / THIN_CONTENT_MAX_RATIO)));

  // Average word count penalty: up to -30 points
  if (content.avgWordCount < IDEAL_AVG_WORD_COUNT) {
    const wordCountRatio = content.avgWordCount / IDEAL_AVG_WORD_COUNT;
    score -= Math.round((1 - wordCountRatio) * 30);
  }

  // Heading quality: penalize pages missing h1 or having multiple h1s
  const pagesWithBadHeadings = content.pages.filter((p) => {
    return p.headings.h1.length === 0 || p.headings.h1.length > 1;
  });
  const headingIssueRatio = pagesWithBadHeadings.length / totalPages;
  score -= Math.round(headingIssueRatio * 30);

  return Math.max(0, Math.min(100, score));
}

// ─── Link Score (25%) ─────────────────────────────────────

function scoreLinks(links: LinkGraphAnalysis): number {
  let score = 100;

  const totalNodes = links.nodes.length || 1;

  // Orphan pages penalty: up to -35 points
  const orphanRatio = links.orphanPages.length / totalNodes;
  score -= Math.min(35, Math.round(orphanRatio * 35 * (1 / 0.2)));

  // Dead end pages penalty: up to -30 points
  const deadEndRatio = links.deadEndPages.length / totalNodes;
  score -= Math.min(30, Math.round(deadEndRatio * 30 * (1 / 0.3)));

  // Crawl depth penalty: -5 per depth level beyond 3
  if (links.maxCrawlDepth > 3) {
    score -= (links.maxCrawlDepth - 3) * 5;
  }

  // Sitemap coverage bonus/penalty
  if (links.sitemapCoverage < 0.8) {
    score -= Math.round((0.8 - links.sitemapCoverage) * 25);
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Main Score Calculator ────────────────────────────────

export function calculateScore(
  technical: TechnicalAnalysis,
  links: LinkGraphAnalysis,
  content: Omit<ContentAnalysis, "benchmarks">,
): ScoreBreakdown {
  const techScore = scoreTechnical(technical);
  const contentScore = scoreContent(content);
  const linkScore = scoreLinks(links);

  const overall = Math.round(
    techScore * WEIGHTS.technical +
    contentScore * WEIGHTS.content +
    linkScore * WEIGHTS.links,
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    technical: techScore,
    content: contentScore,
    links: linkScore,
  };
}
