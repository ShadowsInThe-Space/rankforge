# Module E: Link Tier Analyzer - Technical Specification

## Overview

**Link Tier Analyzer** classifies backlink value based on the **Index Tier** of the source page (from Module B). This is based on Google Algorithm Leak 2024 insights showing that link value correlates with the storage tier of the linking page.

## Google Algorithm Leak 2024 Context

### Core Insight
Links from **Base-tier pages** (Flash/RAM storage) pass significantly more PageRank than links from **Landfill-tier pages** (HDD storage). Google's internal systems track:

1. **SourceTier** - Storage tier of the linking page
2. **LinkContext** - Surrounding text, anchor text, position
3. **TierBonus** - Multiplier based on source tier
   - Base tier: 3x link value
   - Zeppelin tier: 1.5x link value  
   - Landfill tier: 0.5x link value

### Leaked Features
- `PageRankSourceTier` - PageRank weighted by source tier
- `LinkTierScore` - Aggregate link quality score
- `TierBoostedBacklinks` - Count of links from each tier

## Module E Objectives

1. **Classify all backlinks** by source page Index Tier (from Module B)
2. **Calculate tier-weighted link value**
3. **Identify premium backlink opportunities** (Base-tier sources)
4. **Detect low-value link spam** (Landfill-tier sources)
5. **Provide actionable link-building recommendations**

## Data Sources

### Required
- **Module B predictions** - Index Tier for each page
- **Internal link graph** - From crawl data (links.internal)
- **Page metadata** - Titles, URLs, content type

### Optional (future)
- **External backlinks** - From Ahrefs/Semrush API
- **Domain Authority** - For external sources

## Scoring Algorithm

```typescript
LinkTierScore = (
  (BaseTierLinks × 3.0) +      // Premium links
  (ZeppelinTierLinks × 1.5) +  // Good links
  (LandfillTierLinks × 0.5)    // Low-value links
) / TotalLinks × 100

// Normalize to 0-100
FinalScore = min(100, LinkTierScore)
```

### Component Weights

#### 1. Tier Multipliers (from leak)
- **Base Tier:** 3.0x (highest link value)
- **Zeppelin Tier:** 1.5x (medium value)
- **Landfill Tier:** 0.5x (penalized)

#### 2. Context Quality (0-100)
```typescript
contextScore = (
  (anchorTextRelevance × 0.40) +  // Does anchor match target content?
  (linkPosition × 0.30) +          // Editorial vs footer/sidebar?
  (surroundingText × 0.20) +       // Related context?
  (noFollow × 0.10)                // Follow vs nofollow
)

// Editorial link (in content) = 100
// Sidebar link = 50
// Footer link = 20
```

#### 3. Link Velocity (growth rate)
```typescript
if (newLinksPerWeek > 10) {
  velocityPenalty = -20; // Potential spam
} else if (newLinksPerWeek > 0) {
  velocityBonus = +10; // Natural growth
}
```

## Output Schema

```typescript
interface LinkTierAnalysis {
  url: string;
  
  inboundLinks: {
    total: number;
    baseTier: number;      // Count from Base-tier pages
    zeppelinTier: number;  // Count from Zeppelin-tier pages
    landfillTier: number;  // Count from Landfill-tier pages
  };
  
  linkTierScore: number;   // 0-100 (tier-weighted)
  
  topSources: Array<{
    sourceUrl: string;
    sourceTier: 'base' | 'zeppelin' | 'landfill';
    tierMultiplier: number;
    anchorText: string;
    contextQuality: number;  // 0-100
    linkValue: number;       // Combined score
  }>;
  
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
  }>;
  
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
  }>;
}

interface SiteLinkTierReport {
  overallScore: number;     // Average link tier score
  totalInternalLinks: number;
  
  tierDistribution: {
    baseTier: number;       // % of links from Base tier
    zeppelinTier: number;   // % from Zeppelin
    landfillTier: number;   // % from Landfill
  };
  
  topLinkedPages: Array<{
    url: string;
    inboundCount: number;
    linkTierScore: number;
  }>;
  
  orphanPages: string[];    // Pages with 0 inbound links
  
  linkOpportunities: Array<{
    targetPage: string;
    potentialSource: string;
    sourceTier: 'base' | 'zeppelin';
    expectedImpact: string;
  }>;
  
  pageAnalyses: Map<string, LinkTierAnalysis>;
}
```

