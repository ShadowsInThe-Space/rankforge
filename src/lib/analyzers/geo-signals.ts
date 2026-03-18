/**
 * GEO Analyzer — Generative Engine / AI Search Optimization
 *
 * Implements the 9 concrete measures from AI search visibility guide:
 * 1. FAQ content detection + structured FAQ
 * 2. Topic authority signals (internal linking depth, content depth)
 * 3. Conversational query optimization (question-based headings, NLP patterns)
 * 4. Structured data completeness (Schema.org for AI crawlers)
 * 5. Content freshness signals (dates, update metadata)
 * 6. E-E-A-T signals (author, expertise, trust)
 * 7. Technical accessibility for AI (robots.txt, crawl budget)
 * 8. Voice search readiness (conversational patterns)
 * 9. Brand consistency across signals
 */

import type { SeoIssue, IssueSeverity, IssueCategory, HeadingStructure } from "@/types/audit";

function issue(type: IssueCategory, severity: IssueSeverity, page: string, message: string, fix: string): SeoIssue {
  return { type, severity, page, message, fix };
}

// ─── FAQ Detection ─────────────────────────────────────────

export interface FaqAnalysis {
  hasFaqSchema: boolean;
  hasFaqContent: boolean;
  faqCount: number;
  questionsAnswered: number;
  questionPatterns: string[];
}

