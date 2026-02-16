import type { LinkGraphAnalysis, LinkNode } from "@/types/audit";

interface PageInput {
  url: string;
  links: { internal: string[]; external: string[] } | null;
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
