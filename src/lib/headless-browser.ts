// src/lib/headless-browser.ts
import { chromium, type Browser, type Page } from 'playwright';

let browser: Browser | null = null;

/**
 * Initialize the browser instance (singleton)
 */
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

/**
 * Capture full HTML including <head> section using headless browser
 * This complements Firecrawl which only captures <body>
 */
export async function captureFullPageHtml(url: string): Promise<{
  html: string;
  title: string;
  description: string | null;
  canonical: string | null;
  ogTags: Record<string, string>;
  metaTags: Record<string, string>;
} | null> {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    // Navigate with networkidle to ensure page is fully loaded
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    if (!response || response.status() >= 400) {
      console.warn(`Failed to load ${url}: ${response?.status()}`);
      return null;
    }

    // Get the full HTML including <head>
    const html = await page.content();

    // Extract metadata from <head>
    const title = await page.title();

    const description = await page.$eval(
      'meta[name="description"]',
      (el) => el.getAttribute('content'),
    ).catch(() => null);

    const canonical = await page.$eval(
      'link[rel="canonical"]',
      (el) => el.getAttribute('href'),
    ).catch(() => null);

    // Extract OG tags
    const ogTags: Record<string, string> = {};
    const ogMetaElements = await page.$$('meta[property^="og:"]');
    for (const el of ogMetaElements) {
      const property = await el.getAttribute('property');
      const content = await el.getAttribute('content');
      if (property && content) {
        ogTags[property] = content;
      }
    }

    // Extract other meta tags
    const metaTags: Record<string, string> = {};
    const metaElements = await page.$$('meta[name]');
    for (const el of metaElements) {
      const name = await el.getAttribute('name');
      const content = await el.getAttribute('content');
      if (name && content) {
        metaTags[name] = content;
      }
    }

    return {
      html,
      title,
      description,
      canonical,
      ogTags,
      metaTags,
    };
  } catch (error) {
    console.error(`Error capturing ${url}:`, error);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Capture metadata from multiple URLs in parallel
 */
export async function captureMultiplePages(
  urls: string[],
  concurrency = 5
): Promise<Map<string, Awaited<ReturnType<typeof captureFullPageHtml>> | undefined>> {
  const results = new Map<string, Awaited<ReturnType<typeof captureFullPageHtml>> | undefined>();

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const promises = batch.map(async (url) => {
      const data = await captureFullPageHtml(url);
      return { url, data };
    });

    const batchResults = await Promise.all(promises);
    for (const { url, data } of batchResults) {
      results.set(url, data ?? undefined);
    }
  }

  return results;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
