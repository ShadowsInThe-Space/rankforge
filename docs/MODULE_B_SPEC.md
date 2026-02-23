# Module B: Index Tier Predictor - Technical Specification

**Version:** 1.0.0  
**Date:** 2026-02-21  
**Status:** In Development  
**Based on:** Google API Leak 2024

---

## 🎯 Purpose

Predict which Google Index Tier (Base/Zeppelin/Landfill) stores a page based on leaked signals.

**Why it matters:**
- Links from **Base-tier pages** have HIGHEST value
- Pages in **Landfill** rarely rank well
- Explains why some pages don't get crawled often

---

## 📊 Google's Index Tiers (Leaked)

| Tier | Storage | Content Type | Link Value | SEO Impact |
|------|---------|--------------|------------|------------|
| **Base** | Flash/RAM | Most important, frequently updated | 💎 Premium | Ranks best, crawled often |
| **Zeppelin** | SSD | Medium importance | 👍 Good | Decent rankings |
| **Landfill** | HDD | Rarely updated, low priority | 🗑️ Low | Poor rankings, rarely crawled |

**Source:** Google API Leak 2024 - `sourceType` field

---

## 🧮 Scoring Algorithm

```typescript
Tier Score (0-100) = 
  (Freshness Score * 0.30) +
  (Update Frequency Score * 0.25) +
  (Backlink Quality Score * 0.25) +
  (Page Speed Score * 0.10) +
  (User Engagement Score * 0.10)

Classification:
- Score >= 80 → BASE (Flash/RAM)
- Score >= 50 → ZEPPELIN (SSD)
- Score <  50 → LANDFILL (HDD)
```

---

## 📐 Factor Specifications

### 1. Freshness Score (30% weight)

**What it measures:** How recently was the page updated?

**Inputs:**
- Last-Modified header
- Sitemap lastmod
- Content hash change detection (optional)

**Scoring:**
```
0-7 days:     100 points (ultra fresh)
8-30 days:    80 points (fresh)
31-90 days:   60 points (moderate)
91-180 days:  40 points (stale)
181-365 days: 20 points (very stale)
>365 days:    0 points (ancient)
```

**Rationale:** Google leak shows Base tier contains "fresh" and "regularly updated" content.

---

### 2. Update Frequency Score (25% weight)

**What it measures:** How often is content updated?

**Inputs:**
- Historical snapshots (if available)
- Sitemap change frequency hint
- Estimated from domain type (news = high, static = low)

**Scoring:**
```
Daily:        100 points
Weekly:       80 points
Biweekly:     70 points
Monthly:      60 points
Quarterly:    40 points
Yearly:       20 points
Never:        0 points
```

**Fallback:** If no historical data, estimate from page type:
- Blog post: 50 points (moderate)
- Product page: 60 points (moderate-high)
- Homepage: 80 points (high)
- Static page: 30 points (low)

---

### 3. Backlink Quality Score (25% weight)

**What it measures:** Quality of incoming links

**Inputs:**
- Number of internal backlinks
- Domain authority of linking pages
- Link velocity (growth rate)

**Scoring:**
```
High-authority domains linking:  100 points
Many internal links (>10):       80 points
Some internal links (5-10):      60 points
Few internal links (1-4):        40 points
No internal links:               20 points
Orphan page:                     0 points
```

**Advanced (if external backlink data available):**
- Links from news sites (Base tier): +20 bonus
- Links from high-ranking pages: +10 bonus
- Natural link velocity: +10 bonus

---

### 4. Page Speed Score (10% weight)

**What it measures:** Core Web Vitals performance

**Inputs:**
- LCP (Largest Contentful Paint)
- INP (Interaction to Next Paint)
- CLS (Cumulative Layout Shift)

**Scoring:**
```
LCP < 2.5s AND INP < 200ms AND CLS < 0.1:   100 points (excellent)
LCP < 4.0s AND INP < 500ms AND CLS < 0.25:   70 points (good)
Else:                                         30 points (poor)
```

**Fallback:** If Core Web Vitals not available, estimate from:
- Page size: <500KB = 80, <1MB = 60, >1MB = 40
- Image optimization: optimized = 80, mixed = 60, unoptimized = 40

---

### 5. User Engagement Score (10% weight)

**What it measures:** Estimated user satisfaction

**Inputs:**
- Word count (comprehensive content)
- Multimedia presence (images, videos)
- Internal link density
- Content structure (headings, lists)

**Scoring:**
```
Comprehensive content (>1500 words):      100 points
Good content (800-1500 words):            80 points
Moderate content (400-800 words):         60 points
Thin content (<400 words):                30 points
Very thin content (<200 words):           0 points
```

**Bonus factors:**
- Has images/videos: +10
- Good heading structure (H1-H3): +10
- Reasonable link density (2-5%): +10

---

## 💻 Implementation

### Type Definitions

