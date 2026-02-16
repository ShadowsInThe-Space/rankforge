"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  TechnicalAnalysis,
  ContentAnalysis,
  LinkGraphAnalysis,
  AuditSummary,
} from "@/types/audit";

interface AuditData {
  id: string;
  url: string;
  domain: string;
  status: string;
  score: number | null;
  pagesFound: number;
  createdAt: string;
  error: string | null;
  technical: TechnicalAnalysis | null;
  content: ContentAnalysis | null;
  links: LinkGraphAnalysis | null;
  summary: AuditSummary | null;
  pages: Array<{
    url: string;
    statusCode: number | null;
    title: string | null;
    score: number | null;
    wordCount: number | null;
    issues: unknown;
    contentType: string | null;
  }>;
}

const statusLabels: Record<string, string> = {
  pending: "Wartend...",
  mapping: "URLs werden entdeckt...",
  crawling: "Seiten werden gecrawlt...",
  analyzing: "Analyse läuft...",
  done: "Fertig",
  error: "Fehler",
};

export default function AuditResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "technical" | "content" | "links"
  >("overview");

  useEffect(() => {
    fetchAudit();
  }, [id]);

  useEffect(() => {
    if (!audit || ["done", "error"].includes(audit.status)) return;
    const interval = setInterval(fetchAudit, 3000);
    return () => clearInterval(interval);
  }, [audit?.status]);

  async function fetchAudit() {
    const res = await fetch(`/api/audit/${id}`);
    if (res.ok) {
      setAudit(await res.json());
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!audit) {
    return <p className="text-center py-20 text-muted-foreground">Audit nicht gefunden</p>;
  }

  // Progress-Ansicht für laufende Audits
  if (audit.status !== "done" && audit.status !== "error") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">{audit.domain}</h2>
        <p className="text-lg text-muted-foreground mb-4">
          {statusLabels[audit.status]}
        </p>
        {audit.pagesFound > 0 && (
          <p className="text-sm text-muted-foreground">
            {audit.pagesFound} Seiten gefunden
          </p>
        )}
      </div>
    );
  }

  if (audit.status === "error") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold mb-2 text-red-500">Fehler</h2>
        <p className="text-muted-foreground">{audit.error || "Unbekannter Fehler"}</p>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "Übersicht" },
    { key: "technical" as const, label: "Technical SEO" },
    { key: "content" as const, label: "Content" },
    { key: "links" as const, label: "Links" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{audit.domain}</h1>
          <p className="text-muted-foreground">{audit.url} - {audit.pagesFound} Seiten</p>
        </div>
        {audit.score !== null && (
          <div
            className={`text-5xl font-bold ${
              audit.score >= 70
                ? "text-green-500"
                : audit.score >= 40
                ? "text-yellow-500"
                : "text-red-500"
            }`}
          >
            {audit.score}
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab audit={audit} />}
      {activeTab === "technical" && <TechnicalTab audit={audit} />}
      {activeTab === "content" && <ContentTab audit={audit} />}
      {activeTab === "links" && <LinksTab audit={audit} />}
    </div>
  );
}

// ─── Tab Components ────────────────────────────────────────

