import { firecrawl } from "@/lib/firecrawl";
import type {
  TechnicalAnalysis,
  LinkGraphAnalysis,
  ContentAnalysis,
  AuditSummary,
  AiRecommendation,
  ScoreBreakdown,
} from "@/types/audit";

interface AnalysisData {
  domain: string;
  score: ScoreBreakdown;
  technical: TechnicalAnalysis;
  links: LinkGraphAnalysis;
  content: Omit<ContentAnalysis, "benchmarks">;
}

/**
 * Generiert AI-basierte SEO-Empfehlungen via Firecrawl Extract (Gemini)
 */
export async function generateRecommendations(
  data: AnalysisData
): Promise<AuditSummary> {
  const issuesSummary = summarizeIssues(data);

  try {
    const result = await firecrawl.extract<{
      executiveSummary: string;
      topActions: Array<{
        priority: string;
        title: string;
        description: string;
        impact: string;
        effort: string;
        category: string;
      }>;
      phasePlan: Array<{
        phase: string;
        title: string;
        actions: string[];
      }>;
    }>(
      [`https://${data.domain}`],
      {
        type: "object",
        properties: {
          executiveSummary: { type: "string" },
          topActions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                impact: { type: "string" },
                effort: { type: "string" },
                category: { type: "string" },
              },
            },
          },
          phasePlan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                title: { type: "string" },
                actions: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      buildPrompt(data.domain, issuesSummary, data.score)
    );

    if (!result.success || !result.data) {
      return buildFallbackSummary(data);
    }

    return {
      executiveSummary: result.data.executiveSummary,
      scoreBreakdown: data.score,
      topActions: (result.data.topActions || []).map(
        (a) =>
          ({
            priority: (a.priority as "P0" | "P1" | "P2") || "P1",
            title: a.title,
            description: a.description,
            impact: a.impact,
            effort: (a.effort as "low" | "medium" | "high") || "medium",
            category: a.category as AiRecommendation["category"],
          })
      ),
      phasePlan: result.data.phasePlan || [],
    };
  } catch {
    return buildFallbackSummary(data);
  }
}

function buildPrompt(
  domain: string,
  issuesSummary: string,
  score: ScoreBreakdown
): string {
  return `Du bist ein erfahrener SEO-Berater. Analysiere die folgenden SEO-Audit-Daten für ${domain} und erstelle:

1. Ein Executive Summary (2-3 Sätze, deutsch)
2. Die Top 5-7 priorisierten Maßnahmen (P0 = Blocker, P1 = Critical, P2 = Medium)
3. Einen 3-Phasen-Plan (Sofort, Kurzfristig, Mittelfristig)

SEO-Score: Overall ${score.overall}/100 (Technical: ${score.technical}, Content: ${score.content}, Links: ${score.links})

Gefundene Probleme:
${issuesSummary}

Für jede Maßnahme gib an:
- priority: P0/P1/P2
- title: Kurzer Titel
- description: Was genau zu tun ist
- impact: Erwarteter Effekt
- effort: low/medium/high
- category: title/meta/heading/content/canonical/status/links/images/security/performance/indexing/og

Antworte auf Deutsch. Sei konkret und praxisnah.`;
}

