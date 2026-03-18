"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOHelpDialog } from "@/components/seo-help";
import { DateConsistencyReportCard } from "@/components/date-consistency-report";
import { IndexTierReportCard } from "@/components/index-tier-report";
import { NavBoostReport } from "@/components/navboost-report";
import { LinkTierReport } from "@/components/link-tier-report";
import { 
  GradeCircle, 
  CategoryBreakdown, 
  RecommendationsList, 
  PDFExportButton, 
  usePDFExport,
  CategoryRadar,
  SeverityChart,
  PageScoreDistribution
} from "@/components/report";
import { CompetitorComparison } from "@/components/competitor-comparison";
import { ScoreHistory } from "@/components/score-history";
import { QuickFixSuggestions } from "@/components/quick-fix";
import { ExportReport } from "@/components/export-report";
import { 
  Download, 
  Gauge, 
  FileText, 
  Link2, 
  Zap, 
  Eye,
  Smartphone,
  Shield
} from "lucide-react";
import type {
  TechnicalAnalysis,
  ContentAnalysis,
  LinkGraphAnalysis,
  AuditSummary,
} from "@/types/audit";
import type { DateConsistencyReport } from "@/lib/analyzers/date-consistency";
import type { TierPrediction } from "@/lib/analyzers/index-tier";
import type { SiteNavBoostReport } from "@/lib/analyzers/navboost";
import type { SiteLinkTierReport } from "@/lib/analyzers/link-tier";

