import type {
  LinkGraphAnalysis,
  LinkNode,
  ExternalBacklinkAnalysis,
  ExternalBacklinkPage,
  ExternalLink,
  AnchorTextAnalysis,
  LinkQualityMetrics,
} from "@/types/audit";

interface PageInput {
  url: string;
  links?: { internal: string[]; external: string[] } | null;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

export function analyzeLinkGraph(
  pages: PageInput[],
  mapUrls: string[],
  homepageUrl: string,
): LinkGraphAnalysis {
  const normalizedHomepage = normalizeUrl(homepageUrl);
  const normalizedMapUrls = new Set(mapUrls.map(normalizeUrl));

  // Build adjacency list and track all known crawled URLs
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  const externalOutCount = new Map<string, number>();
  const crawledUrls = new Set<string>();
  const edges: Array<{ source: string; target: string }> = [];

  for (const page of pages) {
    const sourceUrl = normalizeUrl(page.url);
    crawledUrls.add(sourceUrl);

    if (!outgoing.has(sourceUrl)) {
      outgoing.set(sourceUrl, new Set());
    }
    if (!incoming.has(sourceUrl)) {
      incoming.set(sourceUrl, new Set());
    }

    if (!page.links) {
      externalOutCount.set(sourceUrl, 0);
      continue;
    }

    const internalLinks = page.links.internal.map(normalizeUrl);
    const externalLinks = page.links.external;

    externalOutCount.set(sourceUrl, externalLinks.length);

    for (const target of internalLinks) {
      if (target === sourceUrl) continue; // skip self-links

      outgoing.get(sourceUrl)!.add(target);

      if (!incoming.has(target)) {
        incoming.set(target, new Set());
      }
      incoming.get(target)!.add(sourceUrl);

      edges.push({ source: sourceUrl, target });
    }
  }

  // BFS from homepage to compute crawl depth
  const crawlDepth = new Map<string, number>();
  crawlDepth.set(normalizedHomepage, 0);
  const queue: string[] = [normalizedHomepage];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const currentDepth = crawlDepth.get(current)!;
    const neighbors = outgoing.get(current);

    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (!crawlDepth.has(neighbor)) {
        crawlDepth.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  // Build nodes
  const nodes: LinkNode[] = [];
  let totalInternalOutgoing = 0;

  for (const url of crawledUrls) {
    const incomingCount = incoming.get(url)?.size ?? 0;
    const outgoingCount = outgoing.get(url)?.size ?? 0;
    const externalOut = externalOutCount.get(url) ?? 0;
    const depth = crawlDepth.get(url) ?? -1;

    totalInternalOutgoing += outgoingCount;

    nodes.push({
      url,
      internalIncoming: incomingCount,
      internalOutgoing: outgoingCount,
      externalOutgoing: externalOut,
      crawlDepth: depth,
    });
  }

  // Orphan pages: no incoming internal links (except homepage)
  const orphanPages = nodes
    .filter(
      (node) =>
        node.url !== normalizedHomepage && node.internalIncoming === 0,
    )
    .map((node) => node.url);

  // Dead-end pages: no outgoing internal links
  const deadEndPages = nodes
    .filter((node) => node.internalOutgoing === 0)
    .map((node) => node.url);

  // Average internal links per page
  const avgInternalLinks =
    crawledUrls.size > 0 ? totalInternalOutgoing / crawledUrls.size : 0;

  // Max crawl depth
  const depthValues = Array.from(crawlDepth.values());
  const maxCrawlDepth =
    depthValues.length > 0 ? Math.max(...depthValues) : 0;

  // Sitemap coverage: how many map URLs were actually crawled
  const sitemapCoverage =
    normalizedMapUrls.size > 0
      ? Array.from(normalizedMapUrls).filter((url) => crawledUrls.has(url))
          .length / normalizedMapUrls.size
      : 0;

  return {
    nodes,
    edges,
    orphanPages,
    deadEndPages,
    avgInternalLinks: Math.round(avgInternalLinks * 100) / 100,
    maxCrawlDepth,
    sitemapCoverage: Math.round(sitemapCoverage * 100) / 100,
  };
}

// ─── External Backlink Analysis ─────────────────────────────
// Analyzes external links from crawled pages (anchor text, quality, etc.)

interface PageWithHtml {
  url: string;
  html: string;
  links?: { internal: string[]; external: string[] } | null;
}

export function analyzeExternalBacklinks(pages: PageWithHtml[]): ExternalBacklinkAnalysis {
  const externalBacklinkPages: ExternalBacklinkPage[] = [];
  const allExternalLinks: ExternalLink[] = [];
  const uniqueDomains = new Set<string>();

  for (const page of pages) {
    if (!page.html) continue;

    const externalLinks = extractExternalLinksFromHtml(page.html, page.url);
    
    if (externalLinks.length > 0) {
      externalBacklinkPages.push({
        url: page.url,
        externalLinks,
        totalExternalLinks: externalLinks.length,
      });

      for (const link of externalLinks) {
        allExternalLinks.push(link);
        
        // Extract domain for unique count
        try {
          const linkUrl = new URL(link.url);
          uniqueDomains.add(linkUrl.hostname);
        } catch {
          // Invalid URL, skip
        }
      }
    }
  }

  // Calculate anchor text distribution
  const anchorText = analyzeAnchorText(allExternalLinks.map(l => l.text));

  // Calculate link quality metrics
  const linkQuality = calculateLinkQuality(allExternalLinks);

  // Calculate totals
  const totalExternalLinks = allExternalLinks.length;
  const pagesWithExternalLinks = externalBacklinkPages.length;
  const avgExternalLinksPerPage = pages.length > 0 
    ? Math.round((totalExternalLinks / pages.length) * 100) / 100 
    : 0;

  return {
    totalExternalLinks,
    uniqueDomains: uniqueDomains.size,
    pagesWithExternalLinks,
    avgExternalLinksPerPage,
    linkQuality,
    anchorText,
    pages: externalBacklinkPages,
  };
}

// Extract external links with anchor text and attributes from HTML
function extractExternalLinksFromHtml(html: string, baseUrl: string): ExternalLink[] {
  const links: ExternalLink[] = [];
  
  // Match all anchor tags with their attributes
  const anchorRegex = /<a\s+([^>]*)>(.*?)<\/a>/gi;
  let match;
  
  const baseDomain = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return '';
    }
  })();

  while ((match = anchorRegex.exec(html)) !== null) {
    const attributes = match[1];
    const anchorText = match[2].replace(/<[^>]*>/g, '').trim(); // Remove nested tags
    
    // Extract href
    const hrefMatch = attributes.match(/href=["']([^"']+)["']/);
    if (!hrefMatch) continue;
    
    const href = hrefMatch[1];
    
    // Skip internal links
    try {
      const fullUrl = new URL(href, baseUrl);
      if (fullUrl.hostname === baseDomain || fullUrl.hostname.endsWith(`.${baseDomain}`)) {
        continue; // Internal link
      }
    } catch {
      continue; // Invalid URL
    }

    // Extract rel attribute
    const relMatch = attributes.match(/rel=["']([^"']+)["']/);
    const rel = relMatch ? relMatch[1].split(/\s+/) : [];
    
    // Determine if do-follow
    const isDoFollow = !rel.includes('nofollow') && !rel.includes('sponsored') && !rel.includes('ugc');

    links.push({
      url: href.startsWith('http') ? href : new URL(href, baseUrl).href,
      text: anchorText || '(image)', // Empty anchor often means image
      rel,
      isDoFollow,
    });
  }

  return links;
}

