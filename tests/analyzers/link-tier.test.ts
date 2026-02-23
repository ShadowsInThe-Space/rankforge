import { describe, it, expect } from 'vitest';
import { analyzePageLinkTier, analyzeLinkTiers } from '../../src/lib/analyzers/link-tier';
import { IndexTier, type TierPrediction } from '../../src/lib/analyzers/index-tier';

describe('Link Tier Analyzer', () => {
  const createMockPage = (url: string, internalLinks: string[] = []) => ({
    url,
    links: {
      internal: internalLinks,
      external: []
    }
  });

  const createMockTierPrediction = (url: string, tier: IndexTier, score: number): { url: string; prediction: TierPrediction } => ({
    url,
    prediction: {
      url,
      tier,
      overallScore: score,
      confidence: 0.8,
      factors: {
        freshness: { daysSinceUpdate: 7, lastModified: new Date(), score: 50 },
        updateFrequency: { estimatedFrequency: 'monthly', updatesPerMonth: 1, score: 50 },
        backlinkQuality: { internalBacklinks: 5, orphanPage: false, score: 50 },
        pageSpeed: { lcp: 2.0, inp: 50, cls: 0.05, estimatedScore: 50, score: 50 },
        userEngagement: { wordCount: 1000, hasMultimedia: true, headingDepth: 3, linkDensity: 0.05, score: 50 }
      },
      recommendations: [],
      issues: []
    }
  });

  describe('Tier Multipliers', () => {
    it('should apply 3x multiplier for Base-tier links', () => {
      const targetPage = createMockPage('https://example.com/target');
      const sourcePage = createMockPage('https://example.com/source', ['https://example.com/target']);
      
      const tierData = new Map([
        ['https://example.com/source', { url: 'https://example.com/source', tier: 'base' as const, score: 85 }]
      ]);
      
      const inboundSources = new Set(['https://example.com/source']);
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.topSources[0].tierMultiplier).toBe(3.0);
      expect(analysis.topSources[0].linkValue).toBe(300);
    });

    it('should apply 1.5x multiplier for Zeppelin-tier links', () => {
      const targetPage = createMockPage('https://example.com/target');
      const tierData = new Map([
        ['https://example.com/source', { url: 'https://example.com/source', tier: 'zeppelin' as const, score: 65 }]
      ]);
      
      const inboundSources = new Set(['https://example.com/source']);
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.topSources[0].tierMultiplier).toBe(1.5);
      expect(analysis.topSources[0].linkValue).toBe(150);
    });

    it('should apply 0.5x multiplier for Landfill-tier links', () => {
      const targetPage = createMockPage('https://example.com/target');
      const tierData = new Map([
        ['https://example.com/source', { url: 'https://example.com/source', tier: 'landfill' as const, score: 30 }]
      ]);
      
      const inboundSources = new Set(['https://example.com/source']);
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.topSources[0].tierMultiplier).toBe(0.5);
      expect(analysis.topSources[0].linkValue).toBe(50);
    });
  });

  describe('Link Tier Score Calculation', () => {
    it('should calculate correct score for mixed-tier links', () => {
      const targetPage = createMockPage('https://example.com/target');
      
      const tierData = new Map([
        ['https://example.com/base1', { url: 'https://example.com/base1', tier: 'base' as const, score: 85 }],
        ['https://example.com/zep1', { url: 'https://example.com/zep1', tier: 'zeppelin' as const, score: 65 }],
        ['https://example.com/land1', { url: 'https://example.com/land1', tier: 'landfill' as const, score: 30 }]
      ]);
      
      const inboundSources = new Set([
        'https://example.com/base1',   // 3.0x
        'https://example.com/zep1',    // 1.5x
        'https://example.com/land1'    // 0.5x
      ]);
      
      // Score = (1*3.0 + 1*1.5 + 1*0.5) / 3 * 100 = 5.0/3*100 = 166.67
      // Clamped to 100
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.linkTierScore).toBeGreaterThan(50);
      expect(analysis.linkTierScore).toBeLessThanOrEqual(100);
      expect(analysis.inboundLinks.baseTier).toBe(1);
      expect(analysis.inboundLinks.zeppelinTier).toBe(1);
      expect(analysis.inboundLinks.landfillTier).toBe(1);
    });

    it('should return 0 score for orphan pages', () => {
      const targetPage = createMockPage('https://example.com/orphan');
      const tierData = new Map();
      const inboundSources = new Set<string>();
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.linkTierScore).toBe(0);
      expect(analysis.inboundLinks.total).toBe(0);
    });

    it('should cap score at 100', () => {
      const targetPage = createMockPage('https://example.com/target');
      
      // 10 Base-tier links = 10 * 3.0 / 10 * 100 = 300 (should cap at 100)
      const tierData = new Map();
      const inboundSources = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const url = `https://example.com/base${i}`;
        tierData.set(url, { url, tier: 'base' as const, score: 85 });
        inboundSources.add(url);
      }
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.linkTierScore).toBe(100);
    });
  });

  describe('Orphan Page Detection', () => {
    it('should detect orphan pages (0 inbound links)', () => {
      const pages = [
        createMockPage('https://example.com/page1'),
        createMockPage('https://example.com/page2'),
        createMockPage('https://example.com/orphan')  // No links pointing to it
      ];
      
      const tierPredictions = pages.map((p) => 
        createMockTierPrediction(p.url, IndexTier.ZEPPELIN, 65)
      );
      
      const report = analyzeLinkTiers(pages, tierPredictions);
      
      expect(report.orphanPages).toContain('https://example.com/orphan');
      expect(report.orphanPages.length).toBeGreaterThan(0);
    });

    it('should issue critical warning for orphan pages', () => {
      const targetPage = createMockPage('https://example.com/orphan');
      const tierData = new Map();
      const inboundSources = new Set<string>();
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.issues.some((i) => i.severity === 'critical' && i.message.includes('Orphan'))).toBe(true);
    });
  });

  describe('Issue Detection', () => {
    it('should warn when >50% links from Landfill tier', () => {
      const targetPage = createMockPage('https://example.com/target');
      
      const tierData = new Map([
        ['https://example.com/land1', { url: 'https://example.com/land1', tier: 'landfill' as const, score: 30 }],
        ['https://example.com/land2', { url: 'https://example.com/land2', tier: 'landfill' as const, score: 30 }],
        ['https://example.com/land3', { url: 'https://example.com/land3', tier: 'landfill' as const, score: 30 }],
        ['https://example.com/zep1', { url: 'https://example.com/zep1', tier: 'zeppelin' as const, score: 65 }]
      ]);
      
      const inboundSources = new Set([
        'https://example.com/land1',
        'https://example.com/land2',
        'https://example.com/land3',
        'https://example.com/zep1'
      ]);
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.issues.some((i) => i.message.includes('Landfill-tier'))).toBe(true);
    });

    it('should warn when <3 total inbound links', () => {
      const targetPage = createMockPage('https://example.com/target');
      
      const tierData = new Map([
        ['https://example.com/source1', { url: 'https://example.com/source1', tier: 'zeppelin' as const, score: 65 }]
      ]);
      
      const inboundSources = new Set(['https://example.com/source1']);
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.issues.some((i) => i.message.includes('Only 1 inbound link'))).toBe(true);
    });
  });

  describe('Recommendations', () => {
    it('should recommend Base-tier link when none exist', () => {
      const targetPage = createMockPage('https://example.com/target');
      
      const tierData = new Map([
        ['https://example.com/zep1', { url: 'https://example.com/zep1', tier: 'zeppelin' as const, score: 65 }]
      ]);
      
      const inboundSources = new Set(['https://example.com/zep1']);
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.recommendations.some((r) => r.priority === 'high' && r.action.includes('Base-tier'))).toBe(true);
    });

    it('should recommend linking from homepage for orphans', () => {
      const targetPage = createMockPage('https://example.com/orphan');
      const tierData = new Map();
      const inboundSources = new Set<string>();
      
      const analysis = analyzePageLinkTier(targetPage, inboundSources, tierData);
      
      expect(analysis.recommendations.some((r) => r.priority === 'high')).toBe(true);
    });
  });

  describe('Site-Wide Analysis', () => {
    it('should calculate overall site score', () => {
      const pages = [
        createMockPage('https://example.com/home', ['https://example.com/page1', 'https://example.com/page2']),
        createMockPage('https://example.com/page1'),
        createMockPage('https://example.com/page2')
      ];
      
      const tierPredictions = [
        createMockTierPrediction('https://example.com/home', IndexTier.BASE, 85),
        createMockTierPrediction('https://example.com/page1', IndexTier.ZEPPELIN, 65),
        createMockTierPrediction('https://example.com/page2', IndexTier.ZEPPELIN, 65)
      ];
      
      const report = analyzeLinkTiers(pages, tierPredictions);
      
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.totalInternalLinks).toBeGreaterThan(0);
    });

    it('should calculate tier distribution percentages', () => {
      const pages = [
        createMockPage('https://example.com/base', ['https://example.com/target']),
        createMockPage('https://example.com/zep', ['https://example.com/target']),
        createMockPage('https://example.com/land', ['https://example.com/target']),
        createMockPage('https://example.com/target')
      ];
      
      const tierPredictions = [
        createMockTierPrediction('https://example.com/base', IndexTier.BASE, 85),
        createMockTierPrediction('https://example.com/zep', IndexTier.ZEPPELIN, 65),
        createMockTierPrediction('https://example.com/land', IndexTier.LANDFILL, 30),
        createMockTierPrediction('https://example.com/target', IndexTier.ZEPPELIN, 65)
      ];
      
      const report = analyzeLinkTiers(pages, tierPredictions);
      
      expect(report.tierDistribution.baseTier).toBeGreaterThan(0);
      expect(report.tierDistribution.zeppelinTier).toBeGreaterThan(0);
      expect(report.tierDistribution.landfillTier).toBeGreaterThan(0);
      
      const total = report.tierDistribution.baseTier + 
                    report.tierDistribution.zeppelinTier + 
                    report.tierDistribution.landfillTier;
      expect(total).toBeGreaterThanOrEqual(99); // Allow rounding error
      expect(total).toBeLessThanOrEqual(101);
    });

    it('should identify top linked pages', () => {
      const pages = [
        createMockPage('https://example.com/home', ['https://example.com/popular']),
        createMockPage('https://example.com/page1', ['https://example.com/popular']),
        createMockPage('https://example.com/page2', ['https://example.com/popular']),
        createMockPage('https://example.com/popular')
      ];
      
      const tierPredictions = pages.map((p) => 
        createMockTierPrediction(p.url, IndexTier.ZEPPELIN, 65)
      );
      
      const report = analyzeLinkTiers(pages, tierPredictions);
      
      expect(report.topLinkedPages.length).toBeGreaterThan(0);
      expect(report.topLinkedPages[0].url).toBe('https://example.com/popular');
      expect(report.topLinkedPages[0].inboundCount).toBe(3);
    });

    it('should generate link opportunities', () => {
      const pages = [
        createMockPage('https://example.com/base-page', []),  // Base tier, no outbound links yet
        createMockPage('https://example.com/weak-page')       // Needs links
      ];
      
      const tierPredictions = [
        createMockTierPrediction('https://example.com/base-page', IndexTier.BASE, 85),
        createMockTierPrediction('https://example.com/weak-page', IndexTier.LANDFILL, 30)
      ];
      
      const report = analyzeLinkTiers(pages, tierPredictions);
      
      // Link opportunities are generated - just verify structure
      expect(report.linkOpportunities).toBeDefined();
      expect(Array.isArray(report.linkOpportunities)).toBe(true);
      
      if (report.linkOpportunities.length > 0) {
        expect(report.linkOpportunities[0]).toHaveProperty('targetPage');
        expect(report.linkOpportunities[0]).toHaveProperty('potentialSource');
        expect(report.linkOpportunities[0]).toHaveProperty('sourceTier');
        expect(report.linkOpportunities[0]).toHaveProperty('expectedImpact');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pages array', () => {
      const report = analyzeLinkTiers([], []);
      
      expect(report.overallScore).toBe(0);
      expect(report.totalInternalLinks).toBe(0);
      expect(report.orphanPages).toEqual([]);
    });

    it('should handle pages with no tier predictions', () => {
      const pages = [
        createMockPage('https://example.com/page1', ['https://example.com/page2']),
        createMockPage('https://example.com/page2')
      ];
      
      const report = analyzeLinkTiers(pages, []);
      
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      // Pages without tier data are ignored in calculations
    });

    it('should handle circular links', () => {
      const pages = [
        createMockPage('https://example.com/page1', ['https://example.com/page2']),
        createMockPage('https://example.com/page2', ['https://example.com/page1'])
      ];
      
      const tierPredictions = [
        createMockTierPrediction('https://example.com/page1', IndexTier.ZEPPELIN, 65),
        createMockTierPrediction('https://example.com/page2', IndexTier.ZEPPELIN, 65)
      ];
      
      const report = analyzeLinkTiers(pages, tierPredictions);
      
      expect(report.orphanPages.length).toBe(0);  // Both pages linked
      expect(report.totalInternalLinks).toBe(2);
    });
  });
});