function summarizeIssues(data: AnalysisData): string {
  const lines: string[] = [];

  // Technical Issues
  const { stats } = data.technical;
  lines.push(`## Technical SEO (Score: ${data.score.technical}/100)`);
  lines.push(`- ${stats.totalPages} Seiten analysiert, ${stats.pagesWithIssues} mit Problemen`);
  lines.push(`- P0 Blocker: ${stats.p0Count}, P1 Critical: ${stats.p1Count}, P2 Medium: ${stats.p2Count}`);

  // Top Issues (max 15)
  const topIssues = data.technical.issues.slice(0, 15);
  for (const issue of topIssues) {
    lines.push(`  [${issue.severity}] ${issue.type}: ${issue.message} (${issue.page})`);
  }

  // Link Graph
  lines.push(`\n## Link-Struktur (Score: ${data.score.links}/100)`);
  lines.push(`- ${data.links.orphanPages.length} Orphan Pages (ohne eingehende Links)`);
  lines.push(`- ${data.links.deadEndPages.length} Dead-End Pages (ohne ausgehende Links)`);
  lines.push(`- Max Crawl-Tiefe: ${data.links.maxCrawlDepth}`);
  lines.push(`- Sitemap-Coverage: ${Math.round(data.links.sitemapCoverage * 100)}%`);

  // Content
  lines.push(`\n## Content (Score: ${data.score.content}/100)`);
  lines.push(`- Durchschnittliche Wortanzahl: ${data.content.avgWordCount}`);
  lines.push(`- ${data.content.thinContentPages.length} Seiten mit Thin Content (<300 Wörter)`);
  const types = data.content.contentTypeDistribution;
  lines.push(`- Content-Typen: ${Object.entries(types).map(([k, v]) => `${k}:${v}`).join(", ")}`);

  return lines.join("\n");
}

/**
 * Fallback wenn AI nicht verfügbar - regelbasierte Empfehlungen
 */
function buildFallbackSummary(data: AnalysisData): AuditSummary {
  const actions: AiRecommendation[] = [];

  // P0 Issues direkt als Empfehlungen
  for (const issue of data.technical.issues.filter((i) => i.severity === "P0").slice(0, 3)) {
    actions.push({
      priority: "P0",
      title: `${issue.type}: ${issue.message.slice(0, 60)}`,
      description: issue.fix,
      impact: "Kritisch für Indexierung und Rankings",
      effort: "medium",
      category: issue.type,
    });
  }

  // Orphan Pages
  if (data.links.orphanPages.length > 0) {
    actions.push({
      priority: "P1",
      title: `${data.links.orphanPages.length} Orphan Pages verlinken`,
      description: `Folgende Seiten haben keine eingehenden internen Links: ${data.links.orphanPages.slice(0, 5).join(", ")}`,
      impact: "Verbessert Crawlability und Link-Juice-Verteilung",
      effort: "low",
      category: "links",
    });
  }

  // Thin Content
  if (data.content.thinContentPages.length > 0) {
    actions.push({
      priority: "P1",
      title: `${data.content.thinContentPages.length} Seiten mit Thin Content erweitern`,
      description: `Seiten mit weniger als 300 Wörtern: ${data.content.thinContentPages.slice(0, 5).join(", ")}`,
      impact: "Verbessert Content-Qualitätssignale",
      effort: "high",
      category: "content",
    });
  }

  // P1 Issues
  for (const issue of data.technical.issues.filter((i) => i.severity === "P1").slice(0, 2)) {
    actions.push({
      priority: "P1",
      title: `${issue.type}: ${issue.message.slice(0, 60)}`,
      description: issue.fix,
      impact: "Wichtig für On-Page-SEO",
      effort: "low",
      category: issue.type,
    });
  }

  return {
    executiveSummary: `Die SEO-Analyse von ${data.domain} ergibt einen Gesamtscore von ${data.score.overall}/100. Es wurden ${data.technical.stats.p0Count} kritische Blocker, ${data.technical.stats.p1Count} wichtige und ${data.technical.stats.p2Count} mittlere Probleme identifiziert. Die wichtigsten Maßnahmen betreffen ${actions[0]?.category || "verschiedene Bereiche"}.`,
    scoreBreakdown: data.score,
    topActions: actions.slice(0, 7),
    phasePlan: [
      {
        phase: "1",
        title: "Sofort (diese Woche)",
        actions: actions
          .filter((a) => a.priority === "P0")
          .map((a) => a.title),
      },
      {
        phase: "2",
        title: "Kurzfristig (2-4 Wochen)",
        actions: actions
          .filter((a) => a.priority === "P1")
          .map((a) => a.title),
      },
      {
        phase: "3",
        title: "Mittelfristig (1-3 Monate)",
        actions: actions
          .filter((a) => a.priority === "P2")
          .map((a) => a.title),
      },
    ],
  };
}
