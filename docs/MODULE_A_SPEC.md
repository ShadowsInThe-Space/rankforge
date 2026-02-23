# Module A: NavBoost Simulator - Technical Specification

## Overview

**NavBoost** is Google's user interaction ranking system revealed in the Algorithm Leak 2024. It processes billions of click signals daily to determine which pages satisfy user intent. This module simulates NavBoost scoring to predict a page's ranking potential based on engagement signals.

## Google Algorithm Leak 2024 Context

### Core NavBoost Features (from leak)
1. **`NavBoostCTR`** - Click-through rate from search results
2. **`GoodClicks`** - Quality clicks (long dwell time, no pogo-sticking)
3. **`BadClicks`** - Low-quality clicks (quick bounce, pogo-stick)
4. **`LastLongestClicks`** - Final destination in search journey
5. **`UnsquashedClicks`** - Raw click data before spam filtering
6. **`ImpressionData`** - How often page appears in results
7. **`DwellTime`** - Time spent on page before returning to SERP
8. **`PogoSticking`** - Rapid back-clicking indicating dissatisfaction

### Weighting
- **Good Clicks:** +10 points (strong positive signal)
- **Bad Clicks:** -8 points (strong negative signal)
- **Last/Longest Click:** +15 points (strongest signal - user found answer)
- **CTR:** Normalized 0-100 (higher = better title/meta appeal)
- **Dwell Time:** >3min = excellent, 1-3min = good, <1min = poor

## Module A Objectives

1. **Simulate NavBoost scoring** for each crawled page
2. **Predict engagement potential** based on content quality, page speed, UX signals
3. **Identify NavBoost weaknesses** (low CTR potential, poor engagement signals)
4. **Provide actionable recommendations** to improve click-worthiness and dwell time
5. **Cross-module integration** with Date Consistency (F) and Index Tier (B)

## Data Sources

### Primary (when available)
- **Google Search Console API**: Real CTR, impressions, position data
- **Analytics API**: Real bounce rate, session duration, pages/session

### Fallback (heuristic-based)
When GSC/Analytics not available, estimate based on:
- **Title quality**: Length, keyword placement, emotional triggers
- **Meta description**: Completeness, call-to-action, uniqueness
- **Content structure**: Headers, readability, multimedia
- **Page speed**: Load time, CWV scores
- **Internal linking**: Navigation clarity, breadcrumbs

## Scoring Algorithm

```typescript
NavBoostScore = (
  (CTR_Potential × 0.25) +          // Title/meta appeal
  (Engagement_Potential × 0.30) +    // Content quality, readability
  (UX_Quality × 0.20) +              // Speed, mobile, accessibility
  (Click_Quality × 0.15) +           // Dwell time predictors
  (Intent_Match × 0.10)              // Keyword alignment
) × Cross_Module_Bonuses
```

### Component Scoring

#### 1. CTR Potential (0-100)
**With GSC data:**
```typescript
if (avgCTR > expectedCTRForPosition) {
  score = 100 * (avgCTR / expectedCTR);
} else {
  score = 100 * (avgCTR / expectedCTR) * 0.8; // Penalty for underperformance
}
```

**Without GSC (heuristic):**
```typescript
titleScore = (
  (titleLength >= 50 && titleLength <= 60 ? 25 : 0) +  // Optimal length
  (hasNumbers ? 15 : 0) +                               // "7 Ways to..."
  (hasEmotionalTrigger ? 20 : 0) +                      // "Amazing", "Proven"
  (hasKeywordInFirst5Words ? 20 : 0) +                  // Front-loaded KW
  (hasBrandName ? 10 : 0) +                             // Trust signal
  (hasYear ? 10 : 0)                                    // Freshness "[2024]"
);

metaScore = (
  (metaLength >= 140 && metaLength <= 160 ? 25 : 0) +   // Optimal length
  (hasCallToAction ? 20 : 0) +                          // "Learn more", "Discover"
  (isUnique ? 30 : 0) +                                 // Not duplicate
  (hasKeyword ? 15 : 0) +                               // Keyword present
  (noStuffing ? 10 : 0)                                 // Natural language
);

ctrPotential = (titleScore + metaScore) / 2;
```

