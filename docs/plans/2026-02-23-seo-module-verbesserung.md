# SEO Module Verbesserung - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Genauigkeit von Index Tier, Date Consistency und NavBoost verbessern + UI-Erklärungen hinzufügen

**Architecture:** Die drei Analyzer-Module werden erweitert mit neuen Faktoren und besserer Logik. Die UI erhält Erklärungs-Karten für jedes Modul.

**Tech Stack:** TypeScript, React, Tailwind CSS

---

## Task 1: Date Consistency - OG-Tags und Meta-Tags ergänzen

**Files:**
- Modify: `src/lib/analyzers/date-consistency.ts`
- Test: `tests/analyzers/date-consistency.test.ts`

**Step 1: Write failing test**

```typescript
// tests/analyzers/date-consistency.test.ts
import { analyzeDateConsistency } from '@/lib/analyzers/date-consistency';

describe('Date Consistency - OG and Meta Tags', () => {
  it('should extract date from og:updated_time', async () => {
    const page = {
      metadata: { sourceURL: 'https://example.com/page' },
      html: `<meta property="og:updated_time" content="2024-06-15T10:00:00+00:00">`,
    };
    const result = await analyzeDateConsistency(page);
    expect(result.dates.ogDate?.found).toBe(true);
  });

  it('should extract date from article:published_time', async () => {
    const page = {
      metadata: { sourceURL: 'https://example.com/page' },
      html: `<meta property="article:published_time" content="2024-03-20">`,
    };
    const result = await analyzeDateConsistency(page);
    expect(result.dates.ogDate?.found).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**
Expected: FAIL - ogDate not in interface

**Step 3: Add OG/Meta extraction**

In `src/lib/analyzers/date-consistency.ts`:
- Add `ogDate` to interface (lines 45-50)
- Add `extractOgDate()` function
- Add to sources in main function (lines 175-185)

**Step 4: Run test to verify it passes**
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/analyzers/date-consistency.ts tests/
git commit -m "feat: add OG and meta tag date extraction"
```

---

## Task 2: Date Consistency - Bessere Fix-Vorschläge

**Files:**
- Modify: `src/lib/analyzers/date-consistency.ts` (lines 280-320)

**Step 1: Write failing test**

```typescript
it('should provide specific fix recommendations', async () => {
  const page = {
    metadata: { sourceURL: 'https://example.com/blog/2024-01-15-post' },
    html: `<title>January 2024 Guide</title>
           <script type="application/ld+json">{"datePublished": "2024-06-15"}</script>`,
  };
  const result = await analyzeDateConsistency(page);
  expect(result.recommendation).toContain('JSON-LD');
  expect(result.conflicts[0].fix).toBeDefined();
});
```

**Step 2: Run test to verify it fails**
Expected: FAIL - fix property not in conflict

**Step 3: Add fix recommendations**

In `src/lib/analyzers/date-consistency.ts`:
- Add `fix?: string` to conflict interface
- Add logic to generate specific fixes based on conflict type
- HIGH severity: "Update [source] to match [target]"
- MEDIUM: "Add consistent date to [source]"

**Step 4: Run test to verify it passes**
Expected: PASS

**Step 5: Commit**
```bash
git commit -m "feat: add fix recommendations to date conflicts"
```

---

## Task 3: Index Tier - Cross-Referenzierung verbessern

**Files:**
- Modify: `src/lib/analyzers/index-tier.ts`
- Test: `tests/analyzers/index-tier.test.ts`

**Step 1: Write failing test**

```typescript
it('should boost tier for pages with many internal backlinks', async () => {
  const page = {
    url: 'https://example.com/important-page',
    html: '<h1>Main Page</h1>',
    markdown: '# Main Page',
    metadata: { title: 'Main' },
  };
  // Simulate 10 internal backlinks to this page
  const result = await predictIndexTier(page, {
    internalBacklinks: 10,
  });
  expect(result.tier).toBe('Base');
});
```

**Step 2: Run test to verify it fails**
Expected: FAIL - internalBacklinks not in options

**Step 3: Update tier prediction logic**

In `src/lib/analyzers/index-tier.ts`:
- Add internalBacklinks parameter to predictIndexTier
- Modify scoring: +15 points per 5 internal backlinks
- Update tier threshold logic

**Step 4: Run test to verify it passes**
Expected: PASS

**Step 5: Commit**
```bash
git commit -m "feat: add internal backlink weighting to index tier"
```

---

## Task 4: Index Tier - Date Consistency Bonus

**Files:**
- Modify: `src/lib/analyzers/index-tier.ts` (lines 180-220)

