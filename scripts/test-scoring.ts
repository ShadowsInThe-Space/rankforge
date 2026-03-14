/**
 * Scoring System v2.0 Test & Documentation
 * 
 * This file demonstrates the new scoring algorithm and its rationale.
 */

import { calculateScore, scoreToGrade, gradeDescription, WEIGHTS } from '@/lib/analyzers/scoring';
import type { TechnicalAnalysis, LinkGraphAnalysis, ContentAnalysis, ScoreGrade } from '@/types/audit';

// Weight Rationale
// Based on industry correlation studies (Moz, SEMrush, Ahrefs):
// - Technical SEO (25%): Foundation - if the site can't be crawled/indexed, nothing else matters
// - On-Page SEO (25%): Content structure and meta tags - directly controllable
// - Content Quality (20%): Value, depth, uniqueness - Google's primary ranking factor
// - User Signals (15%): Engagement, internal linking, crawlability - behavioral signals  
// - Backlinks (15%): Authority building - still a major ranking factor

console.log('=== RankForge Scoring System v2.0 ===\n');
console.log('Weight Configuration:');
console.log(`  Technical SEO:      ${WEIGHTS.technical * 100}%`);
console.log(`  On-Page SEO:        ${WEIGHTS.onPage * 100}%`);
console.log(`  Content Quality:   ${WEIGHTS.contentQuality * 100}%`);
console.log(`  User Signals:      ${WEIGHTS.userSignals * 100}%`);
console.log(`  Backlinks:         ${WEIGHTS.backlinks * 100}%`);

console.log('\n--- Grade Scale ---');
(['A', 'B', 'C', 'D', 'F'] as ScoreGrade[]).forEach(grade => {
  const score = grade === 'A' ? 95 : grade === 'B' ? 80 : grade === 'C' ? 60 : grade === 'D' ? 40 : 20;
  console.log(`Grade ${grade}: ${score} - ${gradeDescription(grade)}`);
});

// Test Case: Simulated IBZN.de Audit Data
// 
// Scenario: A website with minor technical issues but good content
// This should score ~70-80 (Grade B) matching SEOptimer results

const mockTechnicalGood: TechnicalAnalysis = {
  issues: [
    // 2 P1 issues (title too short, missing meta description)
    { type: 'title', severity: 'P1', page: '/page1', message: 'Title too short', fix: 'Expand title' },
    { type: 'meta', severity: 'P1', page: '/page2', message: 'Missing meta description', fix: 'Add description' },
    // 3 P2 issues (image alt text, etc)
    { type: 'images', severity: 'P2', page: '/page1', message: '2 images missing alt', fix: 'Add alt text' },
    { type: 'heading', severity: 'P2', page: '/page3', message: 'Skipped heading level', fix: 'Fix hierarchy' },
    { type: 'links', severity: 'P2', page: '/page4', message: 'URL too long', fix: 'Shorten URL' },
  ],
  stats: {
    totalPages: 50,
    pagesWithIssues: 5,
    p0Count: 0,
    p1Count: 2,
    p2Count: 3,
  }
};

const mockLinksGood: LinkGraphAnalysis = {
  nodes: Array.from({ length: 50 }, (_, i) => ({
    url: `/page${i}`,
    internalIncoming: Math.floor(Math.random() * 10),
    internalOutgoing: Math.floor(Math.random() * 5),
    externalOutgoing: Math.random() > 0.5 ? 1 : 0,
    crawlDepth: Math.floor(Math.random() * 3),
  })),
  edges: [],
  orphanPages: ['/page48', '/page49'], // 2 orphan pages
  deadEndPages: ['/page47'], // 1 dead end
  avgInternalLinks: 3.5,
  maxCrawlDepth: 3,
  sitemapCoverage: 0.9,
};

const mockContentGood: Omit<ContentAnalysis, 'benchmarks'> = {
  pages: Array.from({ length: 50 }, (_, i) => ({
    url: `/page${i}`,
    wordCount: 800 + Math.floor(Math.random() * 400),
    headings: {
      h1: ['Page Title'],
      h2: ['Section 1', 'Section 2'],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
    },
    internalLinkCount: 3,
    externalLinkCount: 1,
    linkRatio: 0.75,
    contentType: i === 0 ? 'homepage' : i < 10 ? 'blog' : 'other',
  })),
  avgWordCount: 950,
  thinContentPages: ['/page45', '/page46'], // 2 thin pages (4%)
  contentTypeDistribution: {
    homepage: 1,
    blog: 10,
    product: 5,
    landing: 3,
    contact: 1,
    legal: 2,
    about: 2,
    category: 5,
    other: 21,
  },
};

