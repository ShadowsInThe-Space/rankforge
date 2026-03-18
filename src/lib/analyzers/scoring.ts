/**
 * RankForge SEO Scoring System v2.0
 * 
 * Industry-aligned scoring based on:
 * - MOZ, Ahrefs, SEMrush, SEOptimer methodologies
 * - Google ranking factors research
 * - Standard SEO best practices
 * 
 * Grade Scale (matching industry standards):
 * - A: 90-100 (Excellent)
 * - B: 70-89 (Good)
 * - C: 50-69 (Average)
 * - D: 30-49 (Below Average)
 * - F: 0-29 (Poor)
 */

import type {
  TechnicalAnalysis,
  LinkGraphAnalysis,
  ContentAnalysis,
  ScoreBreakdown,
  ScoreGrade,
  ExternalBacklinkAnalysis,
  CoreWebVitalsResult,
} from "@/types/audit";
import type { GeoAnalysis } from "./geo-signals";
import type { AdvancedSeoAnalysis } from "./advanced-seo";
import { scoreExternalBacklinks } from "./links";

// ─── Weight Configuration ────────────────────────────────
// Based on industry correlation studies and ranking factors research
// Technical: 25% - Foundation of SEO
// On-Page: 25% - Content & structure optimization  
// Content Quality: 20% - Value & depth
// User Signals: 15% - Engagement metrics
// Backlinks/Authority: 15% - External validation

export const WEIGHTS = {
  technical: 0.22,
  onPage: 0.20,
  contentQuality: 0.18,
  userSignals: 0.12,
  backlinks: 0.10,
  geo: 0.18, // AI Search / GEO weight
} as const;

// ─── Issue Penalty Configuration ─────────────────────────
// Calibrated to match industry scoring (not overly harsh)
const ISSUE_PENALTIES: Record<string, number> = {
  P0: 12,   // Critical - calibrated to match industry standards (was 8)
  P1: 6,    // Major - calibrated to match industry standards (was 4)
  P2: 3,    // Minor - calibrated to match industry standards (was 2)
  P3: 1,    // Trivial - informational (AI search optimization hints)
};

// ─── Grade Helpers ────────────────────────────────────────

