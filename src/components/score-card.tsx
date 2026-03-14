"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ScoreBreakdown, ScoreGrade } from "@/types/audit";

interface ScoreCardProps {
  overall: number;
  // New granular breakdown (v2.0)
  technical?: number;
  onPage?: number;
  contentQuality?: number;
  userSignals?: number;
  backlinks?: number;
  // Legacy support (v1.0)
  content?: number;
  links?: number;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e"; // Green
  if (score >= 50) return "#eab308"; // Yellow
  if (score >= 30) return "#f97316"; // Orange
  return "#ef4444"; // Red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Exzellent";
  if (score >= 70) return "Gut";
  if (score >= 50) return "Durchschnittlich";
  if (score >= 30) return "Verbesserungsbedarf";
  return "Kritisch";
}

function getGrade(score: number): ScoreGrade {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function ScoreCard(props: ScoreCardProps & { breakdown?: ScoreBreakdown }) {
  const { overall, breakdown } = props;
  
  // If breakdown is provided, use the new granular scores
  // Otherwise fall back to legacy props
  const technical = breakdown?.technical ?? props.technical ?? 0;
  const content = breakdown?.contentQuality ?? breakdown?.content ?? props.content ?? props.contentQuality ?? 0;
  const links = breakdown?.userSignals ?? breakdown?.backlinks ?? breakdown?.links ?? props.links ?? props.userSignals ?? props.backlinks ?? 0;
  
  const color = getScoreColor(overall);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (overall / 100) * circumference;
  const grade = getGrade(overall);

  const categories = [
    { label: "Technical SEO", value: technical },
    { label: "Content", value: content },
    { label: "Links & Authority", value: links },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          {/* Radial Progress Circle with Grade */}
          <div className="relative">
            <svg width="140" height="140" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 60 60)"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color }}>
                {overall}
              </span>
              <span className="text-xs text-muted-foreground">von 100</span>
              <span className="text-lg font-bold" style={{ color }}>Grade {grade}</span>
            </div>
          </div>

          <span
            className="text-sm font-medium"
            style={{ color }}
          >
            {getScoreLabel(overall)}
          </span>

          {/* Category Bars */}
          <div className="w-full space-y-3">
            {categories.map((cat) => (
              <div key={cat.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat.label}</span>
                  <span className="font-medium" style={{ color: getScoreColor(cat.value) }}>
                    {cat.value}
                  </span>
                </div>
                <Progress
                  value={cat.value}
                  className="h-2"
                />
              </div>
            ))}
          </div>
          
          {/* New granular scores if available */}
          {breakdown?.onPage !== undefined && (
            <div className="w-full pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Detailed Breakdown</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On-Page</span>
                  <span>{breakdown.onPage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Signals</span>
                  <span>{breakdown.userSignals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Backlinks</span>
                  <span>{breakdown.backlinks}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