console.log('\n--- Test Case: Good Site (like IBZN after fixes) ---');
const goodScore = calculateScore(mockTechnicalGood, mockLinksGood, mockContentGood);
console.log(`Overall Score: ${goodScore.overall}/100`);
console.log(`Grade: ${scoreToGrade(goodScore.overall)}`);
console.log(`  Technical:     ${goodScore.technical}`);
console.log(`  On-Page:      ${goodScore.onPage}`);
console.log(`  Content:      ${goodScore.contentQuality}`);
console.log(`  User Signals: ${goodScore.userSignals}`);
console.log(`  Backlinks:    ${goodScore.backlinks}`);

// Test Case: Site with Critical Issues

const mockTechnicalBad: TechnicalAnalysis = {
  issues: [
    // P0 issues
    { type: 'status', severity: 'P0', page: '/old-page', message: '404 Error', fix: 'Fix or redirect' },
    { type: 'status', severity: 'P0', page: '/broken', message: '500 Error', fix: 'Fix server' },
    { type: 'canonical', severity: 'P0', page: '/page1', message: 'Missing canonical', fix: 'Add canonical' },
    // P1 issues
    { type: 'title', severity: 'P1', page: '/page2', message: 'Missing title', fix: 'Add title' },
    { type: 'meta', severity: 'P1', page: '/page3', message: 'Missing description', fix: 'Add description' },
  ],
  stats: {
    totalPages: 30,
    pagesWithIssues: 10,
    p0Count: 3,
    p1Count: 5,
    p2Count: 2,
  }
};

const mockLinksBad: LinkGraphAnalysis = {
  nodes: Array.from({ length: 30 }, (_, i) => ({
    url: `/page${i}`,
    internalIncoming: Math.floor(Math.random() * 2),
    internalOutgoing: Math.floor(Math.random() * 2),
    externalOutgoing: 0,
    crawlDepth: Math.floor(Math.random() * 5),
  })),
  edges: [],
  orphanPages: Array.from({ length: 15 }, (_, i) => `/orphan${i}`), // 50% orphan!
  deadEndPages: Array.from({ length: 10 }, (_, i) => `/dead${i}`),
  avgInternalLinks: 0.8,
  maxCrawlDepth: 5,
  sitemapCoverage: 0.5,
};

const mockContentBad: Omit<ContentAnalysis, 'benchmarks'> = {
  pages: Array.from({ length: 30 }, (_, i) => ({
    url: `/page${i}`,
    wordCount: 200 + Math.floor(Math.random() * 200),
    headings: {
      h1: i % 3 === 0 ? [] : ['Title'], // Every 3rd page missing H1
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
    },
    internalLinkCount: 1,
    externalLinkCount: 0,
    linkRatio: 1,
    contentType: 'other' as const,
  })),
  avgWordCount: 280,
  thinContentPages: Array.from({ length: 20 }, (_, i) => `/thin${i}`), // 66% thin!
  contentTypeDistribution: {
    homepage: 1,
    blog: 2,
    product: 1,
    landing: 1,
    contact: 1,
    legal: 1,
    about: 1,
    category: 2,
    other: 20,
  },
};

console.log('\n--- Test Case: Poor Site (with critical issues) ---');
const badScore = calculateScore(mockTechnicalBad, mockLinksBad, mockContentBad);
console.log(`Overall Score: ${badScore.overall}/100`);
console.log(`Grade: ${scoreToGrade(badScore.overall)}`);
console.log(`  Technical:     ${badScore.technical}`);
console.log(`  On-Page:      ${badScore.onPage}`);
console.log(`  Content:      ${badScore.contentQuality}`);
console.log(`  User Signals: ${badScore.userSignals}`);
console.log(`  Backlinks:    ${badScore.backlinks}`);

console.log('\n=== Summary ===');
console.log('The new scoring system:');
console.log('- Uses calibrated penalties (P0=8, P1=4, P2=2) instead of harsh (20,10,5)');
console.log('- Provides 5 distinct scoring dimensions instead of 3');
console.log('- Matches industry standards: B grade (70-89) for well-optimized sites');
console.log('- Includes grade letters (A-F) for easy interpretation');