function OverviewTab({ audit }: { audit: AuditData }) {
  const summary = audit.summary;
  const score = summary?.scoreBreakdown;

  return (
    <div className="space-y-6">
      {/* Score Breakdown */}
      {score && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Technical SEO", value: score.technical },
            { label: "Content", value: score.content },
            { label: "Links", value: score.links },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    item.value >= 70
                      ? "text-green-500"
                      : item.value >= 40
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                >
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Executive Summary */}
      {summary?.executiveSummary && (
        <Card>
          <CardContent className="py-6">
            <h3 className="font-medium mb-2">Executive Summary</h3>
            <p className="text-muted-foreground">{summary.executiveSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Top Actions */}
      {summary?.topActions && summary.topActions.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="font-medium mb-4">Top Maßnahmen</h3>
            <div className="space-y-3">
              {summary.topActions.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <Badge
                    variant="secondary"
                    className={
                      action.priority === "P0"
                        ? "bg-red-500 text-white"
                        : action.priority === "P1"
                        ? "bg-orange-500 text-white"
                        : "bg-yellow-500 text-white"
                    }
                  >
                    {action.priority}
                  </Badge>
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Impact: {action.impact}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Aufwand: {action.effort}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Plan */}
      {summary?.phasePlan && summary.phasePlan.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="font-medium mb-4">Phasen-Plan</h3>
            <div className="grid grid-cols-3 gap-4">
              {summary.phasePlan.map((phase, i) => (
                <div key={i}>
                  <p className="font-medium text-sm mb-2">
                    Phase {phase.phase}: {phase.title}
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {phase.actions.map((action, j) => (
                      <li key={j} className="flex gap-1">
                        <span className="text-primary">-</span> {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TechnicalTab({ audit }: { audit: AuditData }) {
  const technical = audit.technical;
  if (!technical) return <p className="text-muted-foreground">Keine Daten</p>;

  const [filter, setFilter] = useState<"all" | "P0" | "P1" | "P2">("all");
  const filtered =
    filter === "all"
      ? technical.issues
      : technical.issues.filter((i) => i.severity === filter);

  const severityColors = {
    P0: "bg-red-500 text-white",
    P1: "bg-orange-500 text-white",
    P2: "bg-yellow-500 text-white",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {technical.issues.length} Issues gefunden
        </p>
        <div className="flex gap-1">
          {(["all", "P0", "P1", "P2"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Alle" : f} (
              {f === "all"
                ? technical.issues.length
                : technical.issues.filter((i) => i.severity === f).length}
              )
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((issue, i) => (
          <Card key={i}>
            <CardContent className="py-3 flex items-start gap-3">
              <Badge className={severityColors[issue.severity]}>
                {issue.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {issue.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {issue.page}
                  </span>
                </div>
                <p className="text-sm mt-1">{issue.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fix: {issue.fix}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContentTab({ audit }: { audit: AuditData }) {
  const content = audit.content;
  if (!content) return <p className="text-muted-foreground">Keine Daten</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{content.avgWordCount}</p>
            <p className="text-xs text-muted-foreground">Ø Wörter</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{content.pages.length}</p>
            <p className="text-xs text-muted-foreground">Seiten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {content.thinContentPages.length}
            </p>
            <p className="text-xs text-muted-foreground">Thin Content</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {Object.keys(content.contentTypeDistribution).length}
            </p>
            <p className="text-xs text-muted-foreground">Content-Typen</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Type Distribution */}
      <Card>
        <CardContent className="py-6">
          <h3 className="font-medium mb-4">Content-Typen</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(content.contentTypeDistribution).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-sm">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Page List */}
      <Card>
        <CardContent className="py-6">
          <h3 className="font-medium mb-4">Seiten-Details</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {audit.pages
              .sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0))
              .map((page, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                >
                  <span className="truncate flex-1">{page.url}</span>
                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className={`${
                        (page.wordCount ?? 0) < 300
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {page.wordCount ?? 0} Wörter
                    </span>
                    {page.contentType && (
                      <Badge variant="outline" className="text-xs">
                        {page.contentType}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LinksTab({ audit }: { audit: AuditData }) {
  const links = audit.links;
  if (!links) return <p className="text-muted-foreground">Keine Daten</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{links.nodes.length}</p>
            <p className="text-xs text-muted-foreground">Seiten im Graph</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {links.orphanPages.length}
            </p>
            <p className="text-xs text-muted-foreground">Orphan Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-orange-500">
              {links.deadEndPages.length}
            </p>
            <p className="text-xs text-muted-foreground">Dead Ends</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{links.maxCrawlDepth}</p>
            <p className="text-xs text-muted-foreground">Max Crawl-Tiefe</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-lg font-bold">{links.avgInternalLinks.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Ø Interne Links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-lg font-bold">
              {Math.round(links.sitemapCoverage * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">Sitemap Coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Orphan Pages */}
      {links.orphanPages.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="font-medium mb-3 text-red-500">
              Orphan Pages (ohne eingehende Links)
            </h3>
            <ul className="space-y-1 text-sm">
              {links.orphanPages.map((url, i) => (
                <li key={i} className="text-muted-foreground truncate">
                  {url}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dead End Pages */}
      {links.deadEndPages.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="font-medium mb-3 text-orange-500">
              Dead-End Pages (ohne ausgehende Links)
            </h3>
            <ul className="space-y-1 text-sm">
              {links.deadEndPages.map((url, i) => (
                <li key={i} className="text-muted-foreground truncate">
                  {url}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Link-Graph Nodes */}
      <Card>
        <CardContent className="py-6">
          <h3 className="font-medium mb-4">Link-Graph Details</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {links.nodes
              .sort((a, b) => b.internalIncoming - a.internalIncoming)
              .map((node, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                >
                  <span className="truncate flex-1">{node.url}</span>
                  <div className="flex items-center gap-4 ml-4 text-xs text-muted-foreground">
                    <span>In: {node.internalIncoming}</span>
                    <span>Out: {node.internalOutgoing}</span>
                    <span>Tiefe: {node.crawlDepth}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