**Step 1: Write failing test**

```typescript
it('should add bonus for perfect date consistency', async () => {
  const page = {
    url: 'https://example.com/blog/2024-06-15-post',
    html: `<title>June 15, 2024 Guide</title>
           <script type="application/ld+json">{"datePublished": "2024-06-15"}</script>
           <time datetime="2024-06-15">June 15, 2024</time>`,
    markdown: '# June 15, 2024 Guide',
    metadata: { title: 'June 15, 2024 Guide' },
  };
  const result = await predictIndexTier(page, { internalBacklinks: 0 });
  // Perfect date = +5 bonus
  expect(result.overallScore).toBeGreaterThan(55);
});
```

**Step 2: Run test to verify it fails**
Expected: FAIL - no date consistency check

**Step 3: Add date consistency bonus**

In `src/lib/analyzers/index-tier.ts`:
- Import date consistency analyzer
- Check if page has perfect date consistency
- Add +5 to score if perfect

**Step 4: Run test to verify it passes**
Expected: PASS

**Step 5: Commit**
```bash
git commit -m "feat: add date consistency bonus to index tier"
```

---

## Task 5: NavBoost - Bessere CTR-Analyse

**Files:**
- Modify: `src/lib/analyzers/navboost.ts`
- Test: `tests/analyzers/navboost.test.ts`

**Step 1: Write failing test**

```typescript
it('should detect emotional triggers in title', async () => {
  const page = {
    url: 'https://example.com/page',
    metadata: {
      title: 'Amazing SEO Tips That Actually Work',
      description: 'Discover the secret strategies'
    },
    markdown: '# Amazing SEO Tips\n\nContent here...',
    html: '<h1>Amazing SEO Tips</h1>',
  };
  const result = analyzePageNavBoost(page, [page]);
  expect(result.scoreBreakdown.ctrPotential).toBeGreaterThan(50);
});
```

**Step 2: Run test to verify it fails**
Expected: FAIL - current scoring too low

**Step 3: Enhance CTR analysis**

In `src/lib/analyzers/navboost.ts`:
- Add emotional trigger detection (amazing, proven, secret, etc.)
- Add number detection (list articles)
- Add year detection (freshness signal)
- Weight title and description equally

**Step 4: Run test to verify it passes**
Expected: PASS

**Step 5: Commit**
```bash
git commit -m "feat: enhance CTR analysis with emotional triggers"
```

---

## Task 6: UI - Erklärungs-Abschnitt für jeden Tab

**Files:**
- Modify: `src/app/audit/[id]/page.tsx` (Tabs: dates, tiers, navboost)

**Step 1: Create German explanation components**

Create `src/components/seo-explainer.tsx`:

```typescript
export function IndexTierExplainer() {
  return (
    <Card className="bg-blue-50 dark:bg-blue-950">
      <CardContent className="py-4">
        <h4 className="font-semibold mb-2">💡 Was sind Index Tiers?</h4>
        <p className="text-sm text-muted-foreground">
          Google speichert Seiten in 3 Tiers basierend auf Qualität...
        </p>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Add to each tab in page.tsx**

- DatesTab: Add "Was ist Date Consistency?"
- TiersTab: Add "Was sind Index Tiers?" (already done)
- NavBoostTab: Add "Was ist NavBoost?"

**Step 3: Test locally**
Expected: All explanations visible

**Step 5: Commit**
```bash
git add src/components/ src/app/audit/
git commit -m "feat: add German explanations to all tabs"
```

---

## Task 7: Integration Test - Full Audit

**Files:**
- Run: Full audit on test website
- Verify: All modules work together

**Step 1: Run audit**

```bash
npm run dev
# Create new audit for https://example.com
```

**Step 2: Verify results**
- Date Consistency: Shows OG dates + conflicts with fixes
- Index Tier: Shows backlinks bonus + date bonus
- NavBoost: Shows improved CTR scores

**Step 3: Commit**
```bash
git commit -m "test: verify full audit integration"
```

---

## Summary

| Task | Beschreibung | Komplexität |
|------|--------------|-------------|
| 1 | Date: OG/Meta Tags | Medium |
| 2 | Date: Fix-Vorschläge | Low |
| 3 | Index Tier: Cross-Ref | Medium |
| 4 | Index Tier: Date Bonus | Low |
| 5 | NavBoost: CTR | Medium |
| 6 | UI Erklärungen | Low |
| 7 | Integration Test | Low |

**Plan complete and saved to `docs/plans/2026-02-23-seo-module-verbesserung.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing_plans, batch execution with checkpoints

**Which approach?**