interface AuditData {
  id: string;
  url: string;
  domain: string;
  status: string;
  score: number | null;
  grade: string | null;
  pagesFound: number;
  createdAt: string;
  error: string | null;
  progress?: number;
  isPublic?: boolean;
  shareToken?: string | null;
  technical: TechnicalAnalysis | null;
  content: ContentAnalysis | null;
  links: LinkGraphAnalysis | null;
  summary: AuditSummary | null;
  dateConsistency: Array<{
    url: string;
    report: DateConsistencyReport;
  }> | null;
  indexTier: Array<{
    url: string;
    prediction: TierPrediction;
  }> | null;
  navboostScore: number | null;
  navboostAnalysis: SiteNavBoostReport | null;
  linkTierScore: number | null;
  linkTierAnalysis: SiteLinkTierReport | null;
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
    "overview" | "technical" | "content" | "links" | "dates" | "tiers" | "navboost" | "linkTiers" | "competitor" | "history" | "quickfix" | "export"
  >("overview");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  async function fetchAudit() {
    const res = await fetch(`/api/audit/${id}`);
    if (res.ok) {
      setAudit(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!audit || ["done", "error"].includes(audit.status)) return;
    const interval = setInterval(fetchAudit, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit?.status]);

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
    const progress = audit.progress || 0;
    
    // Calculate time remaining estimate
    const createdAt = new Date(audit.createdAt).getTime();
    const now = Date.now();
    const elapsedMs = now - createdAt;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    
    // Estimate time remaining based on current progress and pages found
    let timeRemaining = null;
    if (audit.status === "crawling" && audit.pagesFound > 0) {
      const avgTimePerPage = elapsedMs / audit.pagesFound; // ms per page
      const estimatedTotalPages = Math.max(audit.pagesFound * 2, 20); // Assume at least 20 pages or double current
      const remainingPages = Math.max(estimatedTotalPages - audit.pagesFound, 5);
      const estimatedRemainingMs = avgTimePerPage * remainingPages;
      const remainingSec = Math.floor(estimatedRemainingMs / 1000);
      
      if (remainingSec > 0) {
        const minutes = Math.floor(remainingSec / 60);
        const seconds = remainingSec % 60;
        timeRemaining = minutes > 0 ? `~${minutes}m ${seconds}s` : `~${seconds}s`;
      }
    }
    
    // Format elapsed time
    const formatElapsed = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };
    
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* Circular Progress */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${progress * 2.83} 283`}
              strokeLinecap="round"
              className="text-primary transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{progress}%</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{audit.domain}</h2>
        <p className="text-lg text-muted-foreground mb-4">
          {statusLabels[audit.status]}
        </p>
        
        {/* Scanning Progress Message */}
        {audit.status === "crawling" && audit.pagesFound > 0 && (
          <div className="mb-4">
            <p className="text-lg font-medium text-primary animate-pulse">
              🔍 Scanning {audit.pagesFound} Seiten...
            </p>
          </div>
        )}
        
        {/* Time Info */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span>Verstrichen: {formatElapsed(elapsedSec)}</span>
          </div>
          {timeRemaining && audit.status === "crawling" && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span>⏳</span>
                <span>Verbleibend: {timeRemaining}</span>
              </div>
            </>
          )}
        </div>
        
        {audit.pagesFound > 0 && audit.status !== "crawling" && (
          <p className="text-sm text-muted-foreground mb-4">
            {audit.pagesFound} Seiten gefunden
          </p>
        )}
        
        {/* Progress Steps */}
        <div className="mt-8 flex justify-center gap-2">
          {["mapping", "crawling", "analyzing"].map((step) => {
            const stepProgress = {
              mapping: 10,
              crawling: 50,
              analyzing: 80,
            }[step] as number;
            
            const isActive = progress >= stepProgress;
            const isCurrent = audit.status === step;
            
            return (
              <div
                key={step}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isActive
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step === "mapping" && "🔍 URL Discovery"}
                {step === "crawling" && "🕷️ Crawling"}
                {step === "analyzing" && "📊 Analyse"}
              </div>
            );
          })}
        </div>
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
    { key: "dates" as const, label: "Date Consistency" },
    { key: "tiers" as const, label: "Index Tiers 💎" },
    { key: "navboost" as const, label: "NavBoost 🚀" },
    { key: "linkTiers" as const, label: "Link Tiers 🔗" },
    { key: "competitor" as const, label: "Vergleich ⚖️" },
    { key: "history" as const, label: "Verlauf 📈" },
    { key: "quickfix" as const, label: "Quick Fix ⚡" },
    { key: "export" as const, label: "Export 📤" },
  ];

  // Prepare categories for PDF export (plain data - no JSX)
  const categoriesForPdf = [
    { name: "Technical", score: audit.summary?.scoreBreakdown.technical ?? 0, status: (audit.summary?.scoreBreakdown.technical ?? 0) >= 70 ? "good" : (audit.summary?.scoreBreakdown.technical ?? 0) >= 40 ? "warning" : "critical" },
    { name: "Content", score: audit.summary?.scoreBreakdown.content ?? 0, status: (audit.summary?.scoreBreakdown.content ?? 0) >= 70 ? "good" : (audit.summary?.scoreBreakdown.content ?? 0) >= 40 ? "warning" : "critical" },
    { name: "Links", score: audit.summary?.scoreBreakdown.links ?? 0, status: (audit.summary?.scoreBreakdown.links ?? 0) >= 70 ? "good" : (audit.summary?.scoreBreakdown.links ?? 0) >= 40 ? "warning" : "critical" },
    { name: "Performance", score: 75, status: "good" },
    { name: "UX", score: 80, status: "good" },
    { name: "Security", score: 100, status: "good" },
  ];

  // Prepare recommendations for PDF export
  const { pdfData } = usePDFExport({
    domain: audit.domain,
    url: audit.url,
    score: audit.score,
    pagesFound: audit.pagesFound,
    categories: categoriesForPdf,
    recommendations: audit.summary?.topActions.map((action, idx) => ({
      id: `rec-${idx}`,
      title: action.title,
      description: action.description,
      priority: action.priority === "P0" ? "high" as const : action.priority === "P1" ? "medium" as const : "low" as const,
      impact: action.impact,
      effort: action.effort,
      category: action.category,
      fix: `Priority: ${action.priority}, Impact: ${action.impact}, Effort: ${action.effort}`
    })) ?? []
  });

  // Export to CSV
  async function exportCSV() {
    if (!audit) return;
    try {
      const res = await fetch(`/api/audit/${audit.id}`, { method: "PUT" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${audit.domain}-audit.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  }

  // Get grade from audit (or compute from score)
  const displayGrade = audit.grade || (audit.score !== null ? (
    audit.score >= 90 ? "A" :
    audit.score >= 75 ? "B" :
    audit.score >= 60 ? "C" :
    audit.score >= 40 ? "D" : "F"
  ) : null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{audit.domain}</h1>
            <p className="text-muted-foreground">{audit.url} - {audit.pagesFound} Seiten</p>
          </div>
          {displayGrade && (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl ${
              displayGrade === "A" ? "bg-green-500" :
              displayGrade === "B" ? "bg-blue-500" :
              displayGrade === "C" ? "bg-yellow-500" :
              displayGrade === "D" ? "bg-orange-500" : "bg-red-500"
            }`}>
              {displayGrade}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SEOHelpDialog />
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <PDFExportButton data={pdfData} />
          {audit.score !== null && (
            <GradeCircle score={audit.score} size="lg" />
          )}
        </div>
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
      {activeTab === "dates" && <DatesTab audit={audit} />}
      {activeTab === "tiers" && <TiersTab audit={audit} />}
      {activeTab === "navboost" && <NavBoostTab audit={audit} />}
      {activeTab === "linkTiers" && <LinkTiersTab audit={audit} />}
      {activeTab === "competitor" && <CompetitorTab audit={audit} />}
      {activeTab === "history" && <HistoryTab audit={audit} />}
      {activeTab === "quickfix" && <QuickFixTab audit={audit} />}
      {activeTab === "export" && <ExportTab audit={audit} />}
    </div>
  );
}

