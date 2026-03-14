"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { Clock, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from "lucide-react";

interface ScoreHistoryEntry {
  id: string;
  url: string;
  domain: string;
  score: number | null;
  grade: string | null;
  createdAt: string;
  pagesFound: number;
}

interface ScoreHistoryProps {
  domain: string;
  currentScore?: number | null;
}

export function ScoreHistory({ domain, currentScore }: ScoreHistoryProps) {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        // Fetch all audits for this domain
        const res = await fetch("/rankforge/api/audit");
        if (res.ok) {
          const audits = await res.json();
          
          // Filter by domain and sort by date
          const domainHistory = audits
            .filter((a: ScoreHistoryEntry) => 
              a.domain === domain || a.url.includes(domain)
            )
            .sort((a: ScoreHistoryEntry, b: ScoreHistoryEntry) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          
          setHistory(domainHistory);
        }
      } catch (err) {
        console.error("Failed to fetch score history:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (domain) {
      fetchHistory();
    }
  }, [domain]);

  // Add current score if provided and not already in history
  const allScores = [...history];
  if (currentScore && currentScore > 0) {
    const hasCurrent = history.some(h => 
      new Date(h.createdAt).toDateString() === new Date().toDateString()
    );
    if (!hasCurrent) {
      allScores.push({
        id: "current",
        url: "",
        domain,
        score: currentScore,
        grade: currentScore >= 90 ? "A" : currentScore >= 75 ? "B" : currentScore >= 60 ? "C" : currentScore >= 40 ? "D" : "F",
        createdAt: new Date().toISOString(),
        pagesFound: 0,
      });
    }
  }

  // Filter by time range
  const now = new Date();
  const filteredScores = allScores.filter((entry) => {
    if (timeRange === "all") return true;
    const entryDate = new Date(entry.createdAt);
    const daysDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (timeRange === "7d") return daysDiff <= 7;
    if (timeRange === "30d") return daysDiff <= 30;
    return true;
  });

  // Format data for chart
  const chartData = filteredScores.map((entry, idx) => ({
    date: new Date(entry.createdAt).toLocaleDateString("de-DE", { 
      month: "short", 
      day: "numeric" 
    }),
    score: entry.score,
    grade: entry.grade,
    pages: entry.pagesFound,
    fullDate: entry.createdAt,
    idx,
  }));

  // Calculate trend
  const trend = (() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].score ?? 0;
    const last = chartData[chartData.length - 1].score ?? 0;
    const diff = last - first;
    
    if (diff > 5) return { direction: "up", value: diff, icon: TrendingUp, color: "text-green-500" };
    if (diff < -5) return { direction: "down", value: Math.abs(diff), icon: TrendingDown, color: "text-red-500" };
    return { direction: "stable", value: 0, icon: Minus, color: "text-muted-foreground" };
  })();

  // Calculate average
  const avgScore = chartData.length > 0
    ? Math.round(chartData.reduce((sum, e) => sum + (e.score ?? 0), 0) / chartData.length)
    : 0;

  // Best score
  const bestScore = chartData.length > 0
    ? Math.max(...chartData.map(e => e.score ?? 0))
    : 0;

  // Latest audit
  const latestAudit = chartData.length > 0
    ? chartData[chartData.length - 1]
    : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Score History
            <Badge variant="outline" className="ml-2 text-xs">USP Feature</Badge>
          </div>
          <div className="flex gap-1">
            {(["7d", "30d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs rounded ${
                  timeRange === range 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {range === "all" ? "All" : range}
              </button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No historical data yet</p>
            <p className="text-sm">Run more audits to see your score history</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Latest</p>
                <p className="text-xl font-bold">{latestAudit?.score ?? "-"}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-xl font-bold">{avgScore}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Best</p>
                <p className="text-xl font-bold text-green-500">{bestScore}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Audits</p>
                <p className="text-xl font-bold">{chartData.length}</p>
              </div>
            </div>

            {/* Trend Indicator */}
            {trend && (
              <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${
                trend.direction === "up" ? "bg-green-500/10" :
                trend.direction === "down" ? "bg-red-500/10" :
                "bg-muted/30"
              }`}>
                <trend.icon className={`w-5 h-5 ${trend.color}`} />
                <span className={trend.color}>
                  {trend.direction === "up" && `+${trend.value} points over time`}
                  {trend.direction === "down" && `${trend.value} points down`}
                  {trend.direction === "stable" && "Stable performance"}
                </span>
              </div>
            )}

            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                    dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#3b82f6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Historical Audits List */}
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Recent Audits</h4>
              {chartData.slice(-5).reverse().map((entry, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 text-sm bg-muted/20 rounded"
                >
                  <span className="text-muted-foreground">{entry.date}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      (entry.score ?? 0) >= 70 ? "text-green-500" :
                      (entry.score ?? 0) >= 40 ? "text-yellow-500" :
                      "text-red-500"
                    }`}>
                      {entry.score ?? "-"}/100
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.grade ?? "-"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ScoreHistory;