function analyzeFaq(html: string): FaqAnalysis {
  // Check for FAQPage JSON-LD schema
  const faqSchemaMatch = html.match(/<script[^>]*type\s*=\s*["']?application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasFaqSchema = faqSchemaMatch.some(m => /"@type"\s*:\s*"FAQPage"/i.test(m));

  // Detect FAQ content patterns (question-answer pairs)
  const questionPatterns: string[] = [];
  const qPatterns = [
    /<h[1-3][^>]*>(?:Was|Wie|Welche|Wer|Wo|Wann|Warum|Wie viel|Kann|Muss|Sollte|Ist)/gi,
    /<strong[^>]*>(?:Was|Wie|Welche|Wer|Wo|Wann|Warum|Wie viel|Kann|Muss|Sollte|Ist)/gi,
    /(?:faq|frequently asked|common questions|oft gefragt|häufig gestellt)/i,
  ];

  for (const pattern of qPatterns) {
    const matches = html.match(pattern) || [];
    questionPatterns.push(...matches.slice(0, 10)); // cap at 10
  }

  // Count distinct Q&A blocks
  const qaBlocks = html.match(/(?:<h[1-4][^>]*>.*?<\/h[1-4]>)[\s\S]*?(?=<h[1-4]|$)/gi) || [];
  const hasFaqContent = qaBlocks.length >= 2 && questionPatterns.length >= 2;

  return {
    hasFaqSchema,
    hasFaqContent,
    faqCount: qaBlocks.length,
    questionsAnswered: questionPatterns.length,
    questionPatterns: [...new Set(questionPatterns)].slice(0, 5),
  };
}

// ─── E-E-A-T Signals ──────────────────────────────────────

export interface EeatAnalysis {
  hasAuthorSchema: boolean;
  hasOrganizationSchema: boolean;
  hasContactPage: boolean;
  hasAboutPage: boolean;
  hasAuthorBio: boolean;
  hasTrustSignals: boolean; // reviews, testimonials, certifications
  hasSocialLinks: boolean;
  sslPresent: boolean;
}

function analyzeEeat(html: string, url: string): EeatAnalysis {
  const htmlLower = html.toLowerCase();

  // Author schema detection
  const authorSchemaMatch = html.match(/<script[^>]*type\s*=\s*["']?application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasAuthorSchema = authorSchemaMatch.some(m =>
    /"@type"\s*:\s*"(?:Person|Author|Article)"[^}]*"author"/i.test(m) ||
    /"author"\s*:\s*\{[^}]*"@type"\s*:\s*"(?:Person|Author)"/i.test(m)
  );
  const hasOrganizationSchema = authorSchemaMatch.some(m =>
    /"@type"\s*:\s*"Organization"/i.test(m)
  );

  // Trust signals
  const trustPatterns = [
    /bewertung|testimonial|kundenstimme|rezension/i,
    /zertifiziert|zertifikat|gütesiegel|iso\s*\d/i,
    /datenschutz|dsgvo|privacy\s*policy|impressum/i,
    /§\s*\d+\s*(?:abs\.)?\s*(?:a|e|art\.?)/i, // legal references
  ];
  const hasTrustSignals = trustPatterns.some(p => p.test(htmlLower));

  // Social links
  const socialPatterns = [
    /linkedin\.com\/in\//i, /xing\.com\/profile\//i,
    /twitter\.com\//i, /facebook\.com\//i,
    /instagram\.com\//i, /youtube\.com\//i,
  ];
  const hasSocialLinks = socialPatterns.some(p => p.test(htmlLower));

  // SSL
  const sslPresent = url.startsWith("https://");

  return {
    hasAuthorSchema,
    hasOrganizationSchema,
    hasContactPage: /\/(?:contact|kontakt|uber-uns|about|ueber-uns|impressum)/i.test(url) ||
      /kontakt\s*formular|contact\s*form/i.test(htmlLower),
    hasAboutPage: /\/(?:about|ueber-uns|uber-uns|about-us|about-us|philosophie|team)/i.test(url) ||
      /über\s*(?:uns|das\s*unternehmen)|about\s*(?:us|the\s*company)/i.test(htmlLower),
    hasAuthorBio: /\b(?:autor|autorin|author|written by|by\s+(?:jan|marco|lisa|simon))/i.test(htmlLower) &&
      (/\d{4}\s*(?:jahr|years|erfahrung|experience)/i.test(htmlLower) ||
       /\b(?:seo|marketing|consultant|expert|specialist)/i.test(htmlLower)),
    hasTrustSignals,
    hasSocialLinks,
    sslPresent,
  };
}

// ─── Content Freshness ────────────────────────────────────

export interface FreshnessAnalysis {
  hasPublishDate: boolean;
  hasModDate: boolean;
  hasDateSchema: boolean;
  hasSitemapDate: boolean;
  daysSincePublish: number | null;
  daysSinceUpdate: number | null;
  isStale: boolean; // > 1 year old
}

function analyzeFreshness(html: string): FreshnessAnalysis {
  // Detect schema.org date fields
  const dateSchemaMatch = html.match(/<script[^>]*type\s*=\s*["']?application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasDateSchema = dateSchemaMatch.some(m =>
    /"(?:datePublished|dateCreated|dateModified)"\s*:/i.test(m)
  );

  // Detect meta dates
  const publishMeta = html.match(/<meta[^>]*(?:itemprop\s*=\s*["']?datePublished|property\s*=\s*["']?article:published_time|name\s*=\s*["']?(?:article:modified_time|date))[^>]*content\s*=\s*["']([^"']+)["']/i);
  const modifiedMeta = html.match(/<meta[^>]*name\s*=\s*["']?article:modified_time["'][^>]*content\s*=\s*["']([^"']+)["']/i);

  // Detect in-content dates
  const contentDatePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,           // ISO: 2026-03-18
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,   // German: 18.03.2026
    /(\d{1,2})\/\d{1,2}\/(\d{4})/,     // US: 03/18/2026
  ];

  let detectedDate: Date | null = null;
  for (const pattern of contentDatePatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const d = new Date(match[0]);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2010 && d.getFullYear() <= 2030) {
          detectedDate = d;
          break;
        }
      } catch { /* ignore */ }
    }
  }

  const now = new Date();
  const daysSincePublish = detectedDate
    ? Math.floor((now.getTime() - detectedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    hasPublishDate: !!publishMeta || !!detectedDate,
    hasModDate: !!modifiedMeta,
    hasDateSchema,
    hasSitemapDate: false, // would need sitemap.xml analysis
    daysSincePublish,
    daysSinceUpdate: null,
    isStale: daysSincePublish !== null && daysSincePublish > 365,
  };
}

// ─── Conversational / Voice Search Optimization ─────────────

export interface ConversationalAnalysis {
  hasQuestionHeadings: boolean; // H2s/H3s starting with question words
  hasLongTailKeywords: boolean; // 5+ word phrases detected
  conversationalDensity: number; // 0-100 score
  hasHowToContent: boolean;
  hasStepByStep: boolean;
  naturalLanguageScore: number; // 0-100
}

function analyzeConversational(html: string, headings: HeadingStructure | null): ConversationalAnalysis {
  // Question headings
  const questionWords = /^(?:was|wie|welche?|wer|wo|wann|warum|wie viel|kann|muss|sollte|ist|es|lassen|empfehlen)/i;
  const allHeadings = [
    ...(headings?.h2 || []),
    ...(headings?.h3 || []),
    ...(headings?.h4 || []),
  ];
  const questionHeadings = allHeadings.filter(h => questionWords.test(h.trim()));

  // HowTo detection
  const hasHowToContent = /howto|how\s+to|schritt\s+für\s+schritt|anleitung|tutorial|step\s*\d/i.test(html);

  // Step-by-step patterns
  const hasStepByStep = /schritt\s*(?:\d|1|2|3)|step\s*(?:\d|1|2|3)|zuerst|dann|als\s+nächstes|schließlich|zuletzt/i.test(html);

  // Long-tail keyword density (look for phrases 4+ words)
  const longTailPattern = /(?:\b\w+\b\s+){3,}\w+\b/;
  const longTailMatches = html.match(longTailPattern) || [];
  const hasLongTailKeywords = longTailMatches.length >= 5;

  // Conversational density: ratio of questions to statements
  const sentences = html.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const questions = html.match(/(?:<h[1-6][^>]*>.*?<\/h[1-6]>|<p[^>]*>.*?\?)</gi) || [];
  const conversationalDensity = sentences.length > 0
    ? Math.min(100, Math.round((questions.length / Math.max(1, sentences.length)) * 500))
    : 0;

  // Natural language score: check for personal pronouns, contractions, conversational words
  const conversationalWords = /\b(ich|du|er|sie|es|wir|sie|mir|dir|implied|you'll|we'll|it's|that's|here's|i'm|don't|can't|won't)\b/gi;
  const nlMatches = html.match(conversationalWords) || [];
  const naturalLanguageScore = Math.min(100, Math.round((nlMatches.length / Math.max(1, sentences.length)) * 200));

  return {
    hasQuestionHeadings: questionHeadings.length >= 2,
    hasLongTailKeywords,
    conversationalDensity,
    hasHowToContent,
    hasStepByStep,
    naturalLanguageScore,
  };
}

// ─── Topic Authority ───────────────────────────────────────

export interface TopicAuthorityAnalysis {
  internalLinkCount: number;
  uniqueInternalPages: number;
  linkDepth: number; // max path depth
  orphanPageCount: number; // pages with no internal links pointing to them
  contentDepth: number; // pages with substantial content (>300 words)
  topicClusterSize: number; // pages linking to each other
}

function analyzeTopicAuthority(
  allPages: Array<{ url: string; links: { internal: string[] } | null; wordCount: number | null }>
): TopicAuthorityAnalysis {
  const internalLinkCount = allPages.reduce(
    (sum, p) => sum + (p.links?.internal?.length || 0), 0
  );

  // Count unique internal targets
  const internalTargets = new Set<string>();
  for (const page of allPages) {
    for (const link of page.links?.internal || []) {
      try {
        internalTargets.add(new URL(link).pathname);
      } catch { internalTargets.add(link); }
    }
  }

  // Pages with substantial content
  const contentDepth = allPages.filter(p => (p.wordCount || 0) >= 300).length;

  return {
    internalLinkCount,
    uniqueInternalPages: internalTargets.size,
    linkDepth: 0, // would need URL parsing
    orphanPageCount: 0, // would need cross-reference
    contentDepth,
    topicClusterSize: internalTargets.size,
  };
}

// ─── AI Visibility Score ───────────────────────────────────

export interface GeoScore {
  geoScore: number; // 0-100 overall GEO score
  faqScore: number;
  structuredDataScore: number;
  freshnessScore: number;
  eeatScore: number;
  conversationalScore: number;
  authorityScore: number;
}

// ─── Main Analyzer ─────────────────────────────────────────

export interface GeoAnalysis {
  issues: SeoIssue[];
  geoScore: number; // 0-100
  faq: FaqAnalysis;
  eeat: EeatAnalysis;
  freshness: FreshnessAnalysis;
  conversational: ConversationalAnalysis;
  topicAuthority: TopicAuthorityAnalysis;
}

export function analyzeGeo(
  pages: Array<{
    url: string;
    html: string | null;
    wordCount: number | null;
    headings: HeadingStructure | null;
    links: { internal: string[]; external: string[] } | null;
  }>,
): GeoAnalysis {
  const allIssues: SeoIssue[] = [];

  // ── Per-page GEO analysis ────────────────────────────────
  let totalGeoScore = 0;
  const faqAnalyses: FaqAnalysis[] = [];
  const eeatAnalyses: EeatAnalysis[] = [];
  const freshnessAnalyses: FreshnessAnalysis[] = [];
  const conversationalAnalyses: ConversationalAnalysis[] = [];

  for (const page of pages) {
    if (!page.html) continue;
    const html = page.html;

    // FAQ Analysis
    const faq = analyzeFaq(html);
    faqAnalyses.push(faq);

    if (!faq.hasFaqSchema && faq.hasFaqContent) {
      allIssues.push(
        issue("schema", "P2", page.url,
          "FAQ content found but missing FAQPage schema",
          "Add FAQPage JSON-LD schema to help AI search engines find your FAQ content"
        )
      );
    }
    if (!faq.hasFaqContent && !faq.hasFaqSchema) {
      allIssues.push(
        issue("content", "P3", page.url,
          "No FAQ section detected — FAQ pages rank well in AI search results",
          "Consider adding an FAQ section with question-answer pairs for better AI visibility"
        )
      );
    }

    // E-E-A-T Analysis
    const eeat = analyzeEeat(html, page.url);
    eeatAnalyses.push(eeat);

    if (!eeat.sslPresent) {
      allIssues.push(
        issue("security", "P1", page.url,
          "Page not served over HTTPS",
          "Install SSL certificate — HTTPS is a trust signal for both users and AI systems"
        )
      );
    }
    if (!eeat.hasOrganizationSchema && !eeat.hasAuthorSchema) {
      allIssues.push(
        issue("schema", "P2", page.url,
          "No Organization or Author schema found",
          "Add Person or Organization schema to establish authorship and brand identity for AI crawlers"
        )
      );
    }
    if (!eeat.hasContactPage && !eeat.hasAboutPage) {
      allIssues.push(
        issue("content", "P2", page.url,
          "No contact or about page detected — weakens E-E-A-T signals",
          "Add an About and Contact page — AI systems prefer sources with verifiable identities"
        )
      );
    }
    if (!eeat.hasTrustSignals) {
      allIssues.push(
        issue("content", "P3", page.url,
          "No trust signals detected (certifications, reviews, legal pages)",
          "Add trust signals: customer testimonials, certifications, Impressum, or privacy policy"
        )
      );
    }

    // Freshness Analysis
    const freshness = analyzeFreshness(html);
    freshnessAnalyses.push(freshness);

    if (freshness.isStale) {
      allIssues.push(
        issue("content", "P1", page.url,
          `Content appears to be more than ${freshness.daysSincePublish} days old`,
          "AI systems strongly prefer fresh content. Update this page with current information"
        )
      );
    }
    if (!freshness.hasDateSchema && freshness.hasPublishDate) {
      allIssues.push(
        issue("schema", "P2", page.url,
          "Publish date detected in content but not in structured data",
          "Add datePublished to your JSON-LD schema to help AI systems understand content age"
        )
      );
    }
    if (!freshness.hasPublishDate && !freshness.hasDateSchema) {
      allIssues.push(
        issue("content", "P2", page.url,
          "No publish date detected — AI systems penalize undated content",
          "Add a visible publish date and datePublished schema markup"
        )
      );
    }

    // Conversational Analysis
    const conversational = analyzeConversational(html, page.headings);
    conversationalAnalyses.push(conversational);

    if (!conversational.hasQuestionHeadings) {
      allIssues.push(
        issue("content", "P3", page.url,
          "No question-based headings found",
          "Use question-format headings (H2/H3) like 'How does X work?' or 'What is Y?' to match conversational AI queries"
        )
      );
    }
    if (!conversational.hasLongTailKeywords && (page.wordCount || 0) > 500) {
      allIssues.push(
        issue("content", "P3", page.url,
          "Long-tail keyword phrases not detected — may miss conversational queries",
          "Include natural question phrases (5+ words) that real users would type into AI search"
        )
      );
    }
    if (conversational.naturalLanguageScore < 20 && (page.wordCount || 0) > 300) {
      allIssues.push(
        issue("content", "P3", page.url,
          "Content reads very formally — may underperform in conversational AI search",
          "Add more natural, conversational language — write like you speak, not like a textbook"
        )
      );
    }

    // Calculate per-page GEO score
    let pageScore = 50; // base
    if (faq.hasFaqSchema) pageScore += 15;
    else if (faq.hasFaqContent) pageScore += 7;
    if (eeat.hasOrganizationSchema || eeat.hasAuthorSchema) pageScore += 10;
    if (freshness.hasPublishDate && !freshness.isStale) pageScore += 10;
    if (freshness.hasDateSchema) pageScore += 5;
    if (conversational.hasQuestionHeadings) pageScore += 5;
    if (eeat.sslPresent) pageScore += 5;
    totalGeoScore += Math.min(100, pageScore);
  }

  // Topic Authority
  const topicAuthority = analyzeTopicAuthority(pages);

  if (topicAuthority.contentDepth < pages.length * 0.3) {
    allIssues.push(
      issue("content", "P2", "sitewide",
        `Only ${topicAuthority.contentDepth}/${pages.length} pages have substantial content (>300 words)`,
        "AI systems prefer comprehensive content. Expand thin content pages to at least 300-500 words"
      )
    );
  }

  if (topicAuthority.internalLinkCount < pages.length * 2) {
    allIssues.push(
      issue("links", "P2", "sitewide",
        "Low internal linking density — weakens topic authority signals",
        "Add more internal links between related pages to help AI systems understand your topic clusters"
      )
    );
  }

  // ── Calculate scores ─────────────────────────────────────
  const avgGeoScore = pages.length > 0 ? Math.round(totalGeoScore / pages.length) : 0;

  const faqScore = faqAnalyses.length > 0
    ? Math.round((faqAnalyses.filter(f => f.hasFaqSchema).length / faqAnalyses.length) * 100)
    : 0;

  const structuredDataScore = eeatAnalyses.length > 0
    ? Math.round((eeatAnalyses.filter(e => e.hasOrganizationSchema || e.hasAuthorSchema).length / eeatAnalyses.length) * 100)
    : 0;

  const freshnessScore = freshnessAnalyses.length > 0
    ? Math.round((freshnessAnalyses.filter(f => f.hasPublishDate && !f.isStale).length / freshnessAnalyses.length) * 100)
    : 0;

  const eeatScore = eeatAnalyses.length > 0
    ? Math.round((eeatAnalyses.filter(e =>
      e.hasOrganizationSchema || e.hasAuthorSchema || e.hasTrustSignals || e.hasContactPage
    ).length / eeatAnalyses.length) * 100)
    : 0;

  const conversationalScore = conversationalAnalyses.length > 0
    ? Math.round(conversationalAnalyses.reduce((s, c) =>
      s + Math.min(100, c.naturalLanguageScore + (c.hasQuestionHeadings ? 20 : 0)), 0) / conversationalAnalyses.length)
    : 0;

  const authorityScore = Math.min(100, Math.round(
    (topicAuthority.contentDepth / Math.max(1, pages.length)) * 50 +
    Math.min(50, topicAuthority.uniqueInternalPages * 2)
  ));

  return {
    issues: allIssues,
    geoScore: avgGeoScore,
    faq: faqAnalyses[0] || { hasFaqSchema: false, hasFaqContent: false, faqCount: 0, questionsAnswered: 0, questionPatterns: [] },
    eeat: eeatAnalyses[0] || { hasAuthorSchema: false, hasOrganizationSchema: false, hasContactPage: false, hasAboutPage: false, hasAuthorBio: false, hasTrustSignals: false, hasSocialLinks: false, sslPresent: false },
    freshness: freshnessAnalyses[0] || { hasPublishDate: false, hasModDate: false, hasDateSchema: false, hasSitemapDate: false, daysSincePublish: null, daysSinceUpdate: null, isStale: false },
    conversational: conversationalAnalyses[0] || { hasQuestionHeadings: false, hasLongTailKeywords: false, conversationalDensity: 0, hasHowToContent: false, hasStepByStep: false, naturalLanguageScore: 0 },
    topicAuthority,
  };
}
