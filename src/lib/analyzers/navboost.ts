/**
 * Module A: NavBoost Simulator
 * 
 * Based on Google Algorithm Leak 2024 NavBoost features.
 * Simulates user engagement scoring to predict ranking potential.
 * 
 * Core NavBoost signals from leak:
 * - NavBoostCTR (click-through rate)
 * - GoodClicks (long dwell, no pogo-stick)
 * - BadClicks (quick bounce, pogo-stick)
 * - LastLongestClicks (final destination)
 * - DwellTime (time on page)
 */

import type { FirecrawlPage as FirecrawlPageData } from '../firecrawl';

// Extended type with url convenience field
export interface FirecrawlPage extends FirecrawlPageData {
  url: string;
}

export interface NavBoostAnalysis {
  overallScore: number;
  scoreBreakdown: {
    ctrPotential: number;
    engagementPotential: number;
    uxQuality: number;
    clickQuality: number;
    intentMatch: number;
  };
  signals: {
    estimatedCTR?: number;
    estimatedDwellTime: number;
    pogoStickRisk: 'low' | 'medium' | 'high';
    lastClickProbability: number;
  };
  gscData?: {
    actualCTR: number;
    impressions: number;
    avgPosition: number;
    clicks: number;
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    category: 'ctr' | 'engagement' | 'ux' | 'intent';
    message: string;
    impact: number;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
  }>;
  competitorBenchmark?: {
    avgCTRInPosition: number;
    outperforming: boolean;
    gap: number;
  };
}

export interface SiteNavBoostReport {
  overallScore: number;
  totalPages: number;
  distribution: {
    excellent: number;   // 90-100
    good: number;        // 70-89
    average: number;     // 50-69
    poor: number;        // 30-49
    critical: number;    // 0-29
  };
  topIssues: Array<{
    issue: string;
    affectedPages: number;
    avgImpact: number;
  }>;
  topRecommendations: Array<{
    recommendation: string;
    affectedPages: number;
    totalImpact: string;
  }>;
  pageAnalyses: Map<string, NavBoostAnalysis>;
}

/**
 * Analyze CTR potential based on title and meta description quality
 */
