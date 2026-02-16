import { describe, it, expect } from "vitest";
import { calculateScore } from "../lib/analyzers/scoring";
import type { TechnicalAnalysis, LinkGraphAnalysis, ContentAnalysis } from "@/types/audit";

function makeMinimalTechnical(overrides: Partial<TechnicalAnalysis> = {}): TechnicalAnalysis {
  return {
    issues: [],
    stats: { totalPages: 10, pagesWithIssues: 0, p0Count: 0, p1Count: 0, p2Count: 0 },
    ...overrides,
  };
}

function makeMinimalLinks(overrides: Partial<LinkGraphAnalysis> = {}): LinkGraphAnalysis {
  return {
    nodes: Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/page${i}`,
      internalIncoming: 2,
      internalOutgoing: 3,
      externalOutgoing: 1,
      crawlDepth: 1,
    })),
    edges: [],
    orphanPages: [],
    deadEndPages: [],
    avgInternalLinks: 3,
    maxCrawlDepth: 2,
    sitemapCoverage: 1.0,
    ...overrides,
  };
}

function makeMinimalContent(overrides: Partial<Omit<ContentAnalysis, "benchmarks">> = {}): Omit<ContentAnalysis, "benchmarks"> {
  return {
    pages: [],
    avgWordCount: 500,
    thinContentPages: [],
    contentTypeDistribution: { homepage: 1, blog: 5, other: 4 } as Record<string, number>,
    ...overrides,
  };
}

describe("SEO Score Calculator", () => {
  it("should return perfect score for clean site", () => {
    const score = calculateScore(
      makeMinimalTechnical(),
      makeMinimalLinks(),
      makeMinimalContent()
    );

    expect(score.overall).toBeGreaterThanOrEqual(80);
    expect(score.technical).toBeGreaterThanOrEqual(80);
    expect(score.content).toBeGreaterThanOrEqual(50);
    expect(score.links).toBeGreaterThanOrEqual(50);
  });

  it("should penalize P0 issues heavily", () => {
    const cleanScore = calculateScore(
      makeMinimalTechnical(),
      makeMinimalLinks(),
      makeMinimalContent()
    );

    const badScore = calculateScore(
      makeMinimalTechnical({ stats: { totalPages: 10, pagesWithIssues: 5, p0Count: 3, p1Count: 0, p2Count: 0 } }),
      makeMinimalLinks(),
      makeMinimalContent()
    );

    expect(badScore.technical).toBeLessThan(cleanScore.technical);
    expect(badScore.overall).toBeLessThan(cleanScore.overall);
  });

  it("should penalize orphan pages", () => {
    const goodScore = calculateScore(
      makeMinimalTechnical(),
      makeMinimalLinks(),
      makeMinimalContent()
    );

    const badScore = calculateScore(
      makeMinimalTechnical(),
      makeMinimalLinks({ orphanPages: ["a", "b", "c", "d", "e"] }),
      makeMinimalContent()
    );

    expect(badScore.links).toBeLessThan(goodScore.links);
  });

  it("should clamp scores between 0 and 100", () => {
    const score = calculateScore(
      makeMinimalTechnical({ stats: { totalPages: 10, pagesWithIssues: 10, p0Count: 20, p1Count: 20, p2Count: 20 } }),
      makeMinimalLinks({ orphanPages: Array(50).fill("x") }),
      makeMinimalContent({ thinContentPages: Array(50).fill("x"), avgWordCount: 10 })
    );

    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.technical).toBeGreaterThanOrEqual(0);
    expect(score.content).toBeGreaterThanOrEqual(0);
    expect(score.links).toBeGreaterThanOrEqual(0);
  });
});