#### 2. Engagement Potential (0-100)
```typescript
contentQuality = (
  (wordCount >= 1500 ? 20 : wordCount / 75) +           // Depth
  (hasMultimedia ? 15 : 0) +                            // Images, videos
  (readabilityScore >= 60 ? 20 : 0) +                   // Flesch reading ease
  (hasStructuredHeaders ? 15 : 0) +                     // H2, H3 hierarchy
  (hasInternalLinks ? 10 : 0) +                         // User journey
  (hasFAQs ? 10 : 0) +                                  // Quick answers
  (hasTableOfContents ? 10 : 0)                         // Scannable
);
```

#### 3. UX Quality (0-100)
```typescript
uxScore = (
  (LCP < 2.5s ? 30 : (LCP < 4s ? 15 : 0)) +             // Largest Contentful Paint
  (FID < 100ms ? 20 : (FID < 300ms ? 10 : 0)) +         // First Input Delay
  (CLS < 0.1 ? 20 : (CLS < 0.25 ? 10 : 0)) +            // Cumulative Layout Shift
  (isMobileFriendly ? 15 : 0) +                         // Responsive
  (hasAccessibleNav ? 10 : 0) +                         // Breadcrumbs, clear menu
  (noIntrusiveInterstitials ? 5 : 0)                    // No popups blocking content
);
```

#### 4. Click Quality Predictors (0-100)
```typescript
dwellTimePotential = (
  (avgParagraphLength < 100 ? 20 : 10) +                // Scannable
  (hasVisualBreaks ? 15 : 0) +                          // Images between text
  (hasRelatedContent ? 15 : 0) +                        // "Read next" sections
  (lowExitRate ? 20 : 0) +                              // Sticky content (if analytics available)
  (hasEngagingElements ? 15 : 0) +                      // Quizzes, calculators
  (contentMatchesTitle ? 15 : 0)                        // No bait-and-switch
);
```

#### 5. Intent Match (0-100)
```typescript
intentScore = (
  (primaryKeywordInH1 ? 25 : 0) +                       // Clear topic
  (semanticCoverage >= 70% ? 25 : 0) +                  // LSI keywords present
  (contentTypeMatchesQuery ? 30 : 0) +                  // Guide vs product page
  (hasDirectAnswer ? 20 : 0)                            // Featured snippet potential
);
```

### Cross-Module Bonuses
- **Perfect Date Consistency (F)** → +5 points (trust signal)
- **Base Tier (B)** → +10 points (premium content)
- **Zeppelin Tier (B)** → +5 points (solid content)
- **Landfill Tier (B)** → -5 points (low-quality signal)

### Final Score Interpretation
- **90-100**: Excellent NavBoost potential (good click magnet)
- **70-89**: Good potential (minor optimizations needed)
- **50-69**: Average (significant CTR/engagement improvements possible)
- **30-49**: Poor (major issues with click-worthiness or UX)
- **0-29**: Critical (fundamental NavBoost problems)

## Output Schema

```typescript
interface NavBoostAnalysis {
  overallScore: number;              // 0-100
  scoreBreakdown: {
    ctrPotential: number;            // 0-100
    engagementPotential: number;     // 0-100
    uxQuality: number;               // 0-100
    clickQuality: number;            // 0-100
    intentMatch: number;             // 0-100
  };
  
  signals: {
    estimatedCTR?: number;           // % (if GSC available)
    estimatedDwellTime: number;      // seconds (predicted)
    pogoStickRisk: 'low' | 'medium' | 'high';
    lastClickProbability: number;    // 0-1 (will user stop searching?)
  };
  
  gscData?: {                        // Optional: real data if GSC connected
    actualCTR: number;
    impressions: number;
    avgPosition: number;
    clicks: number;
  };
  
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    category: 'ctr' | 'engagement' | 'ux' | 'intent';
    message: string;
    impact: number;                  // -X points
  }>;
  
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;          // "+10-15 points"
  }>;
  
  competitorBenchmark?: {            // If SERP data available
    avgCTRInPosition: number;
    outperforming: boolean;
    gap: number;                     // Percentage points difference
  };
}
```

## Implementation Plan

### Phase 1: Core Analyzer (No GSC)
1. Heuristic CTR scoring (title/meta quality)
2. Content engagement analysis (readability, structure)
3. UX quality scoring (speed, mobile)
4. Basic recommendations

### Phase 2: GSC Integration
1. OAuth flow for GSC API
2. Real CTR/impression data fetching
3. Position-based benchmarking
4. Competitor comparison

