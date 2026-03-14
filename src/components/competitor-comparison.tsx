"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Share2,
  Clock,
  BarChart3
} from "lucide-react";

interface CompetitorData {
  domain: string;
  url: string;
  score: number | null;
  grade: string | null;
  pagesFound: number;
  technical: {
    score: number;
    issues: { count: number; critical: number };
  };
  content: {
    avgWordCount: number;
    thinContent: number;
  };
  links: {
    total: number;
    orphan: number;
  };
  loading: boolean;
  error: string | null;
}

// Type for primary site data passed from parent
interface PrimarySiteData {
  domain: string;
  url: string;
  score: number | null;
  grade: string | null;
  pagesFound: number;
  technical: {
    score: number;
    issues: { count: number; critical: number };
  };
  content: {
    avgWordCount: number;
    thinContent: number;
  };
  links: {
    total: number;
    orphan: number;
  };
}

// Mini Grade Circle Component
function MiniGradeCircle({ score }: { score: number }) {
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  const colors: Record<string, string> = {
    A: "bg-green-500",
    B: "bg-blue-500",
    C: "bg-yellow-500",
    D: "bg-orange-500",
    F: "bg-red-500",
  };
  
  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${colors[grade]}`}>
      {grade}
    </div>
  );
}

// Score Bar Comparison
function ScoreBar({ label, score1, score2, inverted = false }: { 
  label: string; 
  score1: number; 
  score2: number;
  inverted?: boolean;
}) {
  const higher = inverted ? score1 > score2 : score1 > score2;
  const winner = higher ? 1 : score2 > score1 ? 2 : 0;
  
  const maxScore = Math.max(score1, score2, 1);
  const width1 = (score1 / maxScore) * 100;
  const width2 = (score2 / maxScore) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex gap-2">
          <span className={winner === 1 ? "text-green-500 font-bold" : ""}>{score1}</span>
          <span className="text-muted-foreground">vs</span>
          <span className={winner === 2 ? "text-green-500 font-bold" : ""}>{score2}</span>
        </div>
      </div>
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-primary rounded-l-full transition-all"
          style={{ width: `${width1}%` }}
        />
        <div 
          className="absolute right-0 top-0 h-full bg-purple-500 rounded-r-full transition-all"
          style={{ width: `${width2}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Your Site</span>
        <span>Competitor</span>
      </div>
    </div>
  );
}

