/**
 * Module E: Link Tier Analyzer
 * 
 * Based on Google Algorithm Leak 2024: Link value correlates with source page's Index Tier.
 * Classifies backlink quality by analyzing the storage tier of linking pages.
 * 
 * Tier Multipliers (from leak):
 * - Base (Flash/RAM): 3.0x link value
 * - Zeppelin (SSD): 1.5x link value
 * - Landfill (HDD): 0.5x link value
 */

import type { TierPrediction } from './index-tier';

export interface LinkTierAnalysis {
  url: string;
  
  inboundLinks: {
    total: number;
    baseTier: number;
    zeppelinTier: number;
    landfillTier: number;
  };
  
  linkTierScore: number;  // 0-100
  
  topSources: Array<{
    sourceUrl: string;
    sourceTier: 'base' | 'zeppelin' | 'landfill';
    tierMultiplier: number;
    linkValue: number;
  }>;
  
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
  }>;
  
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
  }>;
}

export interface SiteLinkTierReport {
  overallScore: number;
  totalInternalLinks: number;
  
  tierDistribution: {
    baseTier: number;      // Percentage
    zeppelinTier: number;
    landfillTier: number;
  };
  
  topLinkedPages: Array<{
    url: string;
    inboundCount: number;
    linkTierScore: number;
  }>;
  
  orphanPages: string[];
  
  linkOpportunities: Array<{
    targetPage: string;
    potentialSource: string;
    sourceTier: 'base' | 'zeppelin';
    expectedImpact: string;
  }>;
  
  pageAnalyses: Record<string, LinkTierAnalysis>;
}

interface PageData {
  url: string;
  links: { internal: string[]; external: string[] } | null;
}

interface TierData {
  url: string;
  tier: 'base' | 'zeppelin' | 'landfill';
  score: number;
}

/**
 * Build internal link graph from pages
 */
function buildLinkGraph(pages: PageData[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  
  // Initialize all pages
  for (const page of pages) {
    if (!graph.has(page.url)) {
      graph.set(page.url, new Set());
    }
  }
  
  // Build inbound links
  for (const page of pages) {
    const internalLinks = page.links?.internal || [];
    
    for (const targetUrl of internalLinks) {
      if (!graph.has(targetUrl)) {
        graph.set(targetUrl, new Set());
      }
      graph.get(targetUrl)!.add(page.url);
    }
  }
  
  return graph;
}

/**
 * Get tier multiplier based on Index Tier
 */
function getTierMultiplier(tier: 'base' | 'zeppelin' | 'landfill'): number {
  switch (tier) {
    case 'base':
      return 3.0;  // Premium link value
    case 'zeppelin':
      return 1.5;  // Good link value
    case 'landfill':
      return 0.5;  // Low link value
  }
}

/**
 * Extract tier from tier string (e.g., "Base (Flash/RAM)" → "base")
 */
function normalizeTier(tierString: string): 'base' | 'zeppelin' | 'landfill' {
  const lower = tierString.toLowerCase();
  if (lower.includes('base')) return 'base';
  if (lower.includes('zeppelin')) return 'zeppelin';
  return 'landfill';
}

/**
 * Analyze link tier for single page
 */
export function analyzePageLinkTier(
  page: PageData,
  inboundSources: Set<string>,
  tierData: Map<string, TierData>
): LinkTierAnalysis {
  const issues: LinkTierAnalysis['issues'] = [];
  const recommendations: LinkTierAnalysis['recommendations'] = [];
  
  // Count links by tier
  let baseTierCount = 0;
  let zeppelinTierCount = 0;
  let landfillTierCount = 0;
  
  const topSources: LinkTierAnalysis['topSources'] = [];
  
  for (const sourceUrl of inboundSources) {
    const sourceTierData = tierData.get(sourceUrl);
    if (!sourceTierData) continue;
    
    const tier = sourceTierData.tier;
    const multiplier = getTierMultiplier(tier);
    const linkValue = multiplier * 100;  // Base value of 100
    
    if (tier === 'base') baseTierCount++;
    else if (tier === 'zeppelin') zeppelinTierCount++;
    else landfillTierCount++;
    
    topSources.push({
      sourceUrl,
      sourceTier: tier,
      tierMultiplier: multiplier,
      linkValue
    });
  }
  
  // Sort by link value (highest first)
  topSources.sort((a, b) => b.linkValue - a.linkValue);
  
  const totalLinks = inboundSources.size;
  
  // Calculate tier-weighted score
  const rawScore = totalLinks > 0
    ? ((baseTierCount * 3.0) + (zeppelinTierCount * 1.5) + (landfillTierCount * 0.5)) / totalLinks * 100
    : 0;
  
  const linkTierScore = Math.min(100, Math.round(rawScore));
  
  // Generate issues
  if (totalLinks === 0) {
    issues.push({
      severity: 'critical',
      message: 'Orphan page: No inbound internal links detected'
    });
  } else if (totalLinks < 3) {
    issues.push({
      severity: 'warning',
      message: `Only ${totalLinks} inbound link${totalLinks > 1 ? 's' : ''} (recommend 3+ for good link equity)`
    });
  }
  
  if (landfillTierCount > totalLinks * 0.5) {
    issues.push({
      severity: 'warning',
      message: `${landfillTierCount} of ${totalLinks} inbound links from Landfill-tier pages (low value)`
    });
  }
  
  if (baseTierCount === 0 && totalLinks > 0) {
    issues.push({
      severity: 'info',
      message: 'No links from Base-tier pages yet (premium link opportunity)'
    });
  }
  
  // Generate recommendations
  if (totalLinks === 0) {
    recommendations.push({
      priority: 'high',
      action: 'Get linked from homepage or main navigation (improves discoverability)',
      impact: 'Critical for crawlability'
    });
  }
  
  if (baseTierCount === 0 && totalLinks > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Secure link from a Base-tier page (3x link value boost)',
      impact: '+30-50 points to link tier score'
    });
  }
  
  if (zeppelinTierCount < 3) {
    recommendations.push({
      priority: 'medium',
      action: 'Add links from Zeppelin-tier pages (1.5x value)',
      impact: '+10-20 points per link'
    });
  }
  
  if (landfillTierCount > 5) {
    recommendations.push({
      priority: 'low',
      action: 'Reduce reliance on Landfill-tier links (replace with higher-tier sources)',
      impact: '+5-10 points per improved link'
    });
  }
  
  return {
    url: page.url,
    inboundLinks: {
      total: totalLinks,
      baseTier: baseTierCount,
      zeppelinTier: zeppelinTierCount,
      landfillTier: landfillTierCount
    },
    linkTierScore,
    topSources: topSources.slice(0, 10),  // Top 10 sources
    recommendations,
    issues
  };
}

