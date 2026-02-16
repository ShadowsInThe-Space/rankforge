"use client";

import type { ContentBenchmark } from "@/types/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ContentBenchmarkProps {
  benchmarks: ContentBenchmark[];
}

function getScoreColor(score: number): string {
  if (score > 70) return "bg-green-500 text-white hover:bg-green-500";
  if (score >= 40) return "bg-yellow-500 text-white hover:bg-yellow-500";
  return "bg-red-500 text-white hover:bg-red-500";
}

export function ContentBenchmarkChart({ benchmarks }: ContentBenchmarkProps) {
  if (!benchmarks || benchmarks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Keine Benchmark-Daten vorhanden. Starte einen Audit mit Keyword-Analyse um Vergleichsdaten zu erhalten.
          </p>
        </CardContent>
      </Card>
    );
  }

  const wordCountData = benchmarks.map((b) => ({
    keyword: b.keyword.length > 15 ? b.keyword.slice(0, 15) + "..." : b.keyword,
    "Deine Seite": b.userPage.wordCount,
    "Top-5 Durchschnitt": Math.round(b.avgWordCount),
  }));

  const headingDepthData = benchmarks.map((b) => ({
    keyword: b.keyword.length > 15 ? b.keyword.slice(0, 15) + "..." : b.keyword,
    "Deine Seite": b.userPage.headingDepth,
    "Top-5 Durchschnitt": Math.round(b.avgHeadingDepth * 10) / 10,
  }));

  const linkDensityData = benchmarks.map((b) => ({
    keyword: b.keyword.length > 15 ? b.keyword.slice(0, 15) + "..." : b.keyword,
    "Deine Seite": Math.round(b.userPage.linkDensity * 100) / 100,
    "Top-5 Durchschnitt": Math.round(b.avgLinkDensity * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Score Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {benchmarks.map((b) => (
              <Badge key={b.keyword} className={getScoreColor(b.score)}>
                {b.keyword}: {b.score}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Word Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Word Count</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wordCountData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="keyword" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deine Seite" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Top-5 Durchschnitt" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Heading Depth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Heading Depth</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={headingDepthData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="keyword" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deine Seite" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Top-5 Durchschnitt" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Link Density Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Link Density</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={linkDensityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="keyword" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deine Seite" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Top-5 Durchschnitt" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
