"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ScoreCardProps {
  overall: number;
  technical: number;
  content: number;
  links: number;
}

function getScoreColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score > 70) return "Gut";
  if (score >= 40) return "Verbesserungsbedarf";
  return "Kritisch";
}

export function ScoreCard({ overall, technical, content, links }: ScoreCardProps) {
  const color = getScoreColor(overall);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (overall / 100) * circumference;

  const categories = [
    { label: "Technical SEO", value: technical },
    { label: "Content", value: content },
    { label: "Links", value: links },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          {/* Radial Progress Circle */}
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
                  style={
                    {
                      "--progress-color": getScoreColor(cat.value),
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