function analyzeCTRPotential(page: FirecrawlPage): {
  score: number;
  issues: NavBoostAnalysis['issues'];
  recommendations: NavBoostAnalysis['recommendations'];
} {
  const issues: NavBoostAnalysis['issues'] = [];
  const recommendations: NavBoostAnalysis['recommendations'] = [];
  
  const title = page.metadata?.title || '';
  const description = page.metadata?.description || '';
  
  // Title scoring
  let titleScore = 0;
  const titleLength = title.length;
  
  if (titleLength >= 50 && titleLength <= 60) {
    titleScore += 25;
  } else if (titleLength < 30) {
    issues.push({
      severity: 'warning',
      category: 'ctr',
      message: `Title too short (${titleLength} chars). Optimal: 50-60 chars.`,
      impact: -15
    });
    recommendations.push({
      priority: 'high',
      action: 'Extend title to 50-60 characters with compelling copy',
      expectedImpact: '+12-15 points to CTR potential'
    });
  } else if (titleLength > 60) {
    issues.push({
      severity: 'info',
      category: 'ctr',
      message: `Title too long (${titleLength} chars). May be truncated in SERPs.`,
      impact: -8
    });
    recommendations.push({
      priority: 'medium',
      action: 'Shorten title to 50-60 characters',
      expectedImpact: '+5-8 points to CTR potential'
    });
  }
  
  // Check for numbers (listicles perform well)
  if (/\d+/.test(title)) {
    titleScore += 15;
  } else {
    recommendations.push({
      priority: 'low',
      action: 'Consider adding numbers to title ("7 Ways...", "2024 Guide")',
      expectedImpact: '+8-12 points to CTR potential'
    });
  }
  
  // Emotional triggers (proven to increase CTR)
  const emotionalTriggers = ['amazing', 'proven', 'ultimate', 'essential', 'complete', 'best', 'top', 'secret', 'powerful'];
  if (emotionalTriggers.some(trigger => title.toLowerCase().includes(trigger))) {
    titleScore += 20;
  }
  
  // Keyword in first 5 words (front-loaded)
  const firstFiveWords = title.split(' ').slice(0, 5).join(' ').toLowerCase();
  const hasEarlyKeyword = firstFiveWords.length > 0; // Simplified check
  if (hasEarlyKeyword) {
    titleScore += 20;
  }
  
  // Year indicator (freshness signal)
  const currentYear = new Date().getFullYear();
  if (title.includes(String(currentYear))) {
    titleScore += 10;
  }
  
  // Brand name (trust signal)
  if (/\b[A-Z][a-z]+\b/.test(title)) {
    titleScore += 10;
  }
  
  // Meta description scoring
  let metaScore = 0;
  const metaLength = description.length;
  
  if (metaLength >= 140 && metaLength <= 160) {
    metaScore += 25;
  } else if (metaLength < 120) {
    issues.push({
      severity: 'warning',
      category: 'ctr',
      message: `Meta description too short (${metaLength} chars). Optimal: 140-160 chars.`,
      impact: -12
    });
    recommendations.push({
      priority: 'high',
      action: 'Expand meta description to 140-160 characters with value proposition',
      expectedImpact: '+10-15 points to CTR potential'
    });
  } else if (metaLength > 160) {
    issues.push({
      severity: 'info',
      category: 'ctr',
      message: `Meta description too long (${metaLength} chars). Will be truncated.`,
      impact: -8
    });
  }
  
  // Call-to-action detection
  const ctaWords = ['learn', 'discover', 'find out', 'get', 'download', 'read', 'explore'];
  if (ctaWords.some(cta => description.toLowerCase().includes(cta))) {
    metaScore += 20;
  } else {
    recommendations.push({
      priority: 'medium',
      action: 'Add call-to-action to meta description ("Learn how...", "Discover...")',
      expectedImpact: '+8-12 points to CTR potential'
    });
  }
  
  // Uniqueness check (no generic meta)
  const genericPhrases = ['welcome to', 'home page', 'official site'];
  const isUnique = !genericPhrases.some(phrase => description.toLowerCase().includes(phrase));
  if (isUnique) {
    metaScore += 30;
  } else {
    issues.push({
      severity: 'critical',
      category: 'ctr',
      message: 'Generic meta description detected. Write unique, specific copy.',
      impact: -20
    });
  }
  
  // Keyword stuffing check
  const words = description.toLowerCase().split(/\s+/);
  const wordCounts = words.reduce((acc: Record<string, number>, word: string) => {
    if (word.length > 3) {
      acc[word] = (acc[word] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const hasStuffing = Object.values(wordCounts).some((count: number) => count > 3);
  if (!hasStuffing) {
    metaScore += 10;
  } else {
    issues.push({
      severity: 'warning',
      category: 'ctr',
      message: 'Keyword stuffing detected in meta description',
      impact: -10
    });
  }
  
  const ctrPotential = Math.round((titleScore + metaScore) / 2);
  
  return { score: Math.min(100, ctrPotential), issues, recommendations };
}

/**
 * Analyze content engagement potential
 */
function analyzeEngagementPotential(page: FirecrawlPage): {
  score: number;
  issues: NavBoostAnalysis['issues'];
  recommendations: NavBoostAnalysis['recommendations'];
} {
  const issues: NavBoostAnalysis['issues'] = [];
  const recommendations: NavBoostAnalysis['recommendations'] = [];
  
  let score = 0;
  
  // Word count (depth signal)
  const wordCount = page.markdown?.split(/\s+/).length || 0;
  if (wordCount >= 1500) {
    score += 20;
  } else if (wordCount < 300) {
    issues.push({
      severity: 'critical',
      category: 'engagement',
      message: `Thin content: ${wordCount} words. Aim for 1500+ for in-depth coverage.`,
      impact: -25
    });
    recommendations.push({
      priority: 'high',
      action: 'Expand content to 1500+ words with comprehensive coverage',
      expectedImpact: '+20-30 points to engagement potential'
    });
    score += Math.round(wordCount / 75);
  } else {
    score += Math.round(wordCount / 75);
  }
  
  // Multimedia presence
  const hasImages = page.metadata?.ogImage || page.markdown?.includes('![');
  if (hasImages) {
    score += 15;
  } else {
    recommendations.push({
      priority: 'medium',
      action: 'Add relevant images or diagrams to break up text',
      expectedImpact: '+10-15 points to engagement potential'
    });
  }
  
  // Readability (simplified Flesch score estimation)
  const sentences = page.markdown?.split(/[.!?]+/).length || 1;
  const avgWordsPerSentence = wordCount / sentences;
  const isReadable = avgWordsPerSentence < 20;
  if (isReadable) {
    score += 20;
  } else {
    issues.push({
      severity: 'warning',
      category: 'engagement',
      message: `Long sentences (avg ${Math.round(avgWordsPerSentence)} words). Aim for <20 words/sentence.`,
      impact: -12
    });
  }
  
  // Header structure
  const hasH2 = page.markdown?.includes('## ');
  const hasH3 = page.markdown?.includes('### ');
  if (hasH2 && hasH3) {
    score += 15;
  } else if (!hasH2) {
    issues.push({
      severity: 'warning',
      category: 'engagement',
      message: 'No H2 headers detected. Add clear section structure.',
      impact: -15
    });
    recommendations.push({
      priority: 'high',
      action: 'Add H2/H3 headers to create scannable structure',
      expectedImpact: '+12-15 points to engagement potential'
    });
  }
  
  // Internal links (user journey)
  const internalLinkCount = (page.markdown?.match(/\[.*?\]\((?!http)/g) || []).length;
  if (internalLinkCount > 0) {
    score += 10;
  } else {
    recommendations.push({
      priority: 'medium',
      action: 'Add internal links to related content (improves navigation)',
      expectedImpact: '+8-10 points to engagement potential'
    });
  }
  
  // FAQ detection (quick answers)
  const hasFAQ = page.markdown?.toLowerCase().includes('faq') || 
                 page.markdown?.toLowerCase().includes('frequently asked');
  if (hasFAQ) {
    score += 10;
  }
  
  // Table of contents (scannable long-form)
  const hasTOC = page.markdown?.toLowerCase().includes('table of contents') ||
                 page.markdown?.includes('- [');
  if (hasTOC) {
    score += 10;
  } else if (wordCount > 2000) {
    recommendations.push({
      priority: 'medium',
      action: 'Add table of contents for long-form content (improves scannability)',
      expectedImpact: '+8-10 points to engagement potential'
    });
  }
  
  return { score: Math.min(100, score), issues, recommendations };
}

/**
 * Analyze UX quality (Core Web Vitals simulation)
 */
function analyzeUXQuality(page: FirecrawlPage): {
  score: number;
  issues: NavBoostAnalysis['issues'];
  recommendations: NavBoostAnalysis['recommendations'];
} {
  const issues: NavBoostAnalysis['issues'] = [];
  const recommendations: NavBoostAnalysis['recommendations'] = [];
  
  let score = 0;
  
  // LCP estimate (based on content size and images)
  const contentSize = page.markdown?.length || 0;
  const hasLargeImages = page.metadata?.ogImage ? true : false;
  
  let estimatedLCP = 2.0; // Base assumption
  if (contentSize > 50000) estimatedLCP += 1.0;
  if (hasLargeImages) estimatedLCP += 0.5;
  
  if (estimatedLCP < 2.5) {
    score += 30;
  } else if (estimatedLCP < 4.0) {
    score += 15;
    issues.push({
      severity: 'warning',
      category: 'ux',
      message: `Estimated LCP ${estimatedLCP.toFixed(1)}s exceeds recommended 2.5s`,
      impact: -15
    });
  } else {
    issues.push({
      severity: 'critical',
      category: 'ux',
      message: `Poor LCP estimated at ${estimatedLCP.toFixed(1)}s. Optimize images/resources.`,
      impact: -30
    });
  }
  
  // FID (assumed good for static content)
  score += 20;
  
  // CLS (layout stability - check for fixed dimensions)
  const hasResponsiveImages = page.markdown?.includes('width=') || page.markdown?.includes('height=');
  if (hasResponsiveImages) {
    score += 20;
  } else {
    issues.push({
      severity: 'info',
      category: 'ux',
      message: 'Images missing width/height attributes (may cause layout shift)',
      impact: -10
    });
  }
  
  // Mobile-friendly (assumed yes for modern sites)
  score += 15;
  
  // Accessible navigation
  const hasNav = page.markdown?.toLowerCase().includes('nav') || 
                 page.markdown?.includes('breadcrumb');
  if (hasNav) {
    score += 10;
  }
  
  // Intrusive interstitials check
  const hasPopup = page.markdown?.toLowerCase().includes('modal') ||
                   page.markdown?.toLowerCase().includes('popup');
  if (!hasPopup) {
    score += 5;
  }
  
  return { score: Math.min(100, score), issues, recommendations: [] };
}

/**
 * Analyze click quality predictors (dwell time)
 */
function analyzeClickQuality(page: FirecrawlPage): {
  score: number;
  estimatedDwellTime: number;
  pogoStickRisk: 'low' | 'medium' | 'high';
  issues: NavBoostAnalysis['issues'];
  recommendations: NavBoostAnalysis['recommendations'];
} {
  const issues: NavBoostAnalysis['issues'] = [];
  const recommendations: NavBoostAnalysis['recommendations'] = [];
  
  let score = 0;
  
  // Paragraph length (scannable = lower bounce)
  const paragraphs = page.markdown?.split('\n\n') || [];
  const avgParagraphLength = paragraphs.reduce((sum: number, p: string) => sum + p.length, 0) / paragraphs.length;
  
  if (avgParagraphLength < 400) {
    score += 20;
  } else {
    score += 10;
    issues.push({
      severity: 'info',
      category: 'engagement',
      message: `Long paragraphs (avg ${Math.round(avgParagraphLength)} chars). Break into smaller chunks.`,
      impact: -10
    });
  }
  
  // Visual breaks
  const imageCount = (page.markdown?.match(/!\[/g) || []).length;
  if (imageCount >= 3) {
    score += 15;
  }
  
  // Related content sections
  const hasRelated = page.markdown?.toLowerCase().includes('related') ||
                     page.markdown?.toLowerCase().includes('read next');
  if (hasRelated) {
    score += 15;
  } else {
    recommendations.push({
      priority: 'medium',
      action: 'Add "Related Articles" section to increase page views',
      expectedImpact: '+10-15 points to click quality'
    });
  }
  
  // Engaging elements (interactive content)
  const hasEngaging = page.markdown?.toLowerCase().includes('calculator') ||
                      page.markdown?.toLowerCase().includes('quiz') ||
                      page.markdown?.toLowerCase().includes('tool');
  if (hasEngaging) {
    score += 15;
  }
  
  // Title/content match (no bait-and-switch)
  const title = page.metadata?.title || '';
  const firstParagraph = paragraphs[0] || '';
  const titleWords = title.toLowerCase().split(/\s+/);
  const contentMatchScore = titleWords.filter((word: string) => 
    word.length > 3 && firstParagraph.toLowerCase().includes(word)
  ).length / titleWords.length;
  
  if (contentMatchScore > 0.3) {
    score += 15;
  } else {
    issues.push({
      severity: 'warning',
      category: 'engagement',
      message: 'Content doesn\'t match title promise (potential bait-and-switch)',
      impact: -15
    });
  }
  
  // Estimate dwell time based on word count
  const wordCount = page.markdown?.split(/\s+/).length || 0;
  const readingSpeed = 250; // words per minute
  const estimatedDwellTime = Math.round((wordCount / readingSpeed) * 60); // seconds
  
  // Pogo-stick risk
  let pogoStickRisk: 'low' | 'medium' | 'high' = 'low';
  if (score < 40) {
    pogoStickRisk = 'high';
  } else if (score < 60) {
    pogoStickRisk = 'medium';
  }
  
  return { 
    score: Math.min(100, score), 
    estimatedDwellTime,
    pogoStickRisk,
    issues, 
    recommendations 
  };
}

/**
 * Analyze intent match (does content satisfy search intent?)
 */
function analyzeIntentMatch(page: FirecrawlPage): {
  score: number;
  issues: NavBoostAnalysis['issues'];
  recommendations: NavBoostAnalysis['recommendations'];
} {
  const issues: NavBoostAnalysis['issues'] = [];
  const recommendations: NavBoostAnalysis['recommendations'] = [];
  
  let score = 0;
  
  const title = page.metadata?.title || '';
  const markdown = page.markdown || '';
  
  // Primary keyword in H1
  const firstHeader = markdown.match(/^#\s+(.+)$/m)?.[1] || '';
  const titleInHeader = title.split(/\s+/).some(word => 
    word.length > 3 && firstHeader.toLowerCase().includes(word.toLowerCase())
  );
  
  if (titleInHeader) {
    score += 25;
  } else {
    issues.push({
      severity: 'warning',
      category: 'intent',
      message: 'H1 doesn\'t match title - unclear topic focus',
      impact: -20
    });
  }
  
  // Semantic coverage (LSI keywords - simplified)
  const keywordDensity = (markdown.match(/\b\w{5,}\b/g) || []).length / 
                         (markdown.split(/\s+/).length || 1);
  if (keywordDensity > 0.15 && keywordDensity < 0.30) {
    score += 25;
  }
  
  // Content type match (detect if it's guide/product/list)
  const isGuide = /guide|tutorial|how to|step by step/i.test(title);
  const isList = /\d+\s+(ways|tips|steps|methods)/i.test(title);
  const hasStructure = isGuide ? markdown.includes('##') : isList ? markdown.includes('1.') : true;
  
  if (hasStructure) {
    score += 30;
  } else {
    issues.push({
      severity: 'critical',
      category: 'intent',
      message: 'Content structure doesn\'t match promised format (guide/list)',
      impact: -25
    });
  }
  
  // Direct answer (featured snippet potential)
  const hasDirectAnswer = markdown.split('\n\n')[0].length > 100;
  if (hasDirectAnswer) {
    score += 20;
  } else {
    recommendations.push({
      priority: 'high',
      action: 'Add concise answer in first paragraph (featured snippet opportunity)',
      expectedImpact: '+15-20 points to intent match'
    });
  }
  
  return { score: Math.min(100, score), issues, recommendations };
}

/**
 * Apply cross-module bonuses from Date Consistency and Index Tier
 * 
 * NOTE: Cross-module bonuses are applied during full audit pipeline.
 * This is a placeholder for future integration.
 */
function applyCrossModuleBonuses(
  baseScore: number,
  page: FirecrawlPage,
  allPages: FirecrawlPage[]
): number {
  // Cross-module bonuses disabled for now (requires async context)
  // Will be applied in audit pipeline where we have access to:
  // - Date Consistency analysis results
  // - Index Tier predictions
  
  return Math.min(100, Math.max(0, baseScore));
}

/**
 * Analyze single page for NavBoost potential
 */
export function analyzePageNavBoost(
  page: FirecrawlPage,
  allPages: FirecrawlPage[]
): NavBoostAnalysis {
  // Component analyses
  const ctr = analyzeCTRPotential(page);
  const engagement = analyzeEngagementPotential(page);
  const ux = analyzeUXQuality(page);
  const clickQuality = analyzeClickQuality(page);
  const intent = analyzeIntentMatch(page);
  
  // Calculate weighted score
  const rawScore = Math.round(
    ctr.score * 0.25 +
    engagement.score * 0.30 +
    ux.score * 0.20 +
    clickQuality.score * 0.15 +
    intent.score * 0.10
  );
  
  // Apply cross-module bonuses
  const overallScore = applyCrossModuleBonuses(rawScore, page, allPages);
  
  // Merge issues and recommendations
  const allIssues = [
    ...ctr.issues,
    ...engagement.issues,
    ...ux.issues,
    ...clickQuality.issues,
    ...intent.issues
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  
  const allRecommendations = [
    ...ctr.recommendations,
    ...engagement.recommendations,
    ...clickQuality.recommendations,
    ...intent.recommendations
  ];
  
  // Priority sorting
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allRecommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  // Calculate last-click probability
  const lastClickProbability = Math.min(1, overallScore / 100);
  
  return {
    overallScore,
    scoreBreakdown: {
      ctrPotential: ctr.score,
      engagementPotential: engagement.score,
      uxQuality: ux.score,
      clickQuality: clickQuality.score,
      intentMatch: intent.score
    },
    signals: {
      estimatedDwellTime: clickQuality.estimatedDwellTime,
      pogoStickRisk: clickQuality.pogoStickRisk,
      lastClickProbability
    },
    issues: allIssues.slice(0, 10), // Top 10 issues
    recommendations: allRecommendations.slice(0, 8) // Top 8 recommendations
  };
}

/**
 * Analyze entire site for NavBoost report
 */
export function analyzeNavBoost(pages: FirecrawlPage[]): SiteNavBoostReport {
  const pageAnalyses = new Map<string, NavBoostAnalysis>();
  const distribution = {
    excellent: 0,
    good: 0,
    average: 0,
    poor: 0,
    critical: 0
  };
  
  let totalScore = 0;
  
  // Analyze each page
  for (const page of pages) {
    const analysis = analyzePageNavBoost(page, pages);
    pageAnalyses.set(page.url, analysis);
    totalScore += analysis.overallScore;
    
    // Distribution
    if (analysis.overallScore >= 90) distribution.excellent++;
    else if (analysis.overallScore >= 70) distribution.good++;
    else if (analysis.overallScore >= 50) distribution.average++;
    else if (analysis.overallScore >= 30) distribution.poor++;
    else distribution.critical++;
  }
  
  const overallScore = Math.round(totalScore / pages.length);
  
  // Aggregate top issues
  const issueMap = new Map<string, { count: number; totalImpact: number }>();
  for (const analysis of pageAnalyses.values()) {
    for (const issue of analysis.issues) {
      const key = issue.message;
      const existing = issueMap.get(key) || { count: 0, totalImpact: 0 };
      issueMap.set(key, {
        count: existing.count + 1,
        totalImpact: existing.totalImpact + Math.abs(issue.impact)
      });
    }
  }
  
  const topIssues = Array.from(issueMap.entries())
    .map(([issue, data]) => ({
      issue,
      affectedPages: data.count,
      avgImpact: Math.round(data.totalImpact / data.count)
    }))
    .sort((a, b) => b.affectedPages - a.affectedPages)
    .slice(0, 5);
  
  // Aggregate top recommendations
  const recMap = new Map<string, number>();
  for (const analysis of pageAnalyses.values()) {
    for (const rec of analysis.recommendations) {
      const key = rec.action;
      recMap.set(key, (recMap.get(key) || 0) + 1);
    }
  }
  
  const topRecommendations = Array.from(recMap.entries())
    .map(([recommendation, count]) => ({
      recommendation,
      affectedPages: count,
      totalImpact: `+${count * 10}-${count * 15} points total`
    }))
    .sort((a, b) => b.affectedPages - a.affectedPages)
    .slice(0, 5);
  
  return {
    overallScore,
    totalPages: pages.length,
    distribution,
    topIssues,
    topRecommendations,
    pageAnalyses
  };
}
