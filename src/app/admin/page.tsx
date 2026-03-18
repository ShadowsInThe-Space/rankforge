"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, AlertTriangle, TrendingUp, Euro, BarChart3 } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalAudits: number;
  recentSignups: number;
  avgScore: number;
  errorRate: number;
  mrr: number;
  statusBreakdown: Record<string, number>;
  recentAudits: Array<{
    id: string;
    domain: string;
    status: string;
    score: number | null;
    grade: string | null;
    createdAt: string;
    user: { email: string; name: string | null } | null;
  }>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-muted-foreground">Fehler beim Laden der Daten.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">RankForge System-Übersicht</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">User</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Search className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAudits}</p>
                <p className="text-xs text-muted-foreground">Audits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recentSignups}</p>
                <p className="text-xs text-muted-foreground">Neue User (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgScore}</p>
                <p className="text-xs text-muted-foreground">Ø Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.errorRate}%</p>
                <p className="text-xs text-muted-foreground">Fehlerrate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.mrr}€</p>
                <p className="text-xs text-muted-foreground">MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats.statusBreakdown).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    status === "done"
                      ? "default"
                      : status === "error"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {status}
                </Badge>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Audits */}
      <Card>
        <CardHeader>
          <CardTitle>Neueste Audits</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAudits.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Audits.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentAudits.map((audit) => (
                <div
                  key={audit.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{audit.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      {audit.user?.email || "Anonymous"} · {formatDate(audit.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        audit.status === "done"
                          ? "default"
                          : audit.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {audit.status}
                    </Badge>
                    {audit.score !== null && (
                      <span className="text-lg font-bold">{audit.score}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