// Analyze anchor text distribution
function analyzeAnchorText(anchors: string[]): AnchorTextAnalysis {
  const distribution: Record<string, number> = {};
  let exactMatch = 0;
  let partialMatch = 0;
  let branded = 0;
  let naked = 0;
  let generic = 0;
  let image = 0;

  for (const anchor of anchors) {
    const lower = anchor.toLowerCase();
    
    // Skip empty anchors (image links)
    if (!anchor || anchor === '(image)') {
      image++;
      distribution['image'] = (distribution['image'] || 0) + 1;
      continue;
    }

    // Exact match: exact keyword match (simplified - would need keyword context)
    // For now, we'll categorize based on patterns
    if (lower.match(/^(https?:|www\.)/)) {
      naked++;
      distribution['naked'] = (distribution['naked'] || 0) + 1;
    } else if (lower.match(/^(click here|here|link|this|more|read more|learn more)$/)) {
      generic++;
      distribution['generic'] = (distribution['generic'] || 0) + 1;
    } else if (lower.split(/\s+/).length > 3) {
      partialMatch++;
      distribution['partial'] = (distribution['partial'] || 0) + 1;
    } else if (lower.match(/^[a-z0-9]+(\s[a-z0-9]+)?$/)) {
      exactMatch++;
      distribution['exact'] = (distribution['exact'] || 0) + 1;
    } else {
      branded++; // Multiple words that aren't exact keywords
      distribution['branded'] = (distribution['branded'] || 0) + 1;
    }
  }

  return {
    exactMatch,
    partialMatch,
    branded,
    naked,
    generic,
    image,
    totalAnchors: anchors.length,
    distribution,
  };
}

