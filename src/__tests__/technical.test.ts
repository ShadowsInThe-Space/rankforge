import { describe, it, expect } from "vitest";
import { analyzeTechnicalSeo } from "../lib/analyzers/technical";

function makePage(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://example.com/page",
    statusCode: 200,
    title: "Example Page Title",
    description: "A good meta description that is long enough.",
    h1: "Main Heading",
    wordCount: 500,
    markdown: "Some content here ".repeat(30),
    html: '<html><head><title>Example Page Title</title><meta name="description" content="A good meta description that is long enough."><link rel="canonical" href="https://example.com/page"><meta property="og:title" content="Example"><meta property="og:description" content="Desc"></head><body><h1>Main Heading</h1><p>Content</p></body></html>',
    links: { internal: ["https://example.com/other"], external: [] },
    headings: { h1: ["Main Heading"], h2: ["Sub"], h3: [], h4: [], h5: [], h6: [] },
    ...overrides,
  };
}

describe("Technical SEO Analyzer", () => {
  it("should return no issues for a well-formed page", () => {
    const result = analyzeTechnicalSeo([makePage()]);
    expect(result.stats.totalPages).toBe(1);
    // Gut geformte Seite hat wenige oder keine Issues
    expect(result.stats.p0Count).toBe(0);
  });

  it("should detect 4xx status codes (P0)", () => {
    const result = analyzeTechnicalSeo([makePage({ statusCode: 404 })]);
    const statusIssues = result.issues.filter(
      (i) => i.type === "status" && i.severity === "P0"
    );
    expect(statusIssues.length).toBeGreaterThan(0);
  });

  it("should detect 5xx status codes (P0)", () => {
    const result = analyzeTechnicalSeo([makePage({ statusCode: 500 })]);
    const statusIssues = result.issues.filter(
      (i) => i.type === "status" && i.severity === "P0"
    );
    expect(statusIssues.length).toBeGreaterThan(0);
  });

  it("should detect duplicate titles (P0)", () => {
    const result = analyzeTechnicalSeo([
      makePage({ url: "https://example.com/a", title: "Same Title" }),
      makePage({ url: "https://example.com/b", title: "Same Title" }),
    ]);
    const dupeIssues = result.issues.filter(
      (i) => i.severity === "P0" && i.message.toLowerCase().includes("dupli")
    );
    expect(dupeIssues.length).toBeGreaterThan(0);
  });

  it("should detect missing meta description (P1)", () => {
    const result = analyzeTechnicalSeo([
      makePage({ description: null }),
    ]);
    const metaIssues = result.issues.filter(
      (i) => i.type === "meta" && i.severity === "P1"
    );
    expect(metaIssues.length).toBeGreaterThan(0);
  });

  it("should detect title too short (P1)", () => {
    const result = analyzeTechnicalSeo([makePage({ title: "Hi" })]);
    const titleIssues = result.issues.filter(
      (i) => i.type === "title" && i.severity === "P1"
    );
    expect(titleIssues.length).toBeGreaterThan(0);
  });

  it("should detect title too long (P1)", () => {
    const result = analyzeTechnicalSeo([
      makePage({ title: "A".repeat(70) }),
    ]);
    const titleIssues = result.issues.filter(
      (i) => i.type === "title" && i.severity === "P1"
    );
    expect(titleIssues.length).toBeGreaterThan(0);
  });

  it("should detect thin content (P1)", () => {
    const result = analyzeTechnicalSeo([makePage({ wordCount: 50 })]);
    const contentIssues = result.issues.filter(
      (i) => i.type === "content" && i.severity === "P1"
    );
    expect(contentIssues.length).toBeGreaterThan(0);
  });

  it("should detect URL too long (P2)", () => {
    const longUrl = "https://example.com/" + "a".repeat(200);
    const result = analyzeTechnicalSeo([makePage({ url: longUrl })]);
    const urlIssues = result.issues.filter(
      (i) => i.severity === "P2" && i.message.toLowerCase().includes("url")
    );
    expect(urlIssues.length).toBeGreaterThan(0);
  });

  it("should count issues correctly in stats", () => {
    const result = analyzeTechnicalSeo([
      makePage({ statusCode: 404 }), // P0
      makePage({ url: "https://example.com/b", title: "Hi", wordCount: 50 }), // P1 + P1
    ]);
    expect(result.stats.totalPages).toBe(2);
    expect(result.stats.p0Count).toBeGreaterThan(0);
    expect(result.stats.p1Count).toBeGreaterThan(0);
  });
});
