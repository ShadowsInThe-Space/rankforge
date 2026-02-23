# RankForge - Date Consistency Analyzer Quick Start

**Enterprise SEO Analysis based on Google API Leak 2024**

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd /home/sonny/Development/rankforge
npm install cheerio
```

### Step 2: Run Tests

```bash
npm run test tests/analyzers/date-consistency.test.ts
```

Expected output:
```
✓ tests/analyzers/date-consistency.test.ts (15)
  ✓ Date Consistency Analyzer (15)
    ✓ should detect perfect consistency
    ✓ should detect HIGH severity conflict
    ✓ should detect MEDIUM severity conflict
    ✓ should extract date from URL pattern YYYY/MM/DD
    ...
```

### Step 3: Integrate into Audit Pipeline

Edit `src/app/api/audit/route.ts`:

```typescript
import { analyzeDateConsistency } from "@/lib/analyzers/date-consistency";

// Inside runAuditPipeline() after crawling:
async function runAuditPipeline(auditId: string, url: string, domain: string) {
  try {
    // ... existing crawl logic ...

    // NEW: Run Date Consistency Analysis
    const dateAnalysis = await Promise.all(
      crawlData.data.map(async (page) => {
        return {
          url: page.metadata?.sourceURL,
          report: await analyzeDateConsistency(page),
        };
      })
    );

    // Save to database (extend schema if needed)
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        dateConsistency: JSON.stringify(dateAnalysis),
      },
    });

    // ... rest of pipeline ...
  } catch (err) {
    // error handling
  }
}
```

### Step 4: Display Results in UI

Edit `src/app/audit/[id]/page.tsx`:

```typescript
import { DateConsistencyReportCard } from "@/components/date-consistency-report";