```typescript
export enum IndexTier {
  BASE = 'Base (Flash/RAM)',
  ZEPPELIN = 'Zeppelin (SSD)',
  LANDFILL = 'Landfill (HDD)'
}

export interface TierPrediction {
  url: string;
  tier: IndexTier;
  confidence: number; // 0-100
  
  overallScore: number; // 0-100
  
  factors: {
    freshness: {
      daysSinceUpdate: number | null;
      lastModified: Date | null;
      score: number; // 0-100
    };
    updateFrequency: {
      estimatedFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'never' | 'unknown';
      updatesPerMonth: number | null;
      score: number;
    };
    backlinkQuality: {
      internalBacklinks: number;
      orphanPage: boolean;
      score: number;
    };
    pageSpeed: {
      lcp: number | null;
      inp: number | null;
      cls: number | null;
      estimatedScore: number;
      score: number;
    };
    userEngagement: {
      wordCount: number;
      hasMultimedia: boolean;
      headingDepth: number;
      linkDensity: number;
      score: number;
    };
  };
  
  recommendation: string;
}
```

### Main Function

```typescript
export async function predictIndexTier(
  page: {
    url: string;
    html?: string;
    markdown?: string;
    metadata?: any;
    wordCount?: number;
    headings?: any;
    links?: { internal: string[]; external: string[] };
  },
  options?: {
    sitemapLastmod?: string;
    internalBacklinks?: number;
    externalBacklinks?: Array<{ domain: string; authority: number }>;
  }
): Promise<TierPrediction>
```

---

## 🧪 Test Cases

### 1. Base Tier Page (Score >= 80)
```typescript
{
  daysSinceUpdate: 3,        // 100 points
  updateFrequency: 'weekly', // 80 points
  internalBacklinks: 15,     // 80 points
  lcp: 2.1,                  // 100 points
  wordCount: 2000,           // 100 points
  → Overall: 88 → BASE ✅
}
```

### 2. Zeppelin Tier Page (Score 50-79)
```typescript
{
  daysSinceUpdate: 45,       // 60 points
  updateFrequency: 'monthly',// 60 points
  internalBacklinks: 7,      // 60 points
  lcp: 3.5,                  // 70 points
  wordCount: 900,            // 80 points
  → Overall: 63 → ZEPPELIN ✅
}
```

### 3. Landfill Tier Page (Score < 50)
```typescript
{
  daysSinceUpdate: 400,      // 0 points
  updateFrequency: 'never',  // 0 points
  internalBacklinks: 0,      // 0 points (orphan)
  lcp: 5.2,                  // 30 points
  wordCount: 150,            // 0 points
  → Overall: 6 → LANDFILL ✅
}
```

---

## 🎨 UI Design

### Report Card Layout

```
┌─────────────────────────────────────────────────┐
│  Index Tier Prediction                          │
│                                                  │
│  Tier: 💎 BASE (Flash/RAM)                      │
│  Score: 88/100                                   │
│  Confidence: High (95%)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Factor Breakdown                                │
├─────────────────────────────────────────────────┤
│  Freshness (30%)           100/100 ✅           │
│  Last Updated: 3 days ago                        │
│                                                  │
│  Update Frequency (25%)     80/100 ✅           │
│  Estimated: Weekly                               │
│                                                  │
│  Backlink Quality (25%)     80/100 ✅           │
│  Internal Links: 15                              │
│                                                  │
│  Page Speed (10%)          100/100 ✅           │
│  LCP: 2.1s | INP: 150ms | CLS: 0.05             │
│                                                  │
│  User Engagement (10%)     100/100 ✅           │
│  Word Count: 2000 | Multimedia: Yes             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  What This Means                                 │
├─────────────────────────────────────────────────┤
│  ✅ This page is stored in Google's premium     │
│     Base tier (Flash/RAM)                        │
│                                                  │
│  ✅ Links FROM this page have HIGHEST value     │
│                                                  │
│  ✅ Google crawls this page frequently           │
│                                                  │
│  ✅ Strong ranking potential                     │
└─────────────────────────────────────────────────┘
```

---

## 📈 Integration with Existing Modules

### With Module F (Date Consistency)
- Pages with perfect date consistency → +5 bonus to freshness score

### With Module E (Link Tier Analyzer)
- Use tier predictions to classify backlink value
- Base-tier source = premium link
- Landfill source = low-value link

### With Module A (NavBoost Simulator)
- Base-tier pages expected to have higher engagement
- Landfill pages likely have low CTR/dwell time

---

## 🚀 Performance Considerations

**Execution Time Target:** <100ms per page

**Optimizations:**
- Cache LCP/INP/CLS measurements
- Pre-calculate internal backlink counts
- Batch process multiple pages

**Scalability:**
- Can process 1000 pages in <100 seconds
- Memory efficient (no large data structures)

---

## 📊 Validation Strategy

**Test against ibzn.de:**
1. Predict tier for all 100 pages
2. Compare predictions to observed behavior:
   - Do Base-tier predictions rank better?
   - Do Landfill predictions have crawl issues?
3. Iterate scoring algorithm based on real data

**Expected distribution:**
- Base: 10-20% of pages
- Zeppelin: 50-60% of pages
- Landfill: 20-30% of pages

---

## 🔮 Future Enhancements (v2.0)

1. **Machine Learning Model**
   - Train on actual Google crawl frequency data
   - Learn from ranking correlations

2. **External Backlink Integration**
   - Ahrefs API for backlink quality
   - Majestic Trust Flow scores

3. **Historical Tracking**
   - Track tier changes over time
   - Alert when pages drop to Landfill

4. **Crawl Budget Optimizer**
   - Suggest which pages to update first
   - Maximize Base-tier allocation

---

**End of Specification**

Ready for implementation! 🚀