export function CompetitorComparison({ primaryUrl, primaryData }: { primaryUrl: string; primaryData?: PrimarySiteData | null }) {
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [comparing, setComparing] = useState(false);
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
  const [activeTab, setActiveTab] = useState<"scores" | "technical" | "content" | "links">("scores");

  // primaryData is now passed directly from parent - no need for local state

  const runComparison = async () => {
    if (!competitorUrl) return;
    
    setComparing(true);
    setCompetitorData(null);

    try {
      // Create a new audit for the competitor
      const res = await fetch("/rankforge/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: competitorUrl }),
      });

      if (!res.ok) {
        throw new Error("Failed to start competitor audit");
      }

      const { id: auditId } = await res.json();

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 120; // 6 minutes max

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        const statusRes = await fetch(`/rankforge/api/audit/${auditId}`);
        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.status === "done") {
            completed = true;
            setCompetitorData({
              domain: data.domain,
              url: data.url,
              score: data.score,
              grade: data.grade,
              pagesFound: data.pagesFound,
              technical: {
                score: data.summary?.scoreBreakdown?.technical ?? 0,
                issues: {
                  count: data.technical?.issues?.length ?? 0,
                  critical: data.technical?.stats?.p0Count ?? 0,
                },
              },
              content: {
                avgWordCount: data.content?.avgWordCount ?? 0,
                thinContent: data.content?.thinContentPages?.length ?? 0,
              },
              links: {
                total: data.links?.nodes?.length ?? 0,
                orphan: data.links?.orphanPages?.length ?? 0,
              },
              loading: false,
              error: null,
            });
          } else if (data.status === "error") {
            setCompetitorData({
              domain: data.domain,
              url: data.url,
              score: null,
              grade: null,
              pagesFound: 0,
              technical: { score: 0, issues: { count: 0, critical: 0 } },
              content: { avgWordCount: 0, thinContent: 0 },
              links: { total: 0, orphan: 0 },
              loading: false,
              error: data.error || "Audit failed",
            });
            completed = true;
          }
        }
        attempts++;
      }

      if (!completed) {
        setCompetitorData(prev => prev ? {
          ...prev,
          error: "Comparison timed out. Please try again.",
          loading: false
        } : null);
      }
    } catch (err) {
      setCompetitorData({
        domain: competitorUrl,
        url: competitorUrl,
        score: null,
        grade: null,
        pagesFound: 0,
        technical: { score: 0, issues: { count: 0, critical: 0 } },
        content: { avgWordCount: 0, thinContent: 0 },
        links: { total: 0, orphan: 0 },
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setComparing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Competitor Comparison
          <Badge variant="outline" className="ml-auto text-xs">USP Feature</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Competitor URL (z.B. example.com)"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runComparison()}
          />
          <Button onClick={runComparison} disabled={!competitorUrl || comparing}>
            {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {comparing ? "Analyzing..." : "Compare"}
          </Button>
        </div>

        {competitorData?.loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Analyzing competitor...</p>
          </div>
        )}

        {competitorData?.error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{competitorData.error}</p>
          </div>
        )}

        {competitorData && !competitorData.loading && !competitorData.error && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Your Site</p>
                  {primaryData?.score ? (
                    <>
                      <MiniGradeCircle score={primaryData.score} />
                      <p className="mt-2 font-bold">{primaryData.score}/100</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No data</p>
                  )}
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Competitor</p>
                  {competitorData.score ? (
                    <>
                      <MiniGradeCircle score={competitorData.score} />
                      <p className="mt-2 font-bold">{competitorData.score}/100</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Analyzing...</p>
                  )}
                </div>
              </div>

              {primaryData?.score && competitorData.score && (
                <div className="flex items-center justify-center gap-2">
                  {primaryData.score > competitorData.score ? (
                    <><CheckCircle className="w-5 h-5 text-green-500" /> <span className="text-green-500 font-medium">You&apos;re winning!</span></>
                  ) : competitorData.score > primaryData.score ? (
                    <><AlertTriangle className="w-5 h-5 text-orange-500" /> <span className="text-orange-500 font-medium">Competitor ahead</span></>
                  ) : (
                    <><Minus className="w-5 h-5 text-muted-foreground" /> <span className="text-muted-foreground">Tied!</span></>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="technical" className="mt-4 space-y-4">
              <ScoreBar 
                label="Technical SEO Score" 
                score1={primaryData?.technical?.score ?? 0} 
                score2={competitorData.technical.score} 
              />
              <ScoreBar 
                label="Total Issues" 
                score1={primaryData?.technical?.issues?.count ?? 0} 
                score2={competitorData.technical.issues.count}
                inverted 
              />
              <ScoreBar 
                label="Critical Issues" 
                score1={primaryData?.technical?.issues?.critical ?? 0} 
                score2={competitorData.technical.issues.critical}
                inverted 
              />
            </TabsContent>

            <TabsContent value="content" className="mt-4 space-y-4">
              <ScoreBar 
                label="Avg. Word Count" 
                score1={primaryData?.content?.avgWordCount ?? 0} 
                score2={competitorData.content.avgWordCount} 
              />
              <ScoreBar 
                label="Thin Content Pages" 
                score1={primaryData?.content?.thinContent ?? 0} 
                score2={competitorData.content.thinContent}
                inverted 
              />
            </TabsContent>

            <TabsContent value="links" className="mt-4 space-y-4">
              <ScoreBar 
                label="Total Pages Indexed" 
                score1={primaryData?.links?.total ?? 0} 
                score2={competitorData.links.total} 
              />
              <ScoreBar 
                label="Orphan Pages" 
                score1={primaryData?.links?.orphan ?? 0} 
                score2={competitorData.links.orphan}
                inverted 
              />
            </TabsContent>
          </Tabs>
        )}

        {!competitorData && !comparing && (
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Enter a competitor URL to compare side-by-side</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompetitorComparison;