export function scoreToGrade(score: number): ScoreGrade {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function gradeDescription(grade: ScoreGrade): string {
  const descriptions: Record<ScoreGrade, string> = {
    A: "Excellent - Fully optimized for search engines",
    B: "Good - Well-optimized with minor improvements needed",
    C: "Average - Moderately optimized, room for improvement",
    D: "Below Average - Significant SEO issues present",
    F: "Poor - Critical issues require immediate attention",
  };
  return descriptions[grade];
}

// ─── Technical SEO Score (25%) ────────────────────────────
// Now includes Core Web Vitals scoring

function scoreTechnical(
  technical: TechnicalAnalysis, 
  coreWebVitals?: CoreWebVitalsResult[]
): number {
  let score = 100;
  
  // Penalty per issue type - NO CAPS for realistic scoring
  // Sites with many critical issues should score poorly
  const p0Penalty = technical.stats.p0Count * ISSUE_PENALTIES.P0;
  const p1Penalty = technical.stats.p1Count * ISSUE_PENALTIES.P1;
  const p2Penalty = technical.stats.p2Count * ISSUE_PENALTIES.P2;
  
  // Apply full penalties without caps
  score -= p0Penalty;
  score -= p1Penalty;
  score -= p2Penalty;
  
  // Core Web Vitals bonus/penalty
  if (coreWebVitals && coreWebVitals.length > 0) {
    const cwvMetrics = coreWebVitals.map(c => c.metrics);
    
    // Count pages with good/poor ratings
    let goodCWV = 0;
    let poorCWV = 0;
    
    for (const metrics of cwvMetrics) {
      if (metrics.overallRating === "good") {
        goodCWV++;
      } else if (metrics.overallRating === "poor") {
        poorCWV++;
      }
    }
    
    const totalWithCWV = cwvMetrics.length;
    const goodRatio = goodCWV / totalWithCWV;
    const poorRatio = poorCWV / totalWithCWV;
    
    // Bonus for good Core Web Vitals
    if (goodRatio >= 0.8) {
      score += Math.min(8, Math.round(goodRatio * 10));
    }
    
    // Penalty for poor Core Web Vitals
    if (poorRatio > 0.3) {
      score -= Math.round(poorRatio * 15);
    }
  }
  
  // Small bonus: Clean technical foundation (no P0 or P1 issues)
  if (technical.stats.p0Count === 0 && technical.stats.p1Count === 0) {
    score += Math.min(3, technical.stats.p2Count);
  }
  
  return Math.max(0, Math.min(100, score));
}

// ─── On-Page SEO Score (25%) ─────────────────────────────
// This is now a separate component from content quality

function scoreOnPage(technical: TechnicalAnalysis): number {
  let score = 100;
  
  // Count on-page specific issues from technical analysis
  const issues = technical.issues;
  
  // Title issues (critical for on-page)
  const titleIssues = issues.filter(i => i.type === "title").length;
  score -= titleIssues * 3; // -3 per title issue
  
  // Meta description issues
  const metaIssues = issues.filter(i => i.type === "meta").length;
  score -= metaIssues * 2; // -2 per meta issue
  
  // Heading structure issues
  const headingIssues = issues.filter(i => i.type === "heading").length;
  score -= headingIssues * 2; // -2 per heading issue
  
  // Canonical issues (important for on-page)
  const canonicalIssues = issues.filter(i => i.type === "canonical").length;
  score -= canonicalIssues * 3; // -3 per canonical issue
  
  // Open Graph issues (social SEO)
  const ogIssues = issues.filter(i => i.type === "og").length;
  score -= ogIssues * 1; // -1 per OG issue (less critical)
  
  // URL structure issues
  const urlIssues = issues.filter(i => i.type === "links" && i.message.includes("URL")).length;
  score -= urlIssues * 2;
  
  return Math.max(0, Math.min(100, score));
}

// ─── Content Quality Score (20%) ──────────────────────────

const IDEAL_AVG_WORD_COUNT = 800;
const THIN_CONTENT_THRESHOLD = 0.25; // 25% threshold

function scoreContentQuality(content: Omit<ContentAnalysis, "benchmarks">): number {
  let score = 100;
  
  const totalPages = content.pages.length || 1;
  
  // Thin content penalty (up to -25 points)
  const thinRatio = content.thinContentPages.length / totalPages;
  if (thinRatio > THIN_CONTENT_THRESHOLD) {
    const excessRatio = (thinRatio - THIN_CONTENT_THRESHOLD) / (1 - THIN_CONTENT_THRESHOLD);
    score -= Math.round(excessRatio * 25);
  }
  
  // Average word count assessment (up to -20 points)
  if (content.avgWordCount < IDEAL_AVG_WORD_COUNT) {
    const ratio = content.avgWordCount / IDEAL_AVG_WORD_COUNT;
    // Only penalize if significantly below ideal
    if (ratio < 0.75) {
      score -= Math.round((0.75 - ratio) * 80);
    }
  } else if (content.avgWordCount >= IDEAL_AVG_WORD_COUNT) {
    // Bonus for good content depth
    score += Math.min(10, Math.round((content.avgWordCount - IDEAL_AVG_WORD_COUNT) / 200));
  }
  
  // Heading quality (up to -15 points)
  const pagesWithBadHeadings = content.pages.filter((p) => {
    const h1Count = p.headings?.h1?.length ?? 0;
    return h1Count === 0 || h1Count > 1;
  });
  const headingIssueRatio = pagesWithBadHeadings.length / totalPages;
  score -= Math.round(headingIssueRatio * 15);
  
  // Content type distribution bonus (diverse content is good)
  const contentTypes = Object.keys(content.contentTypeDistribution).length;
  if (contentTypes >= 4) {
    score += 5; // Bonus for diverse content types
  }
  
  return Math.max(0, Math.min(100, score));
}

// ─── User Signals Score (15%) ─────────────────────────────
// Based on internal linking structure and engagement indicators

function scoreUserSignals(
  content: Omit<ContentAnalysis, "benchmarks">,
  links: LinkGraphAnalysis
): number {
  let score = 100;
  
  const totalPages = content.pages.length || 1;
  
  // Orphan pages penalty (up to -20 points)
  // Orphan pages have no internal links pointing to them
  const orphanRatio = links.orphanPages.length / totalPages;
  score -= Math.round(orphanRatio * 20);
  
  // Dead end pages penalty (up to -15 points)
  // Dead ends are pages with no outgoing links
  const deadEndRatio = links.deadEndPages.length / totalPages;
  score -= Math.round(deadEndRatio * 15);
  
  // Internal link distribution (up to -15 points)
  // Sites should have reasonable internal linking
  const avgLinks = links.avgInternalLinks;
  if (avgLinks < 1) {
    score -= Math.round((1 - avgLinks) * 15);
  } else if (avgLinks >= 3) {
    score += Math.min(10, Math.round(avgLinks * 2)); // Bonus for good internal linking
  }
  
  // Crawl depth penalty (up to -10 points)
  // Pages too deep may not get indexed
  if (links.maxCrawlDepth > 4) {
    score -= (links.maxCrawlDepth - 4) * 3;
  }
  
  // Sitemap coverage (up to -10 points)
  if (links.sitemapCoverage < 0.7) {
    score -= Math.round((0.7 - links.sitemapCoverage) * 30);
  } else if (links.sitemapCoverage >= 0.9) {
    score += 5; // Bonus for good sitemap coverage
  }
  
  return Math.max(0, Math.min(100, score));
}

// ─── Backlinks/Authority Score (15%) ──────────────────────
// Simplified scoring based on link graph health
// Note: Real backlink data would come from external APIs

function scoreBacklinks(links: LinkGraphAnalysis): number {
  let score = 100;
  
  const totalNodes = links.nodes.length || 1;
  
  // Link equity distribution (up to -25 points)
  // Check if link equity is distributed reasonably
  const linkedPages = totalNodes - links.orphanPages.length;
  const linkDistributionRatio = linkedPages / totalNodes;
  if (linkDistributionRatio < 0.5) {
    score -= Math.round((0.5 - linkDistributionRatio) * 50);
  } else if (linkDistributionRatio >= 0.8) {
    score += 5; // Bonus for good link distribution
  }
  
  // External link presence (small sites may not have external links)
  // This is informational - not heavily penalized
  const pagesWithExternalLinks = links.nodes.filter(n => n.externalOutgoing > 0).length;
  const externalRatio = pagesWithExternalLinks / totalNodes;
  
  // If > 30% of pages have external links, it's a signal of authority
  if (externalRatio > 0.3) {
    score += Math.min(10, Math.round(externalRatio * 20));
  }
  
  // Crawl efficiency penalty
  if (links.maxCrawlDepth > 5) {
    score -= (links.maxCrawlDepth - 5) * 3;
  }
  
  return Math.max(0, Math.min(100, score));
}

// ─── Main Score Calculator ────────────────────────────────

export function calculateScore(
  technical: TechnicalAnalysis,
  links: LinkGraphAnalysis,
  content: Omit<ContentAnalysis, "benchmarks">,
  advancedSeo?: AdvancedSeoAnalysis,
  externalBacklinks?: ExternalBacklinkAnalysis,
  coreWebVitals?: CoreWebVitalsResult[],
  geoAnalysis?: GeoAnalysis,
): ScoreBreakdown {
  // Calculate component scores
  const technicalScore = scoreTechnical(technical, coreWebVitals);
  const onPageScore = scoreOnPage(technical);
  const contentQualityScore = scoreContentQuality(content);
  const userSignalsScore = scoreUserSignals(content, links);
  const backlinksScore = scoreBacklinks(links);
  
  // External backlink analysis score (new v2.1)
  const externalBacklinkScore = externalBacklinks 
    ? scoreExternalBacklinks(externalBacklinks)
    : backlinksScore; // Fallback to internal backlinks score
  
  // Advanced SEO bonus (new checks not covered by technical analysis)
  let advancedBonus = 0;
  if (advancedSeo) {
    // Bonus for having advanced checks pass
    const advancedPages = advancedSeo.stats.totalPages;
    if (advancedPages > 0) {
      // Check for mobile-friendly, schema, social presence
      const mobileIssues = advancedSeo.issues.filter(i => i.type === "mobile").length;
      const schemaIssues = advancedSeo.issues.filter(i => i.type === "schema").length;
      const socialIssues = advancedSeo.issues.filter(i => i.type === "twitter").length;
      const perfIssues = advancedSeo.issues.filter(i => i.type === "performance").length;
      
      // If few issues in these categories, add bonus
      if (mobileIssues === 0) advancedBonus += 2;
      if (schemaIssues === 0) advancedBonus += 2;
      if (socialIssues === 0) advancedBonus += 2;
      if (perfIssues < advancedPages * 0.5) advancedBonus += 2;
    }
  }
  
  // GEO Score (AI Search Optimization)
  const geoScore = geoAnalysis?.geoScore ?? 50;
  
  // Apply weights and calculate overall
  // If external backlinks available, use them instead of internal-based backlinks score
  const finalBacklinksScore = externalBacklinks ? externalBacklinkScore : backlinksScore;
  
  const overall = Math.round(
    technicalScore * WEIGHTS.technical +
    onPageScore * WEIGHTS.onPage +
    contentQualityScore * WEIGHTS.contentQuality +
    userSignalsScore * WEIGHTS.userSignals +
    finalBacklinksScore * WEIGHTS.backlinks +
    geoScore * WEIGHTS.geo +
    advancedBonus
  );
  
  // Ensure within bounds
  const clampedOverall = Math.max(0, Math.min(100, overall));
  
  // Legacy field mapping for backward compatibility with UI
  const legacyContentScore = Math.round(onPageScore * 0.5 + contentQualityScore * 0.5);
  const legacyLinksScore = Math.round(userSignalsScore * 0.5 + finalBacklinksScore * 0.5);
  
  return {
    overall: clampedOverall,
    technical: technicalScore,
    onPage: onPageScore,
    contentQuality: contentQualityScore,
    userSignals: userSignalsScore,
    backlinks: finalBacklinksScore,
    geo: geoScore,
    // Legacy fields for backward compatibility
    content: legacyContentScore,
    links: legacyLinksScore,
  };
}

// ─── Legacy Support ───────────────────────────────────────
// Keep old interface working for backward compatibility

export function calculateScoreLegacy(
  technical: TechnicalAnalysis,
  links: LinkGraphAnalysis,
  content: Omit<ContentAnalysis, "benchmarks">,
): ScoreBreakdown {
  // Map new structure to old for compatibility
  const technicalScore = scoreTechnical(technical);
  const contentScore = Math.round(
    scoreOnPage(technical) * 0.5 + scoreContentQuality(content) * 0.5
  );
  const linkScore = Math.round(
    scoreUserSignals(content, links) * 0.5 + scoreBacklinks(links) * 0.5
  );
  
  const overall = Math.round(
    technicalScore * 0.4 +
    contentScore * 0.35 +
    linkScore * 0.25
  );
  
  return {
    overall: Math.max(0, Math.min(100, overall)),
    technical: technicalScore,
    content: contentScore,
    links: linkScore,
  };
}
