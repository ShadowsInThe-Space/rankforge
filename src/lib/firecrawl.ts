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

/**
 * Supported formats for Firecrawl scrape operations
 * Based on Firecrawl v2.x API
 */
export type FirecrawlFormat = 
  | "markdown"
  | "html"
  | "rawHtml"
  | "links"
  | "screenshot"
  | "screenshot@fullPage"
  | "extract"
  | "json"
  | "summary"
  | "changeTracking"
  | "branding";

/**
 * Scrape options for fine-grained control
 */
export interface FirecrawlScrapeOptions {
  formats?: FirecrawlFormat[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
}

/**
 * Extract options for AI-structured extraction
 */
export interface FirecrawlExtractOptions {
  schema: Record<string, unknown>;
  prompt?: string;
  enableSmartTruncation?: boolean;
}

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
   * Verwendet standardmäßig rawHtml für vollständige HTML-Analyse
   */
  async crawl(
    url: string,
    options: {
      limit?: number;
      scrapeOptions?: FirecrawlScrapeOptions;
    } = {}
  ): Promise<FirecrawlCrawlResult> {
    // Standard-Formate: rawHtml enthält <head> für Meta-Tag-Analyse
    const defaultFormats: FirecrawlFormat[] = ["markdown", "rawHtml", "links"];
    
    return this.request<FirecrawlCrawlResult>("/v1/crawl", {
      method: "POST",
      body: JSON.stringify({
        url,
        limit: options.limit ?? 100,
        scrapeOptions: options.scrapeOptions ?? {
          formats: defaultFormats,
        },
      }),
    });
  }

  /**
   * Legacy-Kompatibilität: Crawl mit alten Optionen
   */
  async crawlLegacy(
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
   * Einzelseite scrapen mit erweiterten Optionen
   * Unterstützt alle Firecrawl v2.x Formate
   */
  async scrape(
    url: string,
    options: {
      formats?: FirecrawlFormat[];
      scrapeOptions?: FirecrawlScrapeOptions;
      extract?: FirecrawlExtractOptions;
    } = {}
  ): Promise<{ success: boolean; data: FirecrawlPageData }> {
    const body: Record<string, unknown> = { url };
    
    if (options.formats) {
      body.formats = options.formats;
    }
    
    if (options.scrapeOptions) {
      body.scrapeOptions = options.scrapeOptions;
    }
    
    if (options.extract) {
      body.extract = options.extract;
    }

    return this.request<{ success: boolean; data: FirecrawlPageData }>(
      "/v1/scrape",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  }

  /**
   * Legacy-Kompatibilität: Einfaches Scrapen mit Formaten
   */
  async scrapeSimple(
    url: string,
    formats: FirecrawlFormat[] = ["markdown", "html", "links"]
  ): Promise<{ success: boolean; data: FirecrawlPageData }> {
    return this.scrape(url, { formats });
  }

  /**
   * Einzelne Seite mit rawHtml scrapen (inkl. <head>)
   * Nützlich für technische SEO-Analyse
   */
  async scrapeFullHtml(
    url: string
  ): Promise<{ success: boolean; data: FirecrawlPageData }> {
    return this.scrape(url, {
      formats: ["markdown", "rawHtml", "links"],
    });
  }

  /**
   * Einzelne Seite mit Screenshot scrapen
   * Für visuelle Analyse
   */
  async scrapeWithScreenshot(
    url: string,
    fullPage: boolean = false
  ): Promise<{ success: boolean; data: FirecrawlPageData & { screenshot?: string } }> {
    const format = fullPage ? "screenshot@fullPage" : "screenshot";
    return this.scrape(url, {
      formats: ["markdown", format as FirecrawlFormat],
    }) as Promise<{ success: boolean; data: FirecrawlPageData & { screenshot?: string } }>;
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
   * @param jobId - The crawl job ID to wait for
   * @param onProgress - Callback for progress updates (status, elapsedMs)
   * @param pollInterval - How often to check status (default 5s)
   * @param timeoutMs - Maximum time to wait (default 3 minutes)
   */
  async waitForCrawl(
    jobId: string,
    onProgress?: (status: FirecrawlCrawlStatus, elapsedMs: number) => void,
    pollInterval: number = 5000,
    timeoutMs: number = 3 * 60 * 1000 // 3 minute default
  ): Promise<FirecrawlCrawlStatus> {
    const startTime = Date.now();
    
    while (true) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        const status = await this.crawlStatus(jobId);
        return {
          ...status,
          status: "timeout",
          statusNotes: `Timed out after ${elapsed}ms`
        };
      }
      
      const status = await this.crawlStatus(jobId);

      if (onProgress) {
        onProgress(status, elapsed);
      }

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }
      
      if (status.status === "timeout") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}

// Singleton-Export
export const firecrawl = new FirecrawlClient();
export { FirecrawlClient };
