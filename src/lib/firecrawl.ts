import type {
  FirecrawlMapResult,
  FirecrawlCrawlResult,
  FirecrawlCrawlStatus,
  FirecrawlPageData,
  FirecrawlSearchResult,
} from "@/types/audit";

// Export alias for analyzers
export type FirecrawlPage = FirecrawlPageData;

const FIRECRAWL_URL = process.env.FIRECRAWL_API_URL || "http://localhost:3002";

class FirecrawlClient {
  private baseUrl: string;

  constructor(baseUrl: string = FIRECRAWL_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Firecrawl ${endpoint} failed (${res.status}): ${body}`
      );
    }

    return res.json() as Promise<T>;
  }

  /**
   * Schnelle URL-Discovery via Sitemap + Link-Crawling
   */
  async map(url: string): Promise<FirecrawlMapResult> {
    return this.request<FirecrawlMapResult>("/v1/map", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Full-Domain-Crawl starten - gibt Job-ID zurück
   */
  async crawl(
    url: string,
    options: {
      limit?: number;
      scrapeOptions?: {
        formats?: string[];
        includeTags?: string[];
        excludeTags?: string[];
      };
    } = {}
  ): Promise<FirecrawlCrawlResult> {
    return this.request<FirecrawlCrawlResult>("/v1/crawl", {
      method: "POST",
      body: JSON.stringify({
        url,
        limit: options.limit ?? 100,
        scrapeOptions: options.scrapeOptions ?? {
          formats: ["markdown", "html", "links"],
        },
      }),
    });
  }

  /**
   * Crawl-Status abfragen (pollen)
   */
  async crawlStatus(jobId: string): Promise<FirecrawlCrawlStatus> {
    return this.request<FirecrawlCrawlStatus>(`/v1/crawl/${jobId}`);
  }

  /**
   * Einzelseite scrapen
   */
  async scrape(
    url: string,
    formats: string[] = ["markdown", "html", "links"]
  ): Promise<{ success: boolean; data: FirecrawlPageData }> {
    return this.request<{ success: boolean; data: FirecrawlPageData }>(
      "/v1/scrape",
      {
        method: "POST",
        body: JSON.stringify({ url, formats }),
      }
    );
  }

  /**
   * SERP-Suche via DuckDuckGo
   */
  async search(
    query: string,
    options: {
      limit?: number;
      scrapeOptions?: { formats?: string[] };
    } = {}
  ): Promise<FirecrawlSearchResult> {
    return this.request<FirecrawlSearchResult>("/v1/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        limit: options.limit ?? 5,
        scrapeOptions: options.scrapeOptions,
      }),
    });
  }

  /**
   * AI-gestützte strukturierte Extraktion
   */
  async extract<T = Record<string, unknown>>(
    urls: string[],
    schema: Record<string, unknown>,
    prompt?: string
  ): Promise<{ success: boolean; data: T }> {
    return this.request<{ success: boolean; data: T }>("/v1/extract", {
      method: "POST",
      body: JSON.stringify({
        urls,
        schema,
        prompt,
      }),
    });
  }

  /**
   * Crawl-Status pollen bis Completion
   */
  async waitForCrawl(
    jobId: string,
    onProgress?: (status: FirecrawlCrawlStatus) => void,
    pollInterval: number = 5000
  ): Promise<FirecrawlCrawlStatus> {
    while (true) {
      const status = await this.crawlStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}

// Singleton-Export
export const firecrawl = new FirecrawlClient();
export { FirecrawlClient };
