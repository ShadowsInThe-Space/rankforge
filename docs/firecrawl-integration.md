# Firecrawl Integration - RankForge

## Overview

This document describes the Firecrawl integration in RankForge and the new capabilities available with Firecrawl v2.x.

## Updated: March 2026

### New Features Available

1. **`rawHtml` Format** - Returns complete HTML including `<head>` section with meta tags
2. **Enhanced TypeScript Types** - Full type support for all new formats
3. **Convenience Methods** - Helper methods for common use cases

## API Changes

### Updated Default Formats

The crawl now uses `rawHtml` instead of `html` by default:

```typescript
// Before (v1.x)
formats: ["markdown", "html", "links"]

// After (v2.x) 
formats: ["markdown", "rawHtml", "links"]
```

**Benefit:** `rawHtml` includes the `<head>` section with all meta tags (title, description, canonical, OpenGraph, etc.), which is critical for SEO analysis. Previously, we needed a separate headless browser step to get this data.

### New Type Definitions

```typescript
export type FirecrawlFormat = 
  | "markdown"
  | "html"
  | "rawHtml"      // NEW: Full HTML including <head>
  | "links"
  | "screenshot"           // NEW
  | "screenshot@fullPage"  // NEW
  | "extract"              // NEW: AI extraction
  | "json"                 // NEW
  | "summary"              // NEW
  | "changeTracking"       // NEW
  | "branding";            // NEW
```

### New Interface

```typescript
interface FirecrawlScrapeOptions {
  formats?: FirecrawlFormat[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
}

interface FirecrawlExtractOptions {
  schema: Record<string, unknown>;
  prompt?: string;
  enableSmartTruncation?: boolean;
}
```

## Usage Examples

### Basic Scrape
```typescript
const result = await firecrawl.scrapeSimple(url, ["markdown", "rawHtml", "links"]);
```

### Scrape with Full HTML (including `<head>`)
```typescript
const result = await firecrawl.scrapeFullHtml(url);
// Returns: { markdown, rawHtml, links, metadata }
```

### Scrape with Screenshot
```typescript
const result = await firecrawl.scrapeWithScreenshot(url, true);
// Second param: fullPage (true = capture entire page)
```

### Custom Scrape Options
```typescript
const result = await firecrawl.scrape(url, {
  formats: ["markdown", "rawHtml"],
  scrapeOptions: {
    onlyMainContent: true,
    waitFor: 1000,
  }
});
```

### AI-Structured Extraction
```typescript
const result = await firecrawl.extract(
  [url],
  {
    type: "object",
    properties: {
      title: { type: "string" },
      price: { type: "number" }
    }
  },
  "Extract product information"
);
```

## Impact on Audit Pipeline

### Before
1. Firecrawl crawl → markdown, html (body only), links
2. Headless browser capture → full HTML with `<head>` for meta tags
3. Parse meta tags from headless browser output

### After
1. Firecrawl crawl → markdown, **rawHtml** (includes `<head>`), links
2. Headless browser → **Fallback only** if rawHtml fails
3. Parse meta tags directly from rawHtml

**Result:** Faster audits, reduced complexity, fewer dependencies.

## Testing

### Quick Test
```bash
# Test rawHtml format
curl -X POST http://localhost:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["rawHtml"]}'
```

### Test Crawl with new formats
```bash
curl -X POST http://localhost:3002/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scrapeOptions": {"formats": ["markdown", "rawHtml", "links"]}}'
```

## Backward Compatibility

- `firecrawl.crawlLegacy()` - Original behavior with `html` format
- `firecrawl.scrapeSimple()` - Original behavior with formats array
- Main methods automatically use new `rawHtml` format

## Notes

- The `extract` format requires additional configuration and may not work in all cases
- `screenshot` format requires JavaScript rendering and may fail on some sites
- `summary` format is experimental and may return errors