export default async function AuditPage({ params }: { params: { id: string } }) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
  });

  const dateAnalysis = audit.dateConsistency
    ? JSON.parse(audit.dateConsistency)
    : null;

  return (
    <div>
      {/* Existing audit dashboard */}

      {/* NEW: Date Consistency Section */}
      {dateAnalysis && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Date Consistency Analysis</h2>
          <div className="space-y-4">
            {dateAnalysis.map((item: any, idx: number) => (
              <DateConsistencyReportCard key={idx} report={item.report} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

---

## 🎯 Example Usage

### Standalone Analysis

```typescript
import { firecrawl } from "@/lib/firecrawl";
import { analyzeDateConsistency } from "@/lib/analyzers/date-consistency";

// Scrape a page
const { data } = await firecrawl.scrape("https://example.com/blog/post", [
  "markdown",
  "html",
]);

// Analyze date consistency
const report = await analyzeDateConsistency(data);

console.log(report);
/*
{
  url: "https://example.com/blog/post",
  dates: {
    structuredData: {
      found: true,
      date: 2024-02-21T00:00:00.000Z,
      schema: "Article"
    },
    urlDate: {
      found: true,
      date: 2024-01-15T00:00:00.000Z,
      pattern: "/(\d{4})-(\d{2})-(\d{2})/"
    },
    ...
  },
  conflicts: [
    {
      severity: "HIGH",
      source1: "urlDate",
      date1: 2024-01-15T00:00:00.000Z,
      source2: "structuredData",
      date2: 2024-02-21T00:00:00.000Z,
      discrepancyDays: 37
    }
  ],
  score: 70,
  recommendation: "⚠️ Critical: 1 high-priority conflict(s). Fix URL vs. structured data immediately."
}
*/
```

---

## 🔍 What Gets Detected

### Date Sources

| Source | Description | Example |
|--------|-------------|---------|
| **Structured Data** | JSON-LD, Microdata | `<script type="application/ld+json">{"@type": "Article", "datePublished": "2024-02-21"}` |
| **URL Pattern** | Date in URL path | `/blog/2024-02-21-post` |
| **Title Date** | Date in page title | `My Post - February 21, 2024` |
| **Byline Date** | Visible publish date | `<time datetime="2024-02-21">Feb 21, 2024</time>` |
| **Sitemap** | XML sitemap lastmod | `<lastmod>2024-02-21T12:00:00Z</lastmod>` |

### Conflict Severity

| Severity | Description | Penalty |
|----------|-------------|---------|
| **HIGH** | URL vs. Structured Data | -30 points |
| **MEDIUM** | Byline vs. Structured Data | -15 points |
| **LOW** | Other conflicts | -5 points |

### Scoring

```
Score = 100 - (HIGH conflicts × 30) - (MEDIUM × 15) - (LOW × 5)

Score >= 90: ✅ Perfect
Score >= 70: ⚠️ Warning
Score < 70:  ❌ Critical
```

---

## 📊 Database Schema Extension

Add to `prisma/schema.prisma`:

```prisma
model Audit {
  id               String   @id @default(cuid())
  url              String
  domain           String
  status           String
  keywords         String[]
  
  // NEW: Enterprise Analysis
  dateConsistency  String?  @db.Text  // JSON of DateConsistencyReport[]
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

Run migration:
```bash
npx prisma migrate dev --name add_date_consistency
```

---

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Specific Test
```bash
npm run test tests/analyzers/date-consistency.test.ts
```

### Test Coverage
```bash
npm run test -- --coverage
```

Expected coverage:
- Statements: >90%
- Branches: >85%
- Functions: >90%
- Lines: >90%

---

## 🐛 Debugging

### Enable Debug Logging

```typescript
import { analyzeDateConsistency } from "@/lib/analyzers/date-consistency";

const report = await analyzeDateConsistency(page, {
  sitemapLastmod: "2024-02-21T12:00:00Z",
});

// Debug detected dates
console.log("Detected dates:", report.dates);

// Debug conflicts
console.log("Conflicts:", report.conflicts);
```

### Common Issues

**Issue:** "No dates detected"
- **Cause:** Page has no structured data, no date in URL, no visible date
- **Fix:** Add JSON-LD Article schema with `datePublished`

**Issue:** "False positive conflicts"
- **Cause:** Dates <7 days apart (threshold)
- **Fix:** Adjust threshold in `analyzeDateConsistency.ts` if needed

**Issue:** "Date parsing fails"
- **Cause:** Non-standard date format
- **Fix:** Add custom pattern to `extractTitleDate()` or `extractBylineDate()`

---

## 🎓 Google Leak Context

This analyzer is based on **leaked internal documentation** from Google's 2024 API leak.

### Leaked Signals

Google tracks **three date extraction methods:**

1. **bylineDate** - Explicit structured data (JSON-LD, Microdata)
2. **syntacticDate** - Extracted from URL or title
3. **semanticDate** - Derived from content

### Why This Matters

**Conflicting dates = ranking penalty**

Google's documentation explicitly states:
> "Used to sandbox fresh spam in serving time"

Translation: If your URL says "2024-01-15" but structured data says "2024-02-21", Google doesn't trust your site.

### Best Practices (From Leak)

✅ **DO:**
- Use consistent dates across all sources
- Put dates in structured data (JSON-LD)
- Update sitemap `<lastmod>` when content changes
- Use ISO 8601 format: `YYYY-MM-DD`

❌ **DON'T:**
- Have different dates in URL vs. schema
- Change published date to game "freshness"
- Use ambiguous date formats (MM/DD vs. DD/MM)
- Skip structured data entirely

---

## 📚 Next Steps

### Other Enterprise Modules

After Date Consistency, implement in this order:

1. **Index Tier Predictor** (Medium complexity, high impact)
2. **Link Tier Analyzer** (Depends on Index Tier)
3. **NavBoost Simulator** (Needs GSC API)
4. **Site Authority Score** (Complex, high value)

See [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) for full specifications.

---

## 🤝 Contributing

Found a bug? Have a feature request?

1. Check existing issues
2. Open new issue with reproduction steps
3. Submit PR with tests

---

## 📄 License

Proprietary - RankForge Enterprise SEO Tool

---

**Built with Google Algorithm Leak Intel 2024** 🔥
