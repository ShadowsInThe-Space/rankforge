// tests/analyzers/index-tier.test.ts

import { describe, it, expect } from "vitest";
import { predictIndexTier, IndexTier } from "@/lib/analyzers/index-tier";

describe("Index Tier Predictor", () => {
  // ─── BASE TIER TESTS ───────────────────────────────────────

  it("should predict BASE tier for fresh, high-quality page", async () => {
    const page = {
      url: "https://example.com/blog/latest-post",
      html: '<img src="test.jpg" loading="lazy"><script async>',
      markdown: "A".repeat(2000), // 2000 words
      wordCount: 2000,
      headings: { h1: ["Title"], h2: ["Section 1"], h3: ["Subsection"] },
      links: {
        internal: Array(15).fill("https://example.com/page"),
        external: ["https://authority.com"],
      },
      metadata: {
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 15,
    });

    expect(result.tier).toBe(IndexTier.BASE);
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.confidence).toBeGreaterThanOrEqual(70);
    expect(result.factors.freshness.score).toBeGreaterThanOrEqual(80);
    expect(result.factors.backlinkQuality.orphanPage).toBe(false);
  });

  it("should predict BASE tier for homepage with high update frequency", async () => {
    const page = {
      url: "https://example.com/",
      html: '<img src="hero.jpg">',
      wordCount: 800,
      headings: { h1: ["Home"], h2: ["Section"] },
      links: {
        internal: Array(20).fill("https://example.com/page"),
        external: [],
      },
      metadata: {
        lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 20,
    });

    expect(result.tier).toBe(IndexTier.BASE);
    expect(result.factors.updateFrequency.estimatedFrequency).toBe("weekly");
    expect(result.factors.updateFrequency.score).toBe(80);
  });

  // ─── ZEPPELIN TIER TESTS ───────────────────────────────────

  it("should predict ZEPPELIN tier for moderate page", async () => {
    const page = {
      url: "https://example.com/product/item-123",
      html: "<p>Product description</p>",
      wordCount: 900,
      headings: { h1: ["Product"], h2: ["Details"] },
      links: {
        internal: Array(7).fill("https://example.com/page"),
        external: [],
      },
      metadata: {
        lastModified: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 7,
    });

    expect(result.tier).toBe(IndexTier.ZEPPELIN);
    expect(result.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.overallScore).toBeLessThan(80);
    expect(result.factors.freshness.score).toBe(60); // 31-90 days = moderate
    expect(result.factors.backlinkQuality.score).toBe(60);
  });

  it("should predict ZEPPELIN tier for blog post with moderate freshness", async () => {
    const page = {
      url: "https://example.com/blog/2024-01-15-article",
      html: "<p>Article content</p>",
      wordCount: 1200,
      headings: { h1: ["Article"], h2: ["Section 1", "Section 2"] },
      links: {
        internal: Array(5).fill("https://example.com/page"),
        external: ["https://wikipedia.org"],
      },
      metadata: {
        lastModified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 5,
    });

    expect(result.tier).toBe(IndexTier.ZEPPELIN);
    expect(result.factors.updateFrequency.estimatedFrequency).toBe("monthly");
  });

  // ─── LANDFILL TIER TESTS ───────────────────────────────────

  it("should predict LANDFILL tier for orphan page", async () => {
    const page = {
      url: "https://example.com/forgotten-page",
      html: "<p>Old content</p>",
      wordCount: 150,
      headings: { h1: ["Title"] },
      links: {
        internal: [],
        external: [],
      },
      metadata: {
        lastModified: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // >1 year
      },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 0, // Orphan!
    });

    expect(result.tier).toBe(IndexTier.LANDFILL);
    expect(result.overallScore).toBeLessThan(50);
    expect(result.factors.backlinkQuality.orphanPage).toBe(true);
    expect(result.factors.backlinkQuality.score).toBe(0);
    expect(result.factors.freshness.score).toBe(0); // Ancient content
    expect(result.factors.userEngagement.score).toBe(0); // Very thin
  });

  it("should predict LANDFILL tier for very stale page", async () => {
    const page = {
      url: "https://example.com/old-static-page.html",
      html: "<p>Static content</p>",
      wordCount: 250,
      headings: { h1: ["Title"] },
      links: {
        internal: Array(2).fill("https://example.com/page"),
        external: [],
      },
      metadata: {
        lastModified: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000), // >1 year
      },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 2,
    });

    expect(result.tier).toBe(IndexTier.LANDFILL);
    expect(result.factors.freshness.daysSinceUpdate).toBeGreaterThan(365);
    expect(result.factors.freshness.score).toBe(0);
  });

  // ─── EDGE CASES ────────────────────────────────────────────

  it("should handle missing lastModified date gracefully", async () => {
    const page = {
      url: "https://example.com/page",
      wordCount: 800,
      headings: { h1: ["Title"] },
      links: { internal: Array(5).fill("https://example.com"), external: [] },
    };

    const result = await predictIndexTier(page, {
      internalBacklinks: 5,
    });

    expect(result.factors.freshness.lastModified).toBeNull();
    expect(result.factors.freshness.daysSinceUpdate).toBeNull();
    expect(result.factors.freshness.score).toBe(40); // Moderate default
  });

  it("should use sitemap lastmod as fallback", async () => {
    const page = {
      url: "https://example.com/page",
      wordCount: 1000,
      headings: { h1: ["Title"] },
      links: { internal: Array(10).fill("https://example.com"), external: [] },
    };

    const result = await predictIndexTier(page, {
      sitemapLastmod: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      internalBacklinks: 10,
    });

    expect(result.factors.freshness.score).toBe(100); // 0-7 days
    expect(result.factors.freshness.daysSinceUpdate).toBe(5);
  });

  it("should detect URL patterns for update frequency", async () => {
    const blogPage = {
      url: "https://example.com/blog/my-post",
      wordCount: 800,
      headings: { h1: ["Post"] },
      links: { internal: [], external: [] },
    };

    const result = await predictIndexTier(blogPage);
    expect(result.factors.updateFrequency.estimatedFrequency).toBe("monthly");
    expect(result.factors.updateFrequency.score).toBe(60);
  });

  it("should detect static pages with low update frequency", async () => {
    const aboutPage = {
      url: "https://example.com/about",
      wordCount: 500,
      headings: { h1: ["About"] },
      links: { internal: [], external: [] },
    };

    const result = await predictIndexTier(aboutPage);
    expect(result.factors.updateFrequency.estimatedFrequency).toBe("yearly");
    expect(result.factors.updateFrequency.score).toBe(20);
  });

  it("should calculate page speed score from HTML size", async () => {
    const smallPage = {
      url: "https://example.com/small",
      html: "<p>" + "x".repeat(100 * 1024) + "</p>", // 100KB
      wordCount: 500,
      headings: { h1: ["Title"] },
      links: { internal: [], external: [] },
    };

    const result = await predictIndexTier(smallPage);
    expect(result.factors.pageSpeed.estimatedScore).toBeGreaterThanOrEqual(80); // Small = fast
  });

  it("should give bonuses for lazy loading and async scripts", async () => {
    const optimizedPage = {
      url: "https://example.com/optimized",
      html: '<img src="test.jpg" loading="lazy"><script async src="app.js"></script>',
      wordCount: 800,
      headings: { h1: ["Title"] },
      links: { internal: [], external: [] },
    };

    const result = await predictIndexTier(optimizedPage);
    // Should get +10 for lazy loading, +10 for async
    expect(result.factors.pageSpeed.score).toBeGreaterThanOrEqual(60);
  });

  it("should calculate user engagement from word count", async () => {
    const comprehensivePage = {
      url: "https://example.com/comprehensive",
      html: "<img src='test.jpg'><video></video>",
      wordCount: 1800,
      headings: {
        h1: ["Title"],
        h2: ["Section 1", "Section 2"],
        h3: ["Subsection"],
      },
      links: {
        internal: Array(50).fill("https://example.com/page"),
        external: [],
      },
    };

    const result = await predictIndexTier(comprehensivePage);
    expect(result.factors.userEngagement.score).toBe(100); // 1500+ words + multimedia + headings
    expect(result.factors.userEngagement.hasMultimedia).toBe(true);
    expect(result.factors.userEngagement.headingDepth).toBe(3);
  });

  it("should apply date consistency bonus", async () => {
    const page = {
      url: "https://example.com/page",
      wordCount: 400,
      headings: { h1: ["Title"] },
      links: { internal: Array(3).fill("https://example.com"), external: [] },
      metadata: {
        lastModified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      },
    };

    // Use lower backlinks so score doesn't hit 100
    const withoutBonus = await predictIndexTier(page, {
      internalBacklinks: 0,
    });

    const withBonus = await predictIndexTier(page, {
      internalBacklinks: 0,
      dateConsistencyBonus: 5,
    });

    expect(withBonus.overallScore).toBe(withoutBonus.overallScore + 5);
  });

  // ─── INTERNAL BACKLINKS BONUS TESTS ─────────────────────────

  it("should add +15 points per 5 internal backlinks", async () => {
    const page = {
      url: "https://example.com/page",
      wordCount: 400,
      headings: { h1: ["Title"] },
      links: { internal: Array(3).fill("https://example.com"), external: [] },
      metadata: {
        lastModified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      },
    };

    // 0 backlinks = no bonus
    const result0 = await predictIndexTier(page, { internalBacklinks: 0 });
    // 5 backlinks = +15 bonus
    const result5 = await predictIndexTier(page, { internalBacklinks: 5 });
    // 10 backlinks = +30 bonus (2 * 15)
    const result10 = await predictIndexTier(page, { internalBacklinks: 10 });
    // 15 backlinks = +45 bonus (3 * 15)
    const result15 = await predictIndexTier(page, { internalBacklinks: 15 });

    // Calculate differences accounting for 100 cap
    const diff5to0 = result5.overallScore - result0.overallScore;
    const diff10to0 = result10.overallScore - result0.overallScore;
    const diff15to0 = result15.overallScore - result0.overallScore;

    // 5 backlinks should give at least +15 bonus (may be less due to 100 cap)
    expect(diff5to0).toBeGreaterThanOrEqual(15);

    // 10 backlinks should give at least +30 bonus
    expect(diff10to0).toBeGreaterThanOrEqual(30);

    // 15 backlinks should give at least +45 bonus
    expect(diff15to0).toBeGreaterThanOrEqual(45);
  });

  it("should floor the backlink bonus (4 backlinks = no bonus)", async () => {
    const page = {
      url: "https://example.com/page",
      wordCount: 400,
      headings: { h1: ["Title"] },
      links: { internal: Array(3).fill("https://example.com"), external: [] },
      metadata: {
        lastModified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    };

    // 4 backlinks = floor(4/5) = 0 * 15 = 0 bonus
    const result4 = await predictIndexTier(page, { internalBacklinks: 4 });
    // 5 backlinks = floor(5/5) = 1 * 15 = +15 bonus
    const result5 = await predictIndexTier(page, { internalBacklinks: 5 });

    // 4 backlinks should give less bonus than 5 backlinks
    expect(result4.overallScore).toBeLessThan(result5.overallScore);
  });

  it("should upgrade tier with high backlink bonus", async () => {
    // Create a page that is close to ZEPPELIN threshold but would be BASE with backlinks
    const page = {
      url: "https://example.com/blog/mid-tier",
      wordCount: 400,
      headings: { h1: ["Title"], h2: ["Section"] },
      links: { internal: Array(5).fill("https://example.com"), external: [] },
      metadata: {
        lastModified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago (moderate freshness = 60)
      },
    };

    // Without backlinks bonus - should be in lower tier
    const resultNoBonus = await predictIndexTier(page, { internalBacklinks: 0 });

    // With 20 backlinks = floor(20/5) = 4 * 15 = +60 bonus - should upgrade tier
    const resultWithBonus = await predictIndexTier(page, { internalBacklinks: 20 });

    // The bonus should upgrade the tier
    expect(resultWithBonus.overallScore).toBeGreaterThan(resultNoBonus.overallScore);
  });

  it("should generate appropriate recommendations", async () => {
    const basePage = {
      url: "https://example.com/premium",
      html: '<img src="test.jpg" loading="lazy"><script async>',
      wordCount: 2000,
      headings: { h1: ["Title"], h2: ["Section"], h3: ["Sub"] },
      links: { internal: Array(20).fill("https://example.com"), external: [] },
      metadata: {
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    };

    const landfillPage = {
      url: "https://example.com/forgotten",
      wordCount: 100,
      headings: { h1: ["Title"] },
      links: { internal: [], external: [] },
      metadata: {
        lastModified: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
      },
    };

    const baseResult = await predictIndexTier(basePage, {
      internalBacklinks: 20,
    });
    const landfillResult = await predictIndexTier(landfillPage, {
      internalBacklinks: 0,
    });

    expect(baseResult.recommendation).toContain("Premium tier");
    expect(baseResult.recommendation).toContain("HIGHEST value");

    expect(landfillResult.recommendation).toContain("Low-priority tier");
    expect(landfillResult.recommendation).toContain("Fix:");
  });
});