// Calculate link quality metrics
function calculateLinkQuality(
  links: ExternalLink[]
): LinkQualityMetrics {
  let doFollow = 0;
  let noFollow = 0;
  let sponsored = 0;
  let ugc = 0;
  let megaSites = 0;
  let socialMedia = 0;
  let news = 0;
  let eduGov = 0;

  const megaSiteDomains = ['wikipedia.org', 'youtube.com', 'github.com', 'stackoverflow.com', 'reddit.com'];
  const socialMediaDomains = ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'reddit.com'];
  const newsDomains = ['bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'forbes.com'];

  for (const link of links) {
    // Count follow types
    if (link.isDoFollow) {
      doFollow++;
    } else {
      noFollow++;
    }

    if (link.rel.includes('sponsored')) sponsored++;
    if (link.rel.includes('ugc')) ugc++;

    // Categorize by domain type
    try {
      const linkUrl = new URL(link.url);
      const hostname = linkUrl.hostname.toLowerCase();

      if (megaSiteDomains.some(d => hostname.includes(d))) megaSites++;
      if (socialMediaDomains.some(d => hostname.includes(d))) socialMedia++;
      if (newsDomains.some(d => hostname.includes(d))) news++;
if (hostname.endsWith('.edu') || hostname.endsWith('.gov')) eduGov++;
    } catch {
      // Invalid URL
    }
  }

  return {
    doFollow,
    noFollow,
    sponsored,
    ugc,
    megaSites,
    socialMedia,
    news,
    eduGov,
  };
}

// Score external backlinks
export function scoreExternalBacklinks(analysis: ExternalBacklinkAnalysis): number {
  let score = 100;

  // Note: totalExternalLinks could be used for more granular scoring in future
  
  // Penalty for too many external links (could be link farming)
  if (analysis.avgExternalLinksPerPage > 10) {
    score -= Math.min(20, (analysis.avgExternalLinksPerPage - 10) * 2);
  }

  // Bonus for having some external links (sign of authority)
  if (analysis.pagesWithExternalLinks > 0) {
    const ratio = analysis.pagesWithExternalLinks / 10; // Assume ~10 pages
    if (ratio > 0.3) {
      score += Math.min(10, Math.round(ratio * 15));
    }
  }

  // Quality checks
  const { linkQuality, anchorText } = analysis;
  
  // Penalty for too many nofollow (not passing link equity)
  if (linkQuality.noFollow > linkQuality.doFollow * 2) {
    score -= 15;
  }

  // Bonus for diverse anchor text
  const uniqueAnchors = Object.keys(anchorText.distribution).length;
  if (uniqueAnchors >= 4) {
    score += 5;
  }

  // Penalty for too many generic anchors
  if (anchorText.generic / anchorText.totalAnchors > 0.3) {
    score -= 10;
  }

  // Bonus for mega sites / authoritative sources
  if (linkQuality.megaSites > 0 || linkQuality.eduGov > 0) {
    score += Math.min(10, linkQuality.megaSites * 2 + linkQuality.eduGov * 3);
  }

  return Math.max(0, Math.min(100, score));
}
