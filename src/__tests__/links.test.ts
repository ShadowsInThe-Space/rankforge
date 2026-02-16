import { describe, it, expect } from "vitest";
import { analyzeLinkGraph } from "../lib/analyzers/links";

describe("Link Graph Analyzer", () => {
  const homepage = "https://example.com";

  it("should detect orphan pages (no incoming links)", () => {
    const pages = [
      { url: "https://example.com/", links: { internal: ["https://example.com/about"], external: [] } },
      { url: "https://example.com/about", links: { internal: [], external: [] } },
      { url: "https://example.com/orphan", links: { internal: [], external: [] } },
    ];

    const result = analyzeLinkGraph(pages, [], homepage);
    // Orphan page hat keine eingehenden Links (ausser Homepage)
    const orphanNormalized = result.orphanPages.map((u) => u.toLowerCase().replace(/\/+$/, ""));
    expect(orphanNormalized).toContain("https://example.com/orphan");
  });

  it("should detect dead-end pages (no outgoing links)", () => {
    const pages = [
      { url: "https://example.com/", links: { internal: ["https://example.com/dead"], external: [] } },
      { url: "https://example.com/dead", links: { internal: [], external: [] } },
    ];

    const result = analyzeLinkGraph(pages, [], homepage);
    const deadEndNormalized = result.deadEndPages.map((u) => u.toLowerCase().replace(/\/+$/, ""));
    expect(deadEndNormalized).toContain("https://example.com/dead");
  });

  it("should calculate crawl depth via BFS", () => {
    const pages = [
      { url: "https://example.com/", links: { internal: ["https://example.com/level1"], external: [] } },
      { url: "https://example.com/level1", links: { internal: ["https://example.com/level2"], external: [] } },
      { url: "https://example.com/level2", links: { internal: [], external: [] } },
    ];

    const result = analyzeLinkGraph(pages, [], homepage);
    expect(result.maxCrawlDepth).toBeGreaterThanOrEqual(2);
  });

  it("should calculate sitemap coverage", () => {
    const pages = [
      { url: "https://example.com/", links: { internal: [], external: [] } },
      { url: "https://example.com/about", links: { internal: [], external: [] } },
    ];
    const mapUrls = [
      "https://example.com/",
      "https://example.com/about",
      "https://example.com/missing",
    ];

    const result = analyzeLinkGraph(pages, mapUrls, homepage);
    // 2 of 3 map URLs were crawled
    expect(result.sitemapCoverage).toBeCloseTo(2 / 3, 1);
  });

  it("should produce graph nodes and edges", () => {
    const pages = [
      { url: "https://example.com/", links: { internal: ["https://example.com/a"], external: [] } },
      { url: "https://example.com/a", links: { internal: ["https://example.com/"], external: [] } },
    ];

    const result = analyzeLinkGraph(pages, [], homepage);
    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBeGreaterThanOrEqual(2);
  });
});
