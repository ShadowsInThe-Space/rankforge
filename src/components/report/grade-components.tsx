"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  BookOpen,
  Lightbulb,
  Zap,
  Target,
  Search,
  FileText,
  Link2,
  Smartphone,
  Shield,
  Gauge,
  Eye
} from "lucide-react";

interface ScoreGradeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getGradeFromScore(score: number): { grade: string; color: string; bgColor: string; label: string } {
  if (score >= 90) return { grade: "A", color: "#22c55e", bgColor: "bg-green-500", label: "Excellent" };
  if (score >= 80) return { grade: "B", color: "#84cc16", bgColor: "bg-lime-500", label: "Good" };
  if (score >= 70) return { grade: "C", color: "#eab308", bgColor: "bg-yellow-500", label: "Fair" };
  if (score >= 60) return { grade: "D", color: "#f97316", bgColor: "bg-orange-500", label: "Poor" };
  return { grade: "F", color: "#ef4444", bgColor: "bg-red-500", label: "Critical" };
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: "#22c55e",
    B: "#84cc16", 
    C: "#eab308",
    D: "#f97316",
    F: "#ef4444"
  };
  return colors[grade] || "#6b7280";
}

export function GradeCircle({ score, size = "md", showLabel = true }: ScoreGradeProps) {
  const { grade, color, bgColor, label } = getGradeFromScore(score);
  
  const sizes = {
    sm: { circle: 80, stroke: 6, text: "text-2xl", label: "text-xs" },
    md: { circle: 120, stroke: 8, text: "text-4xl", label: "text-sm" },
    lg: { circle: 160, stroke: 10, text: "text-5xl", label: "text-base" }
  };
  
  const s = sizes[size];
  const radius = (s.circle - s.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: s.circle, height: s.circle }}>
        <svg width={s.circle} height={s.circle} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={s.circle / 2}
            cy={s.circle / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={s.stroke}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx={s.circle / 2}
            cy={s.circle / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={s.text} style={{ color }}>{grade}</span>
          <span className={`${s.label} text-muted-foreground`}>{score}%</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color }}>{label}</span>
      )}
    </div>
  );
}

interface CategoryScore {
  name: string;
  score: number;
  icon: React.ReactNode;
  description?: string;
  status: "good" | "warning" | "critical";
}

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((cat) => {
        const color = cat.status === "good" ? "#22c55e" : cat.status === "warning" ? "#eab308" : "#ef4444";
        return (
          <Card 
            key={cat.name} 
            className={`text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
              cat.status === "good" ? "border-green-200 dark:border-green-800" :
              cat.status === "warning" ? "border-yellow-200 dark:border-yellow-800" :
              "border-red-200 dark:border-red-800"
            }`}
          >
            <CardContent className="py-4">
              <div className="mx-auto mb-2 text-muted-foreground">{cat.icon}</div>
              <p className="text-xs text-muted-foreground mb-1">{cat.name}</p>
              <div className="flex items-center justify-center gap-2">
                <GradeCircle score={cat.score} size="sm" showLabel={false} />
              </div>
              {cat.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{cat.description}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export interface Priority {
  level: "high" | "medium" | "low";
  color: string;
  bgColor: string;
  label: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  priority: Priority["level"];
  category: string;
  fix?: string;
  resources?: Array<{ title: string; url: string }>;
}

interface RecommendationsListProps {
  recommendations: Recommendation[];
  maxItems?: number;
}

const priorityConfig: Record<string, Priority> = {
  high: { level: "high", color: "#ef4444", bgColor: "bg-red-500", label: "High Priority" },
  medium: { level: "medium", color: "#eab308", bgColor: "bg-yellow-500", label: "Medium Priority" },
  low: { level: "low", color: "#22c55e", bgColor: "bg-green-500", label: "Low Priority" },
};

const effortConfig: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const categoryIcons: Record<string, React.ReactNode> = {
  technical: <Gauge className="w-4 h-4" />,
  "on-page": <FileText className="w-4 h-4" />,
  content: <BookOpen className="w-4 h-4" />,
  links: <Link2 className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  ux: <Eye className="w-4 h-4" />,
  mobile: <Smartphone className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
};

export function RecommendationsList({ recommendations, maxItems = 10 }: RecommendationsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  
  const filtered = filter === "all" 
    ? recommendations 
    : recommendations.filter(r => r.priority === filter);
  
  const displayed = filtered.slice(0, maxItems);
  const hasMore = filtered.length > maxItems;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "high", "medium", "low"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={f !== "all" && f !== "high" ? "" : ""}
          >
            {f === "all" ? "Alle" : priorityConfig[f].label}
            <span className="ml-2 opacity-70">({f === "all" ? recommendations.length : recommendations.filter(r => r.priority === f).length})</span>
          </Button>
        ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {displayed.map((rec) => {
          const config = priorityConfig[rec.priority];
          const isExpanded = expanded === rec.id;
          
          return (
            <Card 
              key={rec.id} 
              className={`transition-all ${isExpanded ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : rec.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className={`w-3 h-3 rounded-full mt-1.5 shrink-0`} 
                      style={{ backgroundColor: config.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {categoryIcons[rec.category] || <Target className="w-4 h-4" />}
                          {rec.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{rec.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={effortConfig[rec.effort]}>
                      {rec.effort} effort
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0 space-y-4 border-t">
                  {/* Impact */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Impact:</span>
                    <Badge variant="secondary">{rec.impact}</Badge>
                  </div>
                  
                  {/* Fix Instructions */}
                  {rec.fix && (
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-sm">How to Fix</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.fix}</p>
                    </div>
                  )}
                  
                  {/* Resources */}
                  {rec.resources && rec.resources.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Resources</p>
                      <div className="flex flex-wrap gap-2">
                        {rec.resources.map((resource, i) => (
                          <a
                            key={i}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {resource.title}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {hasMore && (
        <Button variant="outline" className="w-full">
          Show {filtered.length - maxItems} more recommendations
        </Button>
      )}
    </div>
  );
}

interface ReportSummaryProps {
  title: string;
  url: string;
  score: number;
  pagesAnalyzed: number;
  categories: CategoryScore[];
  recommendations: Recommendation[];
  generatedAt?: string;
}

export function ReportSummary({ 
  title, 
  url, 
  score, 
  pagesAnalyzed, 
  categories,
  recommendations,
  generatedAt 
}: ReportSummaryProps) {
  const { grade, color } = getGradeFromScore(score);
  const highPriorityCount = recommendations.filter(r => r.priority === "high").length;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {url}
            <span className="text-sm">• {pagesAnalyzed} pages analyzed</span>
          </p>
        </div>
        <GradeCircle score={score} size="lg" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{grade}</p>
            <p className="text-xs text-muted-foreground">Overall Grade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{score}</p>
            <p className="text-xs text-muted-foreground">Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-500">{highPriorityCount}</p>
            <p className="text-xs text-muted-foreground">Critical Issues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{pagesAnalyzed}</p>
            <p className="text-xs text-muted-foreground">Pages Analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <CategoryBreakdown categories={categories} />

      {/* Recommendations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
        <RecommendationsList recommendations={recommendations} />
      </div>

      {/* Footer */}
      {generatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Report generated {new Date(generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export { getGradeFromScore, getGradeColor };
