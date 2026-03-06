"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
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
  technical: TechnicalAnalysis | null;
  content: ContentAnalysis | null;
  links: LinkGraphAnalysis | null;
  summary: AuditSummary | null;
  navboostScore: number | null;
  linkTierScore: number | null;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "bg-gray-500";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreLabel(score: number | null): string {
  if (score === null) return "N/A";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export default function PublicAuditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const token = searchParams.get("token");
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAudit() {
      const res = await fetch(`/api/audit/${id}/share?token=${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Access denied");
        setLoading(false);
        return;
      }
      
      // Now fetch the actual audit data
      const auditRes = await fetch(`/api/audit/${id}`);
      if (auditRes.ok) {
        setAudit(await auditRes.json());
      } else {
        setError("Audit not found");
      }
      setLoading(false);
    }
    
    fetchAudit();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-2">🔒</div>
              <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
              <p className="text-gray-600 mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!audit) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RankForge</h1>
              <p className="text-gray-600">SEO Audit Report</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Generated</p>
              <p className="text-sm font-medium">{new Date(audit.createdAt).toLocaleDateString("de-DE")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{audit.domain}</h2>
                <p className="text-gray-600">{audit.url}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-6 py-3 rounded-lg ${getScoreColor(audit.score)} text-white`}>
                  <div className="text-3xl font-bold">{audit.score ?? "—"}</div>
                  <div className="text-sm">{getScoreLabel(audit.score)}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="outline">
                📄 {audit.pagesFound} Pages
              </Badge>
              {audit.navboostScore !== null && (
                <Badge variant="outline">
                  🚀 NavBoost: {audit.navboostScore}
                </Badge>
              )}
              {audit.linkTierScore !== null && (
                <Badge variant="outline">
                  🔗 Link Tier: {audit.linkTierScore}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {audit.summary && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Executive Summary</h3>
              <p className="text-gray-700">{audit.summary?.overallSummary || "No summary available"}</p>
              
              {audit.summary?.scoreBreakdown && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(audit.summary.scoreBreakdown).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                      <div className="text-2xl font-bold">{value?.score ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Technical Analysis */}
        {audit.technical && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Technical SEO</h3>
              <div className="space-y-3">
                {audit.technical.critical?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Critical Issues</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {audit.technical.critical.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {audit.technical.warnings?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {audit.technical.warnings.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(!audit.technical.critical?.length && !audit.technical.warnings?.length) && (
                  <p className="text-gray-600">No technical issues found. 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Analysis */}
        {audit.content && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Content Analysis</h3>
              <div className="space-y-3">
                {audit.content.strengths?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {audit.content.strengths.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {audit.content.improvements?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-orange-600 mb-2">Improvements</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {audit.content.improvements.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(!audit.content.strengths?.length && !audit.content.improvements?.length) && (
                  <p className="text-gray-600">No content analysis available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-gray-500 text-sm">
          Powered by RankForge • SEO Audit Report
        </div>
      </footer>
    </div>
  );
}