## Implementation Plan

### Phase 1: Core Analyzer (Internal Links Only)
1. Build link graph from crawl data
2. Join with Module B tier predictions
3. Calculate tier-weighted scores
4. Detect orphan pages

### Phase 2: Context Analysis
1. Extract anchor text from HTML
2. Detect link position (content vs footer)
3. Calculate context quality scores

### Phase 3: Recommendations
1. Identify high-value link opportunities
2. Suggest internal linking improvements
3. Flag spam/low-value link patterns

### Phase 4: External Backlinks (Future)
1. Integrate Ahrefs/Semrush API
2. Fetch external backlinks
3. Estimate source tier (via domain metrics)
4. Calculate tier-weighted backlink score

## Database Schema

```sql
-- Add to existing audits table
ALTER TABLE audits ADD COLUMN link_tier_score INTEGER;
ALTER TABLE audits ADD COLUMN link_tier_analysis JSONB;

-- Page-level link tier data
CREATE TABLE page_link_tier (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES audits(id),
  url TEXT NOT NULL,
  
  -- Link counts by tier
  total_inbound_links INTEGER NOT NULL,
  base_tier_links INTEGER NOT NULL,
  zeppelin_tier_links INTEGER NOT NULL,
  landfill_tier_links INTEGER NOT NULL,
  
  -- Scores
  link_tier_score INTEGER NOT NULL,
  context_quality INTEGER,
  
  -- Metadata
  is_orphan BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_audit (audit_id),
  INDEX idx_score (link_tier_score DESC),
  INDEX idx_orphan (is_orphan)
);
```

## Testing Requirements

### Unit Tests
- [ ] Tier multiplier calculation
- [ ] Link graph construction
- [ ] Orphan page detection
- [ ] Context quality scoring
- [ ] Anchor text extraction
- [ ] Score normalization (0-100)

### Integration Tests
- [ ] Full site analysis with Module B data
- [ ] Link opportunity recommendations
- [ ] Cross-module data flow (B → E)
- [ ] Database write/read
- [ ] API endpoint

### E2E Tests
- [ ] Real site audit (ibzn.de)
- [ ] Report rendering
- [ ] Multi-tier link scenarios

## Success Metrics

1. **Accuracy:** Identify 90%+ of orphan pages
2. **Actionability:** At least 5 specific link opportunities per site
3. **Performance:** Analyze 100 pages in <10 seconds
4. **Reliability:** All tests pass, zero TypeScript errors

## Example Output

```json
{
  "url": "https://ibzn.de/kurse-umschulungen-ihk/",
  "inboundLinks": {
    "total": 15,
    "baseTier": 0,
    "zeppelinTier": 5,
    "landfillTier": 10
  },
  "linkTierScore": 43,
  "topSources": [
    {
      "sourceUrl": "https://ibzn.de/home/",
      "sourceTier": "zeppelin",
      "tierMultiplier": 1.5,
      "anchorText": "Unsere Kurse",
      "contextQuality": 85,
      "linkValue": 127.5
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Get link from /projekte/ (Base tier page)",
      "impact": "+30-40 points to link tier score"
    }
  ],
  "issues": [
    {
      "severity": "warning",
      "message": "10 of 15 inbound links from Landfill-tier pages (low value)"
    }
  ]
}
```

## Cross-Module Dependencies

### Module B (Index Tier Predictor)
- **Required:** Tier predictions for all pages
- **Data flow:** B predictions → E analysis
- **Bonus:** Pages with high link tier score get +5 Index Tier bonus

### Module A (NavBoost Simulator)
- **Enhancement:** High link tier score → +10 NavBoost (authority signal)

### Module F (Date Consistency)
- **Enhancement:** Perfect date consistency → +5 link tier score (trust)

## Next Steps After Spec Approval

1. Implement `src/lib/analyzers/link-tier.ts`
2. Write `tests/analyzers/link-tier.test.ts` (15+ tests)
3. Create `src/components/link-tier-report.tsx`
4. Add database migration
5. Integrate into audit pipeline (Phase 4.8)
6. Test with ibzn.de
7. Compare with baseline (F+B+A)

---

**Status:** ⏳ Ready for implementation
**Dependencies:** Module B (Index Tier Predictor) ✅
**Estimated Time:** 3-4 hours
