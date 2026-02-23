// tests/analyzers/date-consistency.test.ts

import { describe, it, expect } from "vitest";
import { analyzeDateConsistency } from "@/lib/analyzers/date-consistency";
import type { FirecrawlPageData } from "@/types/audit";

describe("Date Consistency Analyzer", () => {
  it("should detect perfect consistency", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/2024-02-21-post",
        title: "My Post - February 21, 2024",
      },
      html: `
        <script type="application/ld+json">
        {
          "@type": "Article",
          "datePublished": "2024-02-21"
        }
        </script>
        <time datetime="2024-02-21">February 21, 2024</time>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.score).toBe(100);
    expect(result.conflicts).toHaveLength(0);
    expect(result.recommendation).toContain("Perfect date consistency");
  });

  it("should detect HIGH severity conflict (URL vs. structured data)", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/2024-01-15-post",
        title: "My Post",
      },
      html: `
        <script type="application/ld+json">
        {
          "@type": "Article",
          "datePublished": "2024-02-21"
        }
        </script>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].severity).toBe("HIGH");
    expect(result.score).toBeLessThan(100);
    expect(result.recommendation).toContain("Critical");
  });

  it("should detect MEDIUM severity conflict (byline vs. structured data)", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Post",
      },
      html: `
        <script type="application/ld+json">
        {
          "@type": "Article",
          "datePublished": "2024-02-21"
        }
        </script>
        <time datetime="2024-01-15">January 15, 2024</time>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].severity).toBe("MEDIUM");
    expect(result.score).toBeLessThan(100);
  });

  it("should extract date from URL pattern YYYY/MM/DD", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/2024/02/21/my-awesome-post",
        title: "My Post",
      },
      html: "",
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.urlDate.found).toBe(true);
    expect(result.dates.urlDate.date).toBeInstanceOf(Date);
    expect(result.dates.urlDate.date?.getFullYear()).toBe(2024);
    expect(result.dates.urlDate.date?.getMonth()).toBe(1); // February (0-indexed)
    expect(result.dates.urlDate.date?.getDate()).toBe(21);
  });

  it("should extract date from URL pattern YYYY-MM-DD", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/articles/2024-12-25-christmas",
        title: "My Post",
      },
      html: "",
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.urlDate.found).toBe(true);
    expect(result.dates.urlDate.date?.getFullYear()).toBe(2024);
    expect(result.dates.urlDate.date?.getMonth()).toBe(11); // December
    expect(result.dates.urlDate.date?.getDate()).toBe(25);
  });

  it("should extract date from page title", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Awesome Post - February 21, 2024",
      },
      html: "",
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.titleDate.found).toBe(true);
    expect(result.dates.titleDate.text).toBe("February 21, 2024");
    expect(result.dates.titleDate.date).toBeInstanceOf(Date);
  });

  it("should extract date from JSON-LD structured data", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Post",
      },
      html: `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "datePublished": "2024-02-21T10:00:00Z",
          "headline": "My Post"
        }
        </script>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.structuredData.found).toBe(true);
    expect(result.dates.structuredData.schema).toBe("BlogPosting");
    expect(result.dates.structuredData.date).toBeInstanceOf(Date);
  });

  it("should extract date from @graph array in JSON-LD", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Post",
      },
      html: `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "name": "Example"
            },
            {
              "@type": "Article",
              "datePublished": "2024-02-21",
              "headline": "My Post"
            }
          ]
        }
        </script>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.structuredData.found).toBe(true);
    expect(result.dates.structuredData.schema).toBe("Article");
  });

  it("should extract date from <time> element", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Post",
      },
      html: `
        <article>
          <time datetime="2024-02-21T15:30:00+01:00" class="entry-date">
            21. Februar 2024
          </time>
        </article>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.bylineDate.found).toBe(true);
    expect(result.dates.bylineDate.selector).toBe("time[datetime]");
    expect(result.dates.bylineDate.date).toBeInstanceOf(Date);
  });

  it("should handle sitemap lastmod date", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Post",
      },
      html: "",
    };

    const result = await analyzeDateConsistency(page, {
      sitemapLastmod: "2024-02-21T12:00:00Z",
    });

    expect(result.dates.sitemapDate.found).toBe(true);
    expect(result.dates.sitemapDate.date).toBeInstanceOf(Date);
    expect(result.dates.sitemapDate.lastmod).toBe("2024-02-21T12:00:00Z");
  });

  it("should calculate correct discrepancy days", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/2024-01-01-post",
        title: "My Post",
      },
      html: `
        <script type="application/ld+json">
        {
          "@type": "Article",
          "datePublished": "2024-02-01"
        }
        </script>
      `,
    };

    const result = await analyzeDateConsistency(page);

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].discrepancyDays).toBe(31); // Jan 1 → Feb 1
  });

  it("should ignore minor discrepancies (<7 days)", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/2024-02-21-post",
        title: "My Post",
      },
      html: `
        <script type="application/ld+json">
        {
          "@type": "Article",
          "datePublished": "2024-02-23"
        }
        </script>
      `,
    };

    const result = await analyzeDateConsistency(page);

    // 2 days difference = no conflict
    expect(result.conflicts).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it("should handle missing dates gracefully", async () => {
    const page: FirecrawlPageData = {
      metadata: {
        sourceURL: "https://example.com/blog/my-post",
        title: "My Post",
      },
      html: "<p>No dates here!</p>",
    };

    const result = await analyzeDateConsistency(page);

    expect(result.dates.structuredData.found).toBe(false);
    expect(result.dates.urlDate.found).toBe(false);
    expect(result.dates.titleDate.found).toBe(false);
    expect(result.dates.bylineDate.found).toBe(false);
    expect(result.dates.ogDate.found).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.score).toBe(100); // No conflicts = perfect score
  });
});

describe("Date Consistency - OG and Meta Tags", () => {
  it("should extract date from og:updated_time", async () => {
    const page: FirecrawlPageData = {
      metadata: { sourceURL: "https://example.com/page" },
      html: `<meta property="og:updated_time" content="2024-06-15T10:00:00+00:00">`,
    };
    const result = await analyzeDateConsistency(page);
    expect(result.dates.ogDate.found).toBe(true);
  });

  it("should extract date from article:published_time", async () => {
    const page: FirecrawlPageData = {
      metadata: { sourceURL: "https://example.com/page" },
      html: `<meta property="article:published_time" content="2024-03-20">`,
    };
    const result = await analyzeDateConsistency(page);
    expect(result.dates.ogDate.found).toBe(true);
  });

  it("should prefer og:updated_time over article:published_time", async () => {
    const page: FirecrawlPageData = {
      metadata: { sourceURL: "https://example.com/page" },
      html: `
        <meta property="og:updated_time" content="2024-06-15">
        <meta property="article:published_time" content="2024-03-20">
      `,
    };
    const result = await analyzeDateConsistency(page);
    expect(result.dates.ogDate.found).toBe(true);
    expect(result.dates.ogDate.date?.getFullYear()).toBe(2024);
    expect(result.dates.ogDate.date?.getMonth()).toBe(5); // June
  });

  it("should return ogDate as undefined when no OG tags present", async () => {
    const page: FirecrawlPageData = {
      metadata: { sourceURL: "https://example.com/page" },
      html: `<p>No OG tags here</p>`,
    };
    const result = await analyzeDateConsistency(page);
    expect(result.dates.ogDate.found).toBe(false);
  });
});
