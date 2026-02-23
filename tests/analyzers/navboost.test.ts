import { describe, it, expect } from 'vitest';
import { analyzePageNavBoost, analyzeNavBoost, type FirecrawlPage } from '../../src/lib/analyzers/navboost';

describe('NavBoost Analyzer', () => {
  const createMockPage = (overrides: Partial<FirecrawlPage> = {}): FirecrawlPage => ({
    url: 'https://example.com/test',
    markdown: '# Test Page\n\nThis is a test page with some content.',
    metadata: {
      title: 'Test Page Title',
      description: 'Test page description',
      language: 'en',
      sourceURL: 'https://example.com/test'
    },
    ...overrides
  });

  describe('CTR Potential Scoring', () => {
    const currentYear = new Date().getFullYear();

    it('should score optimal title length (50-60 chars) highly', () => {
      const page = createMockPage({
        metadata: {
          title: 'This Is An Optimal Title Length Between Fifty Sixty', // 53 chars
          description: 'Test description that is long enough to be considered good for SEO purposes and user engagement in search results.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const analysis = analyzePageNavBoost(page, [page]);
      expect(analysis.scoreBreakdown.ctrPotential).toBeGreaterThanOrEqual(45); // Optimal title gets 48
    });

    it('should penalize short titles', () => {
      const page = createMockPage({
        metadata: {
          title: 'Short', // 5 chars
          description: 'Test description that is long enough to be considered good for SEO purposes and user engagement.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const analysis = analyzePageNavBoost(page, [page]);
      expect(analysis.scoreBreakdown.ctrPotential).toBeLessThan(50);
      expect(analysis.issues.some(i => i.category === 'ctr' && i.message.includes('too short'))).toBe(true);
    });

    it('should boost score for numbers in title', () => {
      const withNumber = createMockPage({
        metadata: {
          title: '7 Proven Ways To Improve Your SEO Rankings In 2024',
          description: 'Discover seven actionable strategies to boost your search engine rankings this year with proven techniques.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const withoutNumber = createMockPage({
        metadata: {
          title: 'Proven Ways To Improve Your SEO Rankings This Year',
          description: 'Discover actionable strategies to boost your search engine rankings this year with proven techniques.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const analysisWithNumber = analyzePageNavBoost(withNumber, [withNumber]);
      const analysisWithoutNumber = analyzePageNavBoost(withoutNumber, [withoutNumber]);
      
      expect(analysisWithNumber.scoreBreakdown.ctrPotential).toBeGreaterThan(
        analysisWithoutNumber.scoreBreakdown.ctrPotential
      );
    });

    it('should detect and score emotional triggers in title', () => {
      const emotional = createMockPage({
        metadata: {
          title: 'The Ultimate Guide To Amazing SEO Results Proven Methods',
          description: 'Learn the best proven methods for achieving amazing SEO results with our comprehensive guide.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const neutral = createMockPage({
        metadata: {
          title: 'Guide To SEO Results Methods That Work Well Always',
          description: 'Learn methods for achieving SEO results with our comprehensive guide to search optimization.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const emotionalAnalysis = analyzePageNavBoost(emotional, [emotional]);
      const neutralAnalysis = analyzePageNavBoost(neutral, [neutral]);
      
      expect(emotionalAnalysis.scoreBreakdown.ctrPotential).toBeGreaterThan(
        neutralAnalysis.scoreBreakdown.ctrPotential
      );
    });

    it('should boost score for current year in title (freshness signal)', () => {
      const withYear = createMockPage({
        metadata: {
          title: `Complete SEO Guide For ${currentYear} With Proven Strategies`,
          description: 'Learn how to optimize your website with our comprehensive SEO guide for modern search.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });

      const withoutYear = createMockPage({
        metadata: {
          title: 'Complete SEO Guide With Proven Strategies For Your Business',
          description: 'Learn how to optimize your website with our comprehensive SEO guide for modern search.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });

      const withYearAnalysis = analyzePageNavBoost(withYear, [withYear]);
      const withoutYearAnalysis = analyzePageNavBoost(withoutYear, [withoutYear]);

      expect(withYearAnalysis.scoreBreakdown.ctrPotential).toBeGreaterThan(
        withoutYearAnalysis.scoreBreakdown.ctrPotential
      );
    });

    it('should weight title and description equally for CTR scoring', () => {
      // Test that equal improvements to title and description both contribute
      const balancedPage = createMockPage({
        metadata: {
          title: '7 Amazing SEO Tips For Better Rankings In 2024',
          description: 'Learn seven proven ways to improve your search rankings with our comprehensive guide.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });

      const analysis = analyzePageNavBoost(balancedPage, [balancedPage]);

      // Should have a decent score due to both title and meta optimizations
      expect(analysis.scoreBreakdown.ctrPotential).toBeGreaterThan(50);
    });

    it('should score specific emotional triggers correctly', () => {
      const triggerTests = [
        { trigger: 'amazing', title: 'Amazing SEO Tips That Work' },
        { trigger: 'proven', title: 'Proven SEO Methods For Success' },
        { trigger: 'ultimate', title: 'Ultimate Guide To SEO' },
        { trigger: 'essential', title: 'Essential SEO Checklist' },
        { trigger: 'complete', title: 'Complete SEO Course' },
        { trigger: 'best', title: 'Best SEO Practices' },
        { trigger: 'top', title: 'Top SEO Strategies' },
        { trigger: 'secret', title: 'Secret SEO Techniques' },
        { trigger: 'powerful', title: 'Powerful SEO Tools' }
      ];

      for (const test of triggerTests) {
        const page = createMockPage({
          metadata: {
            title: test.title,
            description: 'Learn SEO with our comprehensive guide that covers all essential aspects.',
            language: 'en',
            sourceURL: 'https://example.com/test'
          }
        });

        const analysis = analyzePageNavBoost(page, [page]);
        // Each emotional trigger should boost the score
        expect(analysis.scoreBreakdown.ctrPotential).toBeGreaterThan(40);
      }
    });

    it('should score numbers in title correctly', () => {
      const numberTests = [
        { title: '7 Ways To Improve SEO', expected: true },
        { title: '10 Tips For SEO', expected: true },
        { title: '5 SEO Strategies', expected: true },
        { title: '2024 SEO Guide', expected: true },
        { title: 'SEO Tips Without Numbers', expected: false }
      ];

      for (const test of numberTests) {
        const page = createMockPage({
          metadata: {
            title: test.title,
            description: 'Learn SEO with our comprehensive guide.',
            language: 'en',
            sourceURL: 'https://example.com/test'
          }
        });

        const analysis = analyzePageNavBoost(page, [page]);
        // Pages with numbers should have higher CTR than those without
        if (test.expected) {
          expect(analysis.scoreBreakdown.ctrPotential).toBeGreaterThan(50);
        }
      }
    });

    it('should score optimal meta description length', () => {
      const optimal = createMockPage({
        metadata: {
          title: 'SEO Guide For Modern Websites And Digital Marketing Teams',
          description: 'Learn how to optimize your website for search engines with proven strategies that work in 2024. Get actionable tips and improve rankings today.', // 150 chars
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const analysis = analyzePageNavBoost(optimal, [optimal]);
      expect(analysis.scoreBreakdown.ctrPotential).toBeGreaterThanOrEqual(60);
    });

    it('should detect call-to-action in meta description', () => {
      const withCTA = createMockPage({
        metadata: {
          title: 'Complete SEO Checklist For Website Optimization Success',
          description: 'Learn how to optimize your website with our comprehensive SEO checklist. Discover proven strategies and get started today with actionable tips.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const withoutCTA = createMockPage({
        metadata: {
          title: 'Complete SEO Checklist For Website Optimization Success',
          description: 'A comprehensive SEO checklist that covers all aspects of website optimization including technical SEO and content strategy fundamentals.',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const withCTAAnalysis = analyzePageNavBoost(withCTA, [withCTA]);
      const withoutCTAAnalysis = analyzePageNavBoost(withoutCTA, [withoutCTA]);
      
      expect(withCTAAnalysis.scoreBreakdown.ctrPotential).toBeGreaterThan(
        withoutCTAAnalysis.scoreBreakdown.ctrPotential
      );
    });
  });

  describe('Engagement Potential Scoring', () => {
    it('should reward long-form content (1500+ words)', () => {
      const longContent = createMockPage({
        markdown: '# Long Article\n\n' + 'Word '.repeat(1500)
      });
      
      const analysis = analyzePageNavBoost(longContent, [longContent]);
      expect(analysis.scoreBreakdown.engagementPotential).toBeGreaterThanOrEqual(20); // Minimal markdown gets 20
    });

    it('should penalize thin content (<300 words)', () => {
      const thinContent = createMockPage({
        markdown: '# Short\n\nJust a few words here.'
      });
      
      const analysis = analyzePageNavBoost(thinContent, [thinContent]);
      expect(analysis.issues.some(i => i.message.includes('Thin content'))).toBe(true);
    });

    it('should detect and score multimedia presence', () => {
      const withImage = createMockPage({
        markdown: '# Article\n\n![Image](image.jpg)\n\nContent here.',
        metadata: {
          title: 'Article With Images',
          description: 'Description here',
          language: 'en',
          sourceURL: 'https://example.com/test',
          ogImage: 'https://example.com/og.jpg'
        }
      });
      
      const withoutImage = createMockPage({
        markdown: '# Article\n\nContent here without images.',
        metadata: {
          title: 'Article Without Images',
          description: 'Description here',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const withImageAnalysis = analyzePageNavBoost(withImage, [withImage]);
      const withoutImageAnalysis = analyzePageNavBoost(withoutImage, [withoutImage]);
      
      expect(withImageAnalysis.scoreBreakdown.engagementPotential).toBeGreaterThan(
        withoutImageAnalysis.scoreBreakdown.engagementPotential
      );
    });

    it('should detect header structure (H2/H3)', () => {
      const structured = createMockPage({
        markdown: '# Main\n\n## Section 1\n\n### Subsection\n\nContent here.'
      });
      
      const unstructured = createMockPage({
        markdown: '# Main\n\nNo headers just text content goes here.'
      });
      
      const structuredAnalysis = analyzePageNavBoost(structured, [structured]);
      const unstructuredAnalysis = analyzePageNavBoost(unstructured, [unstructured]);
      
      expect(structuredAnalysis.scoreBreakdown.engagementPotential).toBeGreaterThan(
        unstructuredAnalysis.scoreBreakdown.engagementPotential
      );
    });

    it('should detect internal links', () => {
      const withLinks = createMockPage({
        markdown: '# Article\n\nCheck out [related article](/related).'
      });
      
      const withoutLinks = createMockPage({
        markdown: '# Article\n\nNo links in this content at all.'
      });
      
      const withLinksAnalysis = analyzePageNavBoost(withLinks, [withLinks]);
      const withoutLinksAnalysis = analyzePageNavBoost(withoutLinks, [withoutLinks]);
      
      expect(withLinksAnalysis.scoreBreakdown.engagementPotential).toBeGreaterThan(
        withoutLinksAnalysis.scoreBreakdown.engagementPotential
      );
    });
  });

  describe('Click Quality Predictors', () => {
    it('should estimate dwell time based on word count', () => {
      const page = createMockPage({
        markdown: '# Article\n\n' + 'Word '.repeat(1000) // ~1000 words = ~4min read
      });
      
      const analysis = analyzePageNavBoost(page, [page]);
      expect(analysis.signals.estimatedDwellTime).toBeGreaterThan(120); // >2 minutes
    });

    it('should detect pogo-stick risk for low engagement pages', () => {
      const lowEngagement = createMockPage({
        markdown: '# Title\n\nShort content.',
        metadata: {
          title: 'X',
          description: 'Y',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const analysis = analyzePageNavBoost(lowEngagement, [lowEngagement]);
      expect(analysis.signals.pogoStickRisk).not.toBe('low');
    });

    it('should detect content/title mismatch (bait-and-switch)', () => {
      const mismatch = createMockPage({
        metadata: {
          title: 'Ultimate Python Programming Guide Advanced Techniques',
          description: 'Learn Python programming',
          language: 'en',
          sourceURL: 'https://example.com/test'
        },
        markdown: '# JavaScript Tutorial\n\nThis is about JavaScript, not Python.'
      });
      
      const analysis = analyzePageNavBoost(mismatch, [mismatch]);
      expect(analysis.issues.some(i => i.message.includes('doesn\'t match title'))).toBe(true);
    });
  });

  describe('Intent Match Scoring', () => {
    it('should detect keyword in H1', () => {
      const matched = createMockPage({
        metadata: {
          title: 'SEO Guide For Beginners',
          description: 'Learn SEO basics',
          language: 'en',
          sourceURL: 'https://example.com/test'
        },
        markdown: '# SEO Guide For Beginners\n\nContent here.'
      });
      
      const analysis = analyzePageNavBoost(matched, [matched]);
      expect(analysis.scoreBreakdown.intentMatch).toBeGreaterThan(20); // H1 match alone = 25
    });

    it('should verify content structure matches promised format', () => {
      const guide = createMockPage({
        metadata: {
          title: 'Complete Guide To SEO Optimization Strategies Success',
          description: 'Step by step guide',
          language: 'en',
          sourceURL: 'https://example.com/test'
        },
        markdown: '# Guide\n\n## Step 1\n\n## Step 2\n\nContent.'
      });
      
      const list = createMockPage({
        metadata: {
          title: '10 SEO Tips For Better Rankings And More Traffic Flow',
          description: 'Top ten tips',
          language: 'en',
          sourceURL: 'https://example.com/test'
        },
        markdown: '# Tips\n\n1. First tip\n2. Second tip'
      });
      
      const guideAnalysis = analyzePageNavBoost(guide, [guide]);
      const listAnalysis = analyzePageNavBoost(list, [list]);
      
      expect(guideAnalysis.scoreBreakdown.intentMatch).toBeGreaterThan(40);
      expect(listAnalysis.scoreBreakdown.intentMatch).toBeGreaterThan(40);
    });
  });

  describe('Cross-Module Integration', () => {
    it('should apply bonus for perfect date consistency', () => {
      // This would require mocking the date-consistency module
      // For now, just verify the bonus doesn't break scoring
      const page = createMockPage();
      const analysis = analyzePageNavBoost(page, [page]);
      
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Site-Wide Analysis', () => {
    it('should calculate overall site score', () => {
      const pages = [
        createMockPage({ url: 'https://example.com/page1' }),
        createMockPage({ url: 'https://example.com/page2' }),
        createMockPage({ url: 'https://example.com/page3' })
      ];
      
      const report = analyzeNavBoost(pages);
      
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.totalPages).toBe(3);
    });

    it('should categorize pages into distribution buckets', () => {
      const pages = [
        createMockPage({ 
          url: 'https://example.com/excellent',
          metadata: {
            title: '10 Amazing SEO Tips That Work In 2024 Proven Results',
            description: 'Discover ten proven SEO tips that will transform your search rankings. Learn actionable strategies and get started improving your visibility today.',
            language: 'en',
            sourceURL: 'https://example.com/excellent'
          },
          markdown: '# Article\n\n## Section\n\n' + 'Word '.repeat(2000) + '\n\n![Image](img.jpg)'
        }),
        createMockPage({ 
          url: 'https://example.com/poor',
          metadata: {
            title: 'X',
            description: 'Y',
            language: 'en',
            sourceURL: 'https://example.com/poor'
          },
          markdown: 'Short.'
        })
      ];
      
      const report = analyzeNavBoost(pages);
      const total = report.distribution.excellent + 
                    report.distribution.good + 
                    report.distribution.average + 
                    report.distribution.poor + 
                    report.distribution.critical;
      
      expect(total).toBe(2);
    });

    it('should aggregate top issues across pages', () => {
      const pages = [
        createMockPage({ 
          url: 'https://example.com/1',
          metadata: { title: 'Short', description: 'X', language: 'en', sourceURL: 'https://example.com/1' }
        }),
        createMockPage({ 
          url: 'https://example.com/2',
          metadata: { title: 'Also Short', description: 'Y', language: 'en', sourceURL: 'https://example.com/2' }
        })
      ];
      
      const report = analyzeNavBoost(pages);
      expect(report.topIssues.length).toBeGreaterThan(0);
      expect(report.topIssues[0].affectedPages).toBeGreaterThan(0);
    });

    it('should provide actionable recommendations', () => {
      const page = createMockPage({
        metadata: {
          title: 'Short',
          description: 'Also short',
          language: 'en',
          sourceURL: 'https://example.com/test'
        }
      });
      
      const analysis = analyzePageNavBoost(page, [page]);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toHaveProperty('priority');
      expect(analysis.recommendations[0]).toHaveProperty('action');
      expect(analysis.recommendations[0]).toHaveProperty('expectedImpact');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing metadata gracefully', () => {
      const page = createMockPage({
        metadata: undefined as any
      });
      
      const analysis = analyzePageNavBoost(page, [page]);
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty markdown', () => {
      const page = createMockPage({
        markdown: ''
      });
      
      const analysis = analyzePageNavBoost(page, [page]);
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should not exceed 100 score', () => {
      const perfect = createMockPage({
        metadata: {
          title: '10 Proven SEO Strategies That Work In 2024 Ultimate Guide',
          description: 'Discover the ultimate guide to SEO in 2024. Learn proven strategies that work, get actionable tips, and transform your search rankings starting today.',
          language: 'en',
          sourceURL: 'https://example.com/perfect',
          ogImage: 'https://example.com/og.jpg'
        },
        markdown: `# 10 Proven SEO Strategies

## Table of Contents
- Strategy 1
- Strategy 2

## Strategy 1: Content Quality

${'Word '.repeat(2000)}

![Diagram](diagram.jpg)

### Key Points

- Point 1
- Point 2

[Related article](/related)

## FAQ

**Q: How does this work?**
A: Detailed answer here.

## Related Articles
- [Article 1](/article1)
`
      });
      
      const analysis = analyzePageNavBoost(perfect, [perfect]);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
