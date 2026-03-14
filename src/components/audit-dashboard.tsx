"use client";

import type {
  TechnicalAnalysis,
  ContentAnalysis,
  LinkGraphAnalysis,
  AuditSummary,
} from "@/types/audit";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScoreCard } from "@/components/score-card";
import { IssueList } from "@/components/issue-list";
import { ContentBenchmarkChart } from "@/components/content-benchmark";

interface AuditData {
  id: string;
  url: string;
  domain: string;
  status: string;
  score: number | null;
  pagesFound: number;
  technical: TechnicalAnalysis | null;
  content: ContentAnalysis | null;
  links: LinkGraphAnalysis | null;
  summary: AuditSummary | null;
  pages: Array<{
    url: string;
    statusCode: number | null;
    title: string | null;
    score: number | null;
    issues: unknown;
  }>;
}

interface AuditDashboardProps {
  audit: AuditData;
}

const effortBadge: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

function StatCard({ title, value, description }: { title: string; value: string | number; description?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {description && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function AuditDashboard({ audit }: AuditDashboardProps) {
  const score = audit.summary?.scoreBreakdown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{audit.domain}</h1>
          <p className="text-sm text-muted-foreground">{audit.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={audit.status === "done" ? "default" : "secondary"}>
            {audit.status}
          </Badge>
          {audit.score !== null && (
            <Badge
              className={
                audit.score > 70
                  ? "bg-green-500 text-white hover:bg-green-500"
                  : audit.score >= 40
                    ? "bg-yellow-500 text-white hover:bg-yellow-500"
                    : "bg-red-500 text-white hover:bg-red-500"
              }
            >
              Score: {audit.score}
            </Badge>
          )}
          <Badge variant="outline">{audit.pagesFound} Seiten</Badge>
        </div>
      </div>

      <Separator />

      {/* Main Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Uebersicht</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              {score ? (
                <ScoreCard
                  overall={score.overall}
                  breakdown={score}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Score wird berechnet...
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="md:col-span-2 space-y-6">
              {/* Executive Summary */}
              {audit.summary?.executiveSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{audit.summary.executiveSummary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Top Actions */}
              {audit.summary?.topActions && audit.summary.topActions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Empfehlungen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {audit.summary.topActions.map((action, idx) => (
                        <div key={idx} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                            {idx + 1}
                          </span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{action.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {action.category}
                              </Badge>
                              <Badge className={`text-xs ${effortBadge[action.effort] || ""}`}>
                                Aufwand: {action.effort}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Impact: {action.impact}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Technical SEO Tab */}
        <TabsContent value="technical" className="mt-6 space-y-6">
          {audit.technical ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Gesamtseiten" value={audit.technical.stats.totalPages} />
                <StatCard title="Seiten mit Issues" value={audit.technical.stats.pagesWithIssues} />
                <StatCard title="P0 (Kritisch)" value={audit.technical.stats.p0Count} />
                <StatCard title="P1 + P2" value={audit.technical.stats.p1Count + audit.technical.stats.p2Count} />
              </div>
              <IssueList issues={audit.technical.issues} />
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Technische Analyse noch nicht verfuegbar.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6 space-y-6">
          {audit.content ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  title="Durchschnitt Wortanzahl"
                  value={Math.round(audit.content.avgWordCount)}
                />
                <StatCard
                  title="Thin Content Seiten"
                  value={audit.content.thinContentPages.length}
                  description="Seiten mit zu wenig Inhalt"
                />
                <StatCard
                  title="Analysierte Seiten"
                  value={audit.content.pages.length}
                />
              </div>

              <ContentBenchmarkChart benchmarks={audit.content.benchmarks} />

              {/* Thin Content Pages */}
              {audit.content.thinContentPages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Thin Content Seiten</CardTitle>
                    <CardDescription>
                      Diese Seiten haben zu wenig Inhalt und sollten erweitert werden.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {audit.content.thinContentPages.map((url) => (
                        <li key={url} className="text-sm text-muted-foreground truncate">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Content-Analyse noch nicht verfuegbar.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="mt-6 space-y-6">
          {audit.links ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Orphan Seiten"
                  value={audit.links.orphanPages.length}
                  description="Seiten ohne interne Links"
                />
                <StatCard
                  title="Dead-End Seiten"
                  value={audit.links.deadEndPages.length}
                  description="Seiten ohne ausgehende Links"
                />
                <StatCard
                  title="Max Crawl-Tiefe"
                  value={audit.links.maxCrawlDepth}
                />
                <StatCard
                  title="Avg. interne Links"
                  value={Math.round(audit.links.avgInternalLinks * 10) / 10}
                />
              </div>

              {/* Sitemap Coverage */}
              <Card>
                <CardHeader>
                  <CardTitle>Sitemap-Abdeckung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.round(audit.links.sitemapCoverage * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(audit.links.sitemapCoverage * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Orphan Pages List */}
              {audit.links.orphanPages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Orphan Seiten</CardTitle>
                    <CardDescription>
                      Diese Seiten werden von keiner anderen Seite intern verlinkt.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {audit.links.orphanPages.map((url) => (
                        <li key={url} className="text-sm text-muted-foreground truncate">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Dead End Pages List */}
              {audit.links.deadEndPages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Dead-End Seiten</CardTitle>
                    <CardDescription>
                      Diese Seiten haben keine ausgehenden internen Links.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {audit.links.deadEndPages.map((url) => (
                        <li key={url} className="text-sm text-muted-foreground truncate">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Page Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Seiten-Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">URL</th>
                          <th className="pb-2 font-medium text-right">Eingehend</th>
                          <th className="pb-2 font-medium text-right">Ausgehend</th>
                          <th className="pb-2 font-medium text-right">Extern</th>
                          <th className="pb-2 font-medium text-right">Tiefe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.links.nodes.slice(0, 20).map((node) => (
                          <tr key={node.url} className="border-b last:border-0">
                            <td className="py-2 max-w-[300px] truncate text-muted-foreground">
                              {node.url}
                            </td>
                            <td className="py-2 text-right">{node.internalIncoming}</td>
                            <td className="py-2 text-right">{node.internalOutgoing}</td>
                            <td className="py-2 text-right">{node.externalOutgoing}</td>
                            <td className="py-2 text-right">{node.crawlDepth}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {audit.links.nodes.length > 20 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Zeige 20 von {audit.links.nodes.length} Seiten
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Link-Analyse noch nicht verfuegbar.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
