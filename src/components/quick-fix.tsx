"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  ArrowRight,
  Copy,
  ExternalLink,
  Search,
  FileText,
  Link2,
  Image,
  Shield
} from "lucide-react";

interface QuickFix {
  id: string;
  title: string;
  description: string;
  category: "title" | "meta" | "content" | "links" | "images" | "schema" | "security";
  severity: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  fix: string;
  affectedPages: number;
  autoFixable: boolean;
  tool?: string;
}

interface QuickFixSuggestionsProps {
  auditId: string;
  issues: Array<{
    type: string;
    severity: string;
    page: string;
    message: string;
    fix: string;
  }>;
}

export function QuickFixSuggestions({ issues }: QuickFixSuggestionsProps) {
  const [fixes, setFixes] = useState<QuickFix[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Convert issues to quick fixes
  useEffect(() => {
    const quickFixes: QuickFix[] = (issues ?? []).slice(0, 10).map((issue, idx) => ({
      id: `fix-${idx}`,
      title: issue.message.slice(0, 60) + (issue.message.length > 60 ? "..." : ""),
      description: issue.fix,
      category: mapCategory(issue.type),
      severity: mapSeverity(issue.severity),
      effort: estimateEffort(issue.fix),
      fix: issue.fix,
      affectedPages: 1,
      autoFixable: isAutoFixable(issue.type),
    }));
    setFixes(quickFixes);
  }, [issues]);

  function mapCategory(type: string): QuickFix["category"] {
    const mapping: Record<string, QuickFix["category"]> = {
      title: "title",
      meta: "meta",
      description: "meta",
      canonical: "meta",
      og: "schema",
      twitter: "schema",
      schema: "schema",
      heading: "content",
      content: "content",
      links: "links",
      internal: "links",
      external: "links",
      images: "images",
      alt: "images",
      performance: "content",
      mobile: "content",
      security: "security",
      indexing: "meta",
    };
    return mapping[type] || "content";
  }

  function mapSeverity(sev: string): QuickFix["severity"] {
    if (sev === "P0") return "high";
    if (sev === "P1") return "medium";
    return "low";
  }

  function estimateEffort(fix: string): "low" | "medium" | "high" {
    const lowerFix = fix.toLowerCase();
    if (lowerFix.includes("add") || lowerFix.includes("include")) return "low";
    if (lowerFix.includes("rewrite") || lowerFix.includes("redesign")) return "high";
    return "medium";
  }

  function isAutoFixable(type: string): boolean {
    const autoFixableTypes = ["title", "meta", "description", "alt"];
    return autoFixableTypes.includes(type);
  }

  const getCategoryIcon = (category: QuickFix["category"]) => {
    const icons = {
      title: <FileText className="w-4 h-4" />,
      meta: <FileText className="w-4 h-4" />,
      content: <FileText className="w-4 h-4" />,
      links: <Link2 className="w-4 h-4" />,
      images: <Image className="w-4 h-4" />,
      schema: <Shield className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />,
    };
    return icons[category];
  };

  const getSeverityColor = (severity: QuickFix["severity"]) => {
    const colors = {
      high: "bg-red-500",
      medium: "bg-yellow-500",
      low: "bg-green-500",
    };
    return colors[severity];
  };

  const getEffortColor = (effort: QuickFix["effort"]) => {
    const colors = {
      low: "text-green-500",
      medium: "text-yellow-500",
      high: "text-red-500",
    };
    return colors[effort];
  };

  const handleApplyFix = async (fix: QuickFix) => {
    setProcessing((prev) => new Set(prev).add(fix.id));
    
    // Simulate fix application (in real implementation, this would call an API)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(fix.id);
      return next;
    });
    setCompleted((prev) => new Set(prev).add(fix.id));
  };

  const filteredFixes = fixes.filter((fix) => {
    if (filter === "all") return true;
    return fix.severity === filter;
  });

  const highPriorityCount = fixes.filter(f => f.severity === "high").length;
  const autoFixableCount = fixes.filter(f => f.autoFixable).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Fix Suggestions
            <Badge variant="outline" className="ml-2 text-xs">USP Feature</Badge>
          </div>
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="destructive">{highPriorityCount} high priority</Badge>
            )}
            {autoFixableCount > 0 && (
              <Badge className="bg-green-500">{autoFixableCount} auto-fixable</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Fix List */}
        {filteredFixes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>All fixed! No issues found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFixes.map((fix) => {
              const isProcessing = processing.has(fix.id);
              const isCompleted = completed.has(fix.id);
              
              return (
                <div
                  key={fix.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isCompleted 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-muted/20 border-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryIcon(fix.category)}
                        <span className="font-medium text-sm">{fix.title}</span>
                        <span className={`w-2 h-2 rounded-full ${getSeverityColor(fix.severity)}`} />
                        {fix.autoFixable && (
                          <Badge variant="outline" className="text-xs">Auto-fix</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{fix.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className={getEffortColor(fix.effort)}>
                          {fix.effort === "low" ? "Easy fix" : fix.effort === "medium" ? "Moderate effort" : "Complex fix"}
                        </span>
                        <span>{fix.affectedPages} affected</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {isCompleted ? (
                        <Button variant="ghost" size="sm" disabled>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </Button>
                      ) : isProcessing ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </Button>
                      ) : fix.autoFixable ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleApplyFix(fix)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          Fix
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Guide
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Show fix details on expand */}
                  {isProcessing && (
                    <div className="mt-3 pt-3 border-t border-muted">
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-muted-foreground">Applying fix...</span>
                      </div>
                    </div>
                  )}
                  
                  {isCompleted && (
                    <div className="mt-3 pt-3 border-t border-green-500/30">
                      <div className="flex items-center gap-2 text-sm text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span>Fix applied successfully!</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {fixes.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{highPriorityCount}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{autoFixableCount}</p>
                <p className="text-xs text-muted-foreground">Auto-Fixable</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{fixes.length}</p>
                <p className="text-xs text-muted-foreground">Total Issues</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QuickFixSuggestions;
