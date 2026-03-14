# RankForge SEO Scoring System v2.0

## Overview

The new scoring system in RankForge v2.0 is calibrated to match industry standards used by tools like SEOptimer, MOZ, Ahrefs, and SEMrush.

## Grade Scale

| Grade | Score Range | Interpretation |
|-------|-------------|----------------|
| A | 90-100 | Excellent - Fully optimized for search engines |
| B | 70-89 | Good - Well-optimized with minor improvements needed |
| C | 50-69 | Average - Moderately optimized, room for improvement |
| D | 30-49 | Below Average - Significant SEO issues present |
| F | 0-29 | Poor - Critical issues require immediate attention |

## Weight Configuration

Based on industry correlation studies and Google ranking factors research:

| Category | Weight | Rationale |
|----------|--------|-----------|
| Technical SEO | 25% | Foundation of SEO - if site can't be crawled/indexed, nothing else matters |
| On-Page SEO | 25% | Content structure and meta tags - directly controllable optimization |
| Content Quality | 20% | Value, depth, uniqueness - Google's primary ranking factor |
| User Signals | 15% | Engagement, internal linking, crawlability - behavioral signals |
| Backlinks | 15% | Authority building - still a major ranking factor despite updates |

## Penalty Calibration

The v2.0 system uses calibrated penalties instead of the harsh v1.0 values:

| Severity | v1.0 (Old) | v2.0 (New) | Rationale |
|----------|------------|------------|-----------|
| P0 (Critical) | 20 points | 8 points | Critical issues shouldn't completely destroy score |
| P1 (Major) | 10 points | 4 points | Major issues are serious but fixable |
| P2 (Minor) | 5 points | 2 points | Minor issues have limited impact |

### Maximum Penalty Caps
- P0 issues: Maximum -40 points
- P1 issues: Maximum -30 points  
- P2 issues: Maximum -20 points

This prevents a site from being overly penalized when it has many issues of the same type.

## Scoring Components

### 1. Technical SEO Score (25%)
- HTTP status code issues (4xx, 5xx errors)
- Duplicate titles and content
- Canonical tag issues
- Noindex directives
- Security issues (HTTPS)

### 2. On-Page SEO Score (25%)
- Title tag optimization (length, uniqueness)
- Meta description presence and length
- H1 heading structure
- Canonical URLs
- Open Graph tags
- URL structure

### 3. Content Quality Score (20%)
- Average word count (ideal: 800+)
- Thin content ratio (penalized if >25% of pages)
- Heading hierarchy quality
- Content type diversity

### 4. User Signals Score (15%)
- Orphan pages (pages with no internal links)
- Dead end pages (pages with no outgoing links)
- Internal link distribution
- Crawl depth (penalized if >4 levels)
- Sitemap coverage

### 5. Backlinks/Authority Score (15%)
- Link equity distribution
- External link presence
- Crawl efficiency

## Expected Results

### For a Site Like IBZN.de (After Fixes)
- **Expected Score**: 70-85 (Grade B)
- **Rationale**: After fixing technical issues, a site with good content structure and reasonable internal linking should score in the B range, matching SEOptimer results.

### For a Site With Critical Issues
- **Expected Score**: 30-50 (Grade D)
- **Rationale**: Sites with multiple P0 issues, poor content, and bad internal linking will score lower.

## Migration from v1.0

The old scoring interface is maintained for backward compatibility:

```typescript
// Old interface still works
const score = calculateScore(technical, links, content);
console.log(score.overall);     // 0-100
console.log(score.technical);   // Legacy technical score
console.log(score.content);     // Combined on-page + content
console.log(score.links);       // Combined user signals + backlinks
```

New detailed breakdown:
```typescript
const score = calculateScore(technical, links, content);
console.log(score.onPage);        // New on-page specific score
console.log(score.contentQuality); // New content quality score
console.log(score.userSignals);    // New user signals score
console.log(score.backlinks);      // New backlinks score
```

## Testing

Run the test script to verify scoring behavior:

```bash
cd /home/sonny/Development/rankforge
npx tsx scripts/test-scoring.ts
```

This will show:
- Weight configuration
- Grade descriptions
- Test cases with different site quality levels
- Expected scores for each scenario