// ─── Tab Components ────────────────────────────────────────

function OverviewTab({ audit }: { audit: AuditData }) {
  const summary = audit.summary;
  const score = summary?.scoreBreakdown;

  // Prepare categories for CategoryBreakdown component
  const categories = [
    { 
      name: "Technical", 
      score: score?.technical ?? 0, 
      icon: <Gauge className="w-5 h-5" />,
      description: "Meta tags, sitemaps, indexing",
      status: (score?.technical ?? 0) >= 70 ? "good" as const : (score?.technical ?? 0) >= 40 ? "warning" as const : "critical" as const
    },
    { 
      name: "Content", 
      score: score?.content ?? 0, 
      icon: <FileText className="w-5 h-5" />,
      description: "Word count, quality, thin pages",
      status: (score?.content ?? 0) >= 70 ? "good" as const : (score?.content ?? 0) >= 40 ? "warning" as const : "critical" as const
    },
    { 
      name: "Links", 
      score: score?.links ?? 0, 
      icon: <Link2 className="w-5 h-5" />,
      description: "Internal links, orphan pages",
      status: (score?.links ?? 0) >= 70 ? "good" as const : (score?.links ?? 0) >= 40 ? "warning" as const : "critical" as const
    },
    { 
      name: "Performance", 
      score: 75, 
      icon: <Zap className="w-5 h-5" />,
      description: "Core Web Vitals",
      status: "good" as const
    },
    { 
      name: "Mobile", 
      score: 80, 
      icon: <Smartphone className="w-5 h-5" />,
      description: "Mobile-friendliness",
      status: "good" as const
    },
    { 
      name: "Security", 
      score: 100, 
      icon: <Shield className="w-5 h-5" />,
      description: "HTTPS, security headers",
      status: "good" as const
    },
  ];

  // Prepare recommendations for the new component
  const recommendations = summary?.topActions.map((action, idx) => ({
    id: `rec-${idx}`,
    title: action.title,
    description: action.description,
    impact: action.impact,
    effort: action.effort,
    priority: action.priority === "P0" ? "high" as const : action.priority === "P1" ? "medium" as const : "low" as const,
    category: action.category,
    fix: `To fix this issue: Consider ${action.effort} effort changes. Expected impact: ${action.impact}.`
  })) ?? [];

  // Severity distribution for chart
  const severityData = [
    { name: "Critical (P0)", value: audit.technical?.stats.p0Count ?? 0, color: "#ef4444" },
    { name: "Important (P1)", value: audit.technical?.stats.p1Count ?? 0, color: "#eab308" },
    { name: "Warning (P2)", value: audit.technical?.stats.p2Count ?? 0, color: "#22c55e" },
  ];

  // Radar chart data
  const radarData = categories.map(cat => ({
    category: cat.name,
    score: cat.score,
    fullMark: 100
  }));

  return (
    <div className="space-y-8">
      {/* Professional Grade Circle & Category Breakdown */}
      {audit.score !== null && (
        <>
          <div className="flex items-center justify-center mb-6">
            <GradeCircle score={audit.score} size="lg" />
          </div>
          <CategoryBreakdown categories={categories} />
        </>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryRadar data={radarData} title="SEO Category Analysis" />
        <SeverityChart data={severityData} title="Issues by Severity" />
      </div>

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
                    (item.value ?? 0) >= 70
                      ? "text-green-500"
                      : (item.value ?? 0) >= 40
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

      {/* Top Recommendations - Professional Component */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Prioritized Recommendations</h3>
          <RecommendationsList recommendations={recommendations} maxItems={15} />
        </div>
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
  const [filter, setFilter] = useState<"all" | "P0" | "P1" | "P2">("all");
  
  if (!technical) return <p className="text-muted-foreground">Keine Daten</p>;

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

function DatesTab({ audit }: { audit: AuditData }) {
  const dateAnalysis = audit.dateConsistency;
  
  if (!dateAnalysis || dateAnalysis.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Keine Date Consistency Daten verfügbar</p>
      </div>
    );
  }

  // Calculate overall stats
  const avgScore = Math.round(
    dateAnalysis.reduce((sum, item) => sum + item.report.score, 0) / dateAnalysis.length
  );
  const highConflicts = dateAnalysis.filter((item) =>
    item.report.conflicts.some((c) => c.severity === "HIGH")
  ).length;
  const mediumConflicts = dateAnalysis.filter((item) =>
    item.report.conflicts.some((c) => c.severity === "MEDIUM")
  ).length;
  const pagesWithIssues = dateAnalysis.filter(
    (item) => item.report.conflicts.length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p
              className={`text-3xl font-bold ${
                avgScore >= 90
                  ? "text-green-500"
                  : avgScore >= 70
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {avgScore}
            </p>
            <p className="text-xs text-muted-foreground">Avg. Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold">{dateAnalysis.length}</p>
            <p className="text-xs text-muted-foreground">Pages Analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-red-500">{highConflicts}</p>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-orange-500">{mediumConflicts}</p>
            <p className="text-xs text-muted-foreground">Medium Priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔍</div>
            <div>
              <h4 className="font-semibold mb-1">Was ist Date Consistency? (Google Leak 2024)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Google extrahiert Daten aus <strong>mehreren Quellen</strong>:
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <strong>bylineDate</strong><br/>
                  <span className="text-xs">Structured Data (JSON-LD)</span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <strong>URL-Datum</strong><br/>
                  <span className="text-xs">Z.B. /2024/01/15/</span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <strong>Content</strong><br/>
                  <span className="text-xs">Im Text gefunden</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Wichtig:</strong> Wenn diese Daten inkonsistent sind (z.B. 2023 im Title, 2019 im Content),
                kann Google die Seite <span className="text-red-500">schlechter ranken</span>!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages with Issues First */}
      {pagesWithIssues > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-500">
            Pages with Date Conflicts ({pagesWithIssues})
          </h3>
          <div className="space-y-4">
            {dateAnalysis
              .filter((item) => item.report.conflicts.length > 0)
              .sort((a, b) => a.report.score - b.report.score)
              .map((item, idx) => (
                <DateConsistencyReportCard key={idx} report={item.report} url={item.url} />
              ))}
          </div>
        </div>
      )}

      {/* Perfect Pages */}
      {dateAnalysis.length - pagesWithIssues > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-green-500">
            Perfect Date Consistency ({dateAnalysis.length - pagesWithIssues})
          </h3>
          <div className="space-y-4">
            {dateAnalysis
              .filter((item) => item.report.conflicts.length === 0)
              .map((item, idx) => (
                <DateConsistencyReportCard key={idx} report={item.report} url={item.url} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TiersTab({ audit }: { audit: AuditData }) {
  const tierAnalysis = audit.indexTier;

  if (!tierAnalysis || tierAnalysis.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">
          Keine Index Tier Daten verfügbar
        </p>
      </div>
    );
  }

  // Calculate overall stats
  const avgScore = Math.round(
    tierAnalysis.reduce((sum, item) => sum + item.prediction.overallScore, 0) /
      tierAnalysis.length
  );

  const baseTier = tierAnalysis.filter((item) =>
    item.prediction.tier.includes("Base")
  ).length;
  const zeppelinTier = tierAnalysis.filter((item) =>
    item.prediction.tier.includes("Zeppelin")
  ).length;
  const landfillTier = tierAnalysis.filter((item) =>
    item.prediction.tier.includes("Landfill")
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className={`text-3xl font-bold ${avgScore >= 80 ? "text-green-600" : avgScore >= 50 ? "text-blue-600" : "text-orange-600"}`}>
              {avgScore}
            </p>
            <p className="text-xs text-muted-foreground">Avg. Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-600">💎 {baseTier}</p>
            <p className="text-xs text-muted-foreground">Base (Premium)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-blue-600">👍 {zeppelinTier}</p>
            <p className="text-xs text-muted-foreground">Zeppelin (Mid)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-orange-600">🗑️ {landfillTier}</p>
            <p className="text-xs text-muted-foreground">Landfill (Low)</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💎</div>
            <div>
              <h4 className="font-semibold mb-1">Was sind Index Tiers? (Google Leak 2024)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Google speichert Seiten in 3 Tiers basierend auf Qualität und Wichtigkeit:
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                  <strong className="text-green-700">💎 Base</strong> (Flash/RAM)<br/>
                  <span className="text-xs">Premium-Tier, höchster Link-Wert, häufig gecrawlt</span>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded">
                  <strong className="text-blue-700">👍 Zeppelin</strong> (SSD)<br/>
                  <span className="text-xs">Mittleres Tier, guter Link-Wert, mittlere Crawl-Frequenz</span>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded">
                  <strong className="text-orange-700">🗑️ Landfill</strong> (HDD)<br/>
                  <span className="text-xs">Niedrigste Priorität, kaum gecrawlt, schlechtes Ranking</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Links von Base-Tier Seiten sind am wertvollsten für dein Ranking!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Base Tier Pages */}
      {baseTier > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-green-600 flex items-center gap-2">
            <span>💎</span>
            <span>Base Tier Pages ({baseTier})</span>
          </h3>
          <div className="space-y-4">
            {tierAnalysis
              .filter((item) => item.prediction.tier.includes("Base"))
              .sort((a, b) => b.prediction.overallScore - a.prediction.overallScore)
              .map((item, idx) => (
                <IndexTierReportCard key={idx} prediction={item.prediction} url={item.url} />
              ))}
          </div>
        </div>
      )}

      {/* Zeppelin Tier Pages */}
      {zeppelinTier > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
            <span>👍</span>
            <span>Zeppelin Tier Pages ({zeppelinTier})</span>
          </h3>
          <div className="space-y-4">
            {tierAnalysis
              .filter((item) => item.prediction.tier.includes("Zeppelin"))
              .sort((a, b) => b.prediction.overallScore - a.prediction.overallScore)
              .map((item, idx) => (
                <IndexTierReportCard key={idx} prediction={item.prediction} url={item.url} />
              ))}
          </div>
        </div>
      )}

      {/* Landfill Tier Pages */}
      {landfillTier > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-orange-600 flex items-center gap-2">
            <span>🗑️</span>
            <span>Landfill Tier Pages ({landfillTier}) - Needs Improvement</span>
          </h3>
          <div className="space-y-4">
            {tierAnalysis
              .filter((item) => item.prediction.tier.includes("Landfill"))
              .sort((a, b) => a.prediction.overallScore - b.prediction.overallScore)
              .map((item, idx) => (
                <IndexTierReportCard key={idx} prediction={item.prediction} url={item.url} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NavBoostTab({ audit }: { audit: AuditData }) {
  if (!audit.navboostAnalysis) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            NavBoost-Analyse nicht verfügbar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* German Explanation Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <h4 className="font-semibold mb-2">💡 Was ist NavBoost?</h4>
          <p className="text-sm text-muted-foreground mb-2">
            NavBoost ist ein Google-Algorithmus aus dem Leak 2024, der User-Engagement misst.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>📊 <strong>CTR</strong>: Klickrate aus Suchergebnissen</div>
            <div>⏱️ <strong>Dwell Time</strong>: Verweildauer auf der Seite</div>
            <div>🔙 <strong>Pogo-Sticking</strong>: Schnelles Zurückspringen (negativ)</div>
            <div>👍 <strong>Last-Click</strong>: Nutzer findet was er sucht</div>
          </div>
        </CardContent>
      </Card>

      <NavBoostReport report={audit.navboostAnalysis} />
    </div>
  );
}

function LinkTiersTab({ audit }: { audit: AuditData }) {
  if (!audit.linkTierAnalysis) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Link Tier-Analyse nicht verfügbar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* German Explanation Card */}
      <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
        <CardContent className="py-4">
          <h4 className="font-semibold mb-2">🔗 Was sind Link Tiers?</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Der Wert eines Links hängt davon ab, von welcher Seite er kommt!
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
              <strong className="text-green-700">💎 Base</strong> (3.0x)<br/>
              <span className="text-xs">Höchster Link-Wert</span>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded">
              <strong className="text-blue-700">👍 Zeppelin</strong> (1.5x)<br/>
              <span className="text-xs">Mittlerer Link-Wert</span>
            </div>
            <div className="bg-red-100 dark:bg-red-900 p-2 rounded">
              <strong className="text-red-700">🗑️ Landfill</strong> (0.5x)<br/>
              <span className="text-xs">Niedrigster Link-Wert</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Links von Base-Tier Seiten sind 6x wertvoller als Links von Landfill-Seiten!
          </p>
        </CardContent>
      </Card>

      <LinkTierReport report={audit.linkTierAnalysis} />
    </div>
  );
}

// ─── USP Tab Components ────────────────────────────────────

function CompetitorTab({ audit }: { audit: AuditData }) {
  // Prepare primary site data from current audit
  const primaryData = audit.status === "done" ? {
    domain: audit.domain,
    url: audit.url,
    score: audit.score,
    grade: audit.grade,
    pagesFound: audit.pagesFound,
    technical: {
      score: audit.summary?.scoreBreakdown?.technical ?? 0,
      issues: {
        count: audit.technical?.issues?.length ?? 0,
        critical: audit.technical?.stats?.p0Count ?? 0,
      },
    },
    content: {
      avgWordCount: audit.content?.avgWordCount ?? 0,
      thinContent: audit.content?.thinContentPages?.length ?? 0,
    },
    links: {
      total: audit.links?.nodes?.length ?? 0,
      orphan: audit.links?.orphanPages?.length ?? 0,
    },
  } : undefined;
  
  return (
    <CompetitorComparison 
      primaryUrl={audit.url} 
      primaryData={primaryData}
    />
  );
}

function HistoryTab({ audit }: { audit: AuditData }) {
  return (
    <ScoreHistory domain={audit.domain} currentScore={audit.score} />
  );
}

function QuickFixTab({ audit }: { audit: AuditData }) {
  // Extract issues from technical analysis
  const issues = audit.technical?.issues ?? [];
  
  return (
    <QuickFixSuggestions 
      auditId={audit.id} 
      issues={issues as Array<{
        type: string;
        severity: string;
        page: string;
        message: string;
        fix: string;
      }>} 
    />
  );
}

function ExportTab({ audit }: { audit: AuditData }) {
  return (
    <ExportReport 
      audit={{
        id: audit.id,
        url: audit.url,
        domain: audit.domain,
        score: audit.score,
        grade: audit.grade,
        pagesFound: audit.pagesFound,
        createdAt: audit.createdAt,
        isPublic: audit.isPublic ?? false,
        shareToken: audit.shareToken ?? null,
      }} 
    />
  );
}