/**
 * Analyze link tiers for entire site
 */
export function analyzeLinkTiers(
  pages: PageData[],
  tierPredictions: Array<{ url: string; prediction: TierPrediction }>
): SiteLinkTierReport {
  // Build tier lookup map
  const tierData = new Map<string, TierData>();
  for (const item of tierPredictions) {
    tierData.set(item.url, {
      url: item.url,
      tier: normalizeTier(item.prediction.tier),
      score: item.prediction.overallScore
    });
  }
  
  // Build link graph
  const linkGraph = buildLinkGraph(pages);
  
  // Analyze each page
  const pageAnalyses: Record<string, LinkTierAnalysis> = {};
  const orphanPages: string[] = [];
  let totalScore = 0;
  let totalLinks = 0;
  let baseTierLinks = 0;
  let zeppelinTierLinks = 0;
  let landfillTierLinks = 0;
  
  for (const page of pages) {
    const inboundSources = linkGraph.get(page.url) || new Set();
    const analysis = analyzePageLinkTier(page, inboundSources, tierData);
    
    pageAnalyses[page.url] = analysis;
    totalScore += analysis.linkTierScore;
    totalLinks += analysis.inboundLinks.total;
    baseTierLinks += analysis.inboundLinks.baseTier;
    zeppelinTierLinks += analysis.inboundLinks.zeppelinTier;
    landfillTierLinks += analysis.inboundLinks.landfillTier;
    
    if (analysis.inboundLinks.total === 0) {
      orphanPages.push(page.url);
    }
  }
  
  const overallScore = pages.length > 0 ? Math.round(totalScore / pages.length) : 0;
  
  // Calculate tier distribution
  const tierDistribution = totalLinks > 0
    ? {
        baseTier: Math.round((baseTierLinks / totalLinks) * 100),
        zeppelinTier: Math.round((zeppelinTierLinks / totalLinks) * 100),
        landfillTier: Math.round((landfillTierLinks / totalLinks) * 100)
      }
    : { baseTier: 0, zeppelinTier: 0, landfillTier: 0 };
  
  // Find top linked pages
  const topLinkedPages = Object.entries(pageAnalyses)
    .map(([url, analysis]) => ({
      url,
      inboundCount: analysis.inboundLinks.total,
      linkTierScore: analysis.linkTierScore
    }))
    .sort((a, b) => b.linkTierScore - a.linkTierScore)
    .slice(0, 10);
  
  // Generate link opportunities
  const linkOpportunities: SiteLinkTierReport['linkOpportunities'] = [];
  
  // Find Base/Zeppelin pages with <5 outbound links (can link to more)
  const potentialSources = pages
    .filter((p) => {
      const tier = tierData.get(p.url);
      if (!tier || tier.tier === 'landfill') return false;
      const outboundCount = p.links?.internal.length || 0;
      return outboundCount < 5;
    })
    .slice(0, 5);
  
  // Find pages with low link tier scores that need links
  const needsLinks = Object.entries(pageAnalyses)
    .filter(([_, analysis]) => analysis.linkTierScore < 50 && analysis.inboundLinks.total < 5)
    .slice(0, 5);
  
  for (const [targetUrl, analysis] of needsLinks) {
    for (const source of potentialSources) {
      const sourceTier = tierData.get(source.url);
      if (!sourceTier) continue;
      
      // Don't suggest if already linked
      const existingSources = new Set(analysis.topSources.map((s) => s.sourceUrl));
      if (existingSources.has(source.url)) continue;
      
      linkOpportunities.push({
        targetPage: targetUrl,
        potentialSource: source.url,
        sourceTier: sourceTier.tier as 'base' | 'zeppelin',
        expectedImpact: sourceTier.tier === 'base' 
          ? '+30-50 points (3x multiplier)' 
          : '+15-25 points (1.5x multiplier)'
      });
    }
  }
  
  return {
    overallScore,
    totalInternalLinks: totalLinks,
    tierDistribution,
    topLinkedPages,
    orphanPages,
    linkOpportunities: linkOpportunities.slice(0, 10),
    pageAnalyses
  };
}
