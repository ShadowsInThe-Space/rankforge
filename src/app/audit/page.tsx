"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink, 
  Search, 
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRightLeft
} from "lucide-react";

interface AuditHistory {
  id: string;
  auditId: string;
  domain: string;
  score: number;
  grade: string;
  pagesFound: number;
  createdAt: string;
}

interface AuditComparison {
  older: {
    id: string;
    auditId: string;
    score: number;
    grade: string;
    pagesFound: number;
    createdAt: string;
    navboostScore: number | null;
    linkTierScore: number | null;
  };
  newer: {
    id: string;
    auditId: string;
    score: number;
    grade: string;
    pagesFound: number;
    createdAt: string;
    navboostScore: number | null;
    linkTierScore: number | null;
  };
  diff: {
    score: number;
    scorePercent: string;
    pages: number;
    navboostScore: number;
    linkTierScore: number;
  };
  issues: {
    new: unknown[];
    resolved: unknown[];
    totalNew: number;
    totalResolved: number;
  };
  trend: "improving" | "declining" | "stable";
}

interface Audit {
  id: string;
  url: string;
  domain: string;
  status: string;
  score: number | null;
  grade: string | null;
  pagesFound: number;
  createdAt: string;
  progress: number;
}

function getGradeColor(grade: string | null): string {
  switch (grade) {
    case "A":
      return "bg-green-500";
    case "B":
      return "bg-blue-500";
    case "C":
      return "bg-yellow-500";
    case "D":
      return "bg-orange-500";
    case "F":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // History & Comparison state
  const [historyByDomain, setHistoryByDomain] = useState<Record<string, AuditHistory[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<[string | null, string | null]>([null, null]);
  const [comparison, setComparison] = useState<AuditComparison | null>(null);
  const [comparing, setComparing] = useState(false);

  async function fetchAudits() {
    try {
      const res = await fetch("/api/audit");
      if (res.ok) {
        setAudits(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch audits:", error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch history for completed audits
  async function fetchHistory(domain: string) {
    try {
      const res = await fetch(`/api/audit/history?domain=${encodeURIComponent(domain)}&limit=20`);
      if (res.ok) {
        const history = await res.json();
        setHistoryByDomain(prev => ({ ...prev, [domain]: history }));
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }

  // Fetch comparison between two audits
  async function fetchComparison(olderId: string, newerId: string) {
    setComparing(true);
    try {
      const res = await fetch(`/api/audit/compare?older=${olderId}&newer=${newerId}`);
      if (res.ok) {
        setComparison(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch comparison:", error);
    } finally {
      setComparing(false);
    }
  }

  // Toggle history view for a domain
  function toggleHistory(domain: string) {
    if (selectedDomain === domain) {
      setShowHistory(false);
      setSelectedDomain(null);
    } else {
      setSelectedDomain(domain);
      setShowHistory(true);
      if (!historyByDomain[domain]) {
        fetchHistory(domain);
      }
    }
  }

  // Select audit for comparison
  function toggleSelectForCompare(id: string) {
    setSelectedForCompare(prev => {
      if (prev[0] === id) return [null, prev[1]];
      if (prev[1] === id) return [prev[0], null];
      if (!prev[0]) return [id, prev[1]];
      if (!prev[1]) return [prev[0], id];
      return [id, prev[1]]; // Replace oldest selection
    });
    setComparison(null);
  }

  // Run comparison
  function runComparison() {
    if (selectedForCompare[0] && selectedForCompare[1]) {
      fetchComparison(selectedForCompare[0], selectedForCompare[1]);
    }
  }

  // Get unique domains from completed audits
  const completedAudits = audits.filter(a => a.status === "done");
  const domains = [...new Set(completedAudits.map(a => a.domain))];

  useEffect(() => {
    fetchAudits();
    // Refresh every 10 seconds to see progress updates
    const interval = setInterval(fetchAudits, 10000);
    return () => clearInterval(interval);
  }, []);

  async function deleteAudit(id: string) {
    if (!confirm("Möchtest du diesen Audit wirklich löschen?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/audit/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAudits((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete audit:", error);
    } finally {
      setDeletingId(null);
    }
  }

  async function exportCSV(id: string, domain: string) {
    try {
      const res = await fetch(`/api/audit/${id}`, { method: "PUT" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${domain}-audit.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Audits</h1>
          <p className="text-muted-foreground">
            {audits.length} Audit{audits.length !== 1 ? "s" : ""} durchgeführt
          </p>
        </div>
        <Button asChild>
          <Link href="/audit/new">
            <Plus className="w-4 h-4 mr-2" />
            Neuer Audit
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      {audits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{audits.length}</p>
                  <p className="text-xs text-muted-foreground">Gesamt Audits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {audits.filter((a) => a.status === "done").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Abgeschlossen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {audits.filter((a) => !["done", "error"].includes(a.status)).length}
                  </p>
                  <p className="text-xs text-muted-foreground">In Bearbeitung</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {audits.filter((a) => a.score !== null).length > 0
                      ? Math.round(
                          audits
                            .filter((a) => a.score !== null)
                            .reduce((sum, a) => sum + (a.score || 0), 0) /
                            audits.filter((a) => a.score !== null).length
                        )
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Ø Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History & Comparison Section */}
      {completedAudits.length >= 2 && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <GitCompare className="w-5 h-5" />
                Audits vergleichen
              </CardTitle>
              {selectedForCompare[0] && selectedForCompare[1] && (
                <Button size="sm" onClick={runComparison} disabled={comparing}>
                  {comparing ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                  )}
                  Vergleichen
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Domain selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {domains.map(domain => (
                <Button
                  key={domain}
                  variant={selectedDomain === domain ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleHistory(domain)}
                >
                  {domain}
                </Button>
              ))}
            </div>

            {/* History list for selected domain */}
            {showHistory && selectedDomain && historyByDomain[selectedDomain] && (
              <div className="space-y-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  Wähle zwei Audits zum Vergleichen:
                </p>
                <div className="grid gap-2">
                  {historyByDomain[selectedDomain].map((history, idx) => (
                    <div
                      key={history.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedForCompare.includes(history.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleSelectForCompare(history.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedForCompare.includes(history.id)}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-medium">
                            {formatDate(history.createdAt)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {history.pagesFound} Seiten
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getGradeColor(history.grade)}`}>
                          {history.grade}
                        </div>
                        <span className={`text-2xl font-bold ${getScoreColor(history.score)}`}>
                          {history.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparison Result */}
            {comparison && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {comparison.trend === "improving" && (
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    )}
                    {comparison.trend === "declining" && (
                      <TrendingDown className="w-6 h-6 text-red-500" />
                    )}
                    {comparison.trend === "stable" && (
                      <Minus className="w-6 h-6 text-yellow-500" />
                    )}
                    <span className="font-medium capitalize">{comparison.trend}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">
                      <span className={comparison.diff.score >= 0 ? "text-green-500" : "text-red-500"}>
                        {comparison.diff.score >= 0 ? "+" : ""}{comparison.diff.score}
                      </span>
                      <span className="text-muted-foreground text-lg">
                        ({comparison.diff.scorePercent}%)
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">Score Änderung</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold">{comparison.older.score} → {comparison.newer.score}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold">{comparison.older.pagesFound} → {comparison.newer.pagesFound}</p>
                    <p className="text-xs text-muted-foreground">Seiten</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className={`text-2xl font-bold ${comparison.issues.totalResolved > 0 ? "text-green-500" : ""}`}>
                      {comparison.issues.totalResolved}
                    </p>
                    <p className="text-xs text-muted-foreground">Gelöste Issues</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className={`text-2xl font-bold ${comparison.issues.totalNew > 0 ? "text-red-500" : ""}`}>
                      {comparison.issues.totalNew}
                    </p>
                    <p className="text-xs text-muted-foreground">Neue Issues</p>
                  </div>
                </div>

                {/* Issues details */}
                {(comparison.issues.new.length > 0 || comparison.issues.resolved.length > 0) && (
                  <div className="space-y-3">
                    {comparison.issues.resolved.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-500 mb-2">
                          ✓ {comparison.issues.resolved.length} gelöste Issues
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {comparison.issues.resolved.slice(0, 5).map((issue: unknown, idx: number) => {
                            const i = issue as { message: string; page: string };
                            return (
                              <p key={idx} className="truncate">
                                • {i.message} ({i.page})
                              </p>
                            );
                          })}
                          {comparison.issues.resolved.length > 5 && (
                            <p className="italic">...und {comparison.issues.resolved.length - 5} weitere</p>
                          )}
                        </div>
                      </div>
                    )}
                    {comparison.issues.new.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-500 mb-2">
                          ✗ {comparison.issues.new.length} neue Issues
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {comparison.issues.new.slice(0, 5).map((issue: unknown, idx: number) => {
                            const i = issue as { message: string; page: string };
                            return (
                              <p key={idx} className="truncate">
                                • {i.message} ({i.page})
                              </p>
                            );
                          })}
                          {comparison.issues.new.length > 5 && (
                            <p className="italic">...und {comparison.issues.new.length - 5} weitere</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit List */}
      {audits.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Noch keine Audits</h3>
            <p className="text-muted-foreground mb-6">
              Starte deinen ersten SEO Audit und erkenne Verbesserungspotenzial.
            </p>
            <Button asChild>
              <Link href="/audit/new">
                <Plus className="w-4 h-4 mr-2" />
                Ersten Audit starten
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audits.map((audit) => (
            <Card key={audit.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Domain & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Grade Circle */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getGradeColor(
                        audit.grade
                      )}`}
                    >
                      {audit.grade || (audit.status === "done" ? "?" : "-")}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/audit/${audit.id}`}
                          className="font-medium hover:text-primary truncate block"
                        >
                          {audit.domain}
                        </Link>
                        {audit.status === "error" && (
                          <Badge variant="destructive" className="shrink-0">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Fehler
                          </Badge>
                        )}
                        {audit.status === "done" && (
                          <Badge variant="default" className="shrink-0 bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Fertig
                          </Badge>
                        )}
                        {!["done", "error"].includes(audit.status) && (
                          <Badge variant="secondary" className="shrink-0">
                            <Clock className="w-3 h-3 mr-1" />
                            Läuft
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{audit.url}</span>
                        <span>•</span>
                        <span>{formatDate(audit.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Score & Pages */}
                  <div className="hidden md:flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${getScoreColor(audit.score)}`}>
                        {audit.score ?? "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{audit.pagesFound}</p>
                      <p className="text-xs text-muted-foreground">Seiten</p>
                    </div>
                  </div>

                  {/* Right: Progress & Actions */}
                  <div className="flex items-center gap-3">
                    {/* Progress bar for running audits */}
                    {!["done", "error"].includes(audit.status) && (
                      <div className="w-24 hidden sm:block">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Fortschritt</span>
                          <span>{audit.progress}%</span>
                        </div>
                        <Progress value={audit.progress} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {/* View Button */}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/audit/${audit.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>

                      {/* Export CSV (only for completed) */}
                      {audit.status === "done" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportCSV(audit.id, audit.domain)}
                          title="Als CSV exportieren"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAudit(audit.id)}
                        disabled={deletingId === audit.id}
                        title="Audit löschen"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        {deletingId === audit.id ? (
                          <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