### Phase 3: Advanced Features
1. A/B test suggestions (title variations)
2. SERP snippet preview
3. Historical trend analysis (if GSC connected)
4. Machine learning CTR predictions

### Phase 4: Cross-Module Intelligence
1. Combine with Module B (Index Tier) → predict crawl budget impact
2. Combine with Module F (Date Consistency) → trust signal boost
3. Combine with future Module E (Link Tier) → authority signals

## Database Schema

```sql
-- Add to existing audits table
ALTER TABLE audits ADD COLUMN navboost_score INTEGER;
ALTER TABLE audits ADD COLUMN navboost_analysis JSONB;

-- Page-level NavBoost data
CREATE TABLE page_navboost (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES audits(id),
  url TEXT NOT NULL,
  
  -- Scores
  overall_score INTEGER NOT NULL,
  ctr_potential INTEGER NOT NULL,
  engagement_potential INTEGER NOT NULL,
  ux_quality INTEGER NOT NULL,
  click_quality INTEGER NOT NULL,
  intent_match INTEGER NOT NULL,
  
  -- Signals
  estimated_ctr DECIMAL(5,2),
  estimated_dwell_time INTEGER,
  pogo_stick_risk TEXT,
  last_click_probability DECIMAL(3,2),
  
  -- GSC data (if available)
  actual_ctr DECIMAL(5,2),
  impressions INTEGER,
  avg_position DECIMAL(4,1),
  clicks INTEGER,
  
  -- Metadata
  analyzed_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_audit (audit_id),
  INDEX idx_score (overall_score DESC)
);
```

## Testing Requirements

### Unit Tests
- [ ] Title quality scoring (edge cases: too short, too long, no keywords)
- [ ] Meta description scoring (duplicate detection, CTA detection)
- [ ] Engagement potential (word count, multimedia, structure)
- [ ] UX quality (Core Web Vitals simulation)
- [ ] Intent match (keyword placement, content type)
- [ ] Cross-module bonus application
- [ ] Score normalization (no negative scores, max 100)

### Integration Tests
- [ ] Full page analysis with mocked Firecrawl data
- [ ] GSC fallback when no API available
- [ ] Cross-module integration (B + F bonuses)
- [ ] Database write/read
- [ ] API endpoint response format

### E2E Tests
- [ ] Real site audit (ibzn.de)
- [ ] GSC-connected audit (if credentials available)
- [ ] Report rendering in UI

## Success Metrics

1. **Accuracy (when GSC available)**: Heuristic CTR within ±15% of actual CTR
2. **Actionability**: At least 3 specific recommendations per page
3. **Performance**: Analyze 100 pages in <30 seconds
4. **Reliability**: All tests pass, zero TypeScript errors

## Example Output

```json
{
  "overallScore": 72,
  "scoreBreakdown": {
    "ctrPotential": 68,
    "engagementPotential": 85,
    "uxQuality": 62,
    "clickQuality": 78,
    "intentMatch": 70
  },
  "signals": {
    "estimatedCTR": 3.2,
    "estimatedDwellTime": 145,
    "pogoStickRisk": "low",
    "lastClickProbability": 0.68
  },
  "issues": [
    {
      "severity": "warning",
      "category": "ctr",
      "message": "Title too short (38 chars). Optimal: 50-60 chars.",
      "impact": -12
    },
    {
      "severity": "warning",
      "category": "ux",
      "message": "LCP 3.2s exceeds recommended 2.5s threshold",
      "impact": -8
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Extend title to 50-60 characters with emotional trigger word",
      "expectedImpact": "+10-15 points to CTR potential"
    },
    {
      "priority": "medium",
      "action": "Optimize largest image (hero.jpg) to improve LCP",
      "expectedImpact": "+8-12 points to UX quality"
    }
  ]
}
```

## Next Steps After Spec Approval

1. Implement `src/lib/analyzers/navboost.ts` (core logic)
2. Write `tests/analyzers/navboost.test.ts` (15+ test cases)
3. Create UI component `src/components/navboost-report.tsx`
4. Add database migration for `page_navboost` table
5. Integrate into audit pipeline
6. Test with ibzn.de (compare with Module B+F baseline)
7. Document in README

---

**Status:** ⏳ Awaiting approval to proceed with implementation
**Dependencies:** None (can run standalone or with B+F cross-module bonuses)
**Estimated Implementation Time:** 4-6 hours
