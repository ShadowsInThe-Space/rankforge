import { describe, it, expect } from "vitest";
import { analyzeContent } from "../lib/analyzers/content";

describe("Content Intelligence Analyzer", () => {
  it("should classify homepage correctly", () => {
    const result = analyzeContent([
      {
        url: "https://example.com/",
        wordCount: 500,
        markdown: "Welcome to our site ".repeat(25),
        headings: { h1: ["Welcome"], h2: ["About", "Services"], h3: [], h4: [], h5: [], h6: [] },
        links: { internal: ["https://example.com/about"], external: ["https://google.com"] },
      },
    ]);

    expect(result.pages[0].contentType).toBe("homepage");
    expect(result.pages[0].wordCount).toBe(500);
  });

  it("should classify blog URLs correctly", () => {
    const result = analyzeContent([
      {
        url: "https://example.com/blog/my-post",
        wordCount: 800,
        markdown: "Blog content ".repeat(60),
        headings: { h1: ["My Post"], h2: [], h3: [], h4: [], h5: [], h6: [] },
        links: null,
      },
    ]);

    expect(result.pages[0].contentType).toBe("blog");
  });

  it("should detect thin content pages", () => {
    const result = analyzeContent([
      {
        url: "https://example.com/thin",
        wordCount: 50,
        markdown: "Short page.",
        headings: null,
        links: null,
      },
      {
        url: "https://example.com/good",
        wordCount: 1000,
        markdown: "Long content ".repeat(80),
        headings: null,
        links: null,
      },
    ]);

    expect(result.thinContentPages).toContain("https://example.com/thin");
    expect(result.thinContentPages).not.toContain("https://example.com/good");
  });

  it("should calculate average word count", () => {
    const result = analyzeContent([
      { url: "https://example.com/a", wordCount: 100, markdown: null, headings: null, links: null },
      { url: "https://example.com/b", wordCount: 300, markdown: null, headings: null, links: null },
    ]);

    expect(result.avgWordCount).toBe(200);
  });

  it("should calculate link ratio correctly", () => {
    const result = analyzeContent([
      {
        url: "https://example.com/",
        wordCount: 500,
        markdown: null,
        headings: null,
        links: { internal: ["a", "b", "c"], external: ["x", "y"] },
      },
    ]);

    expect(result.pages[0].internalLinkCount).toBe(3);
    expect(result.pages[0].externalLinkCount).toBe(2);
    expect(result.pages[0].linkRatio).toBeCloseTo(3 / 5);
  });

  it("should compute content type distribution", () => {
    const result = analyzeContent([
      { url: "https://example.com/", wordCount: 500, markdown: null, headings: null, links: null },
      { url: "https://example.com/blog/a", wordCount: 500, markdown: null, headings: null, links: null },
      { url: "https://example.com/blog/b", wordCount: 500, markdown: null, headings: null, links: null },
    ]);

    expect(result.contentTypeDistribution.homepage).toBe(1);
    expect(result.contentTypeDistribution.blog).toBe(2);
  });
});
