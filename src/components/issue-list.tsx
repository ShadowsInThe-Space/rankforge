"use client";

import { useState } from "react";
import type { SeoIssue, IssueSeverity } from "@/types/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface IssueListProps {
  issues: SeoIssue[];
}

const severityConfig: Record<IssueSeverity, { label: string; className: string }> = {
  P0: { label: "Kritisch", className: "bg-red-500 text-white hover:bg-red-500" },
  P1: { label: "Wichtig", className: "bg-orange-500 text-white hover:bg-orange-500" },
  P2: { label: "Hinweis", className: "bg-yellow-500 text-white hover:bg-yellow-500" },
};

function IssueCard({ issue }: { issue: SeoIssue }) {
  const config = severityConfig[issue.severity];

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={config.className}>{issue.severity}</Badge>
          <Badge variant="outline">{issue.type}</Badge>
        </div>
        <CardTitle className="text-sm">{issue.message}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground truncate" title={issue.page}>
          {issue.page}
        </p>
        <div className="rounded-md bg-muted p-2">
          <p className="text-xs">
            <span className="font-medium">Fix: </span>
            {issue.fix}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function IssueList({ issues }: IssueListProps) {
  const counts = {
    all: issues.length,
    P0: issues.filter((i) => i.severity === "P0").length,
    P1: issues.filter((i) => i.severity === "P1").length,
    P2: issues.filter((i) => i.severity === "P2").length,
  };

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">Alle ({counts.all})</TabsTrigger>
        <TabsTrigger value="P0">P0 ({counts.P0})</TabsTrigger>
        <TabsTrigger value="P1">P1 ({counts.P1})</TabsTrigger>
        <TabsTrigger value="P2">P2 ({counts.P2})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <div className="space-y-3">
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine Issues gefunden.
            </p>
          ) : (
            issues.map((issue, idx) => <IssueCard key={`${issue.page}-${issue.type}-${idx}`} issue={issue} />)
          )}
        </div>
      </TabsContent>

      {(["P0", "P1", "P2"] as const).map((severity) => (
        <TabsContent key={severity} value={severity} className="mt-4">
          <div className="space-y-3">
            {issues.filter((i) => i.severity === severity).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Keine {severity} Issues gefunden.
              </p>
            ) : (
              issues
                .filter((i) => i.severity === severity)
                .map((issue, idx) => <IssueCard key={`${issue.page}-${issue.type}-${idx}`} issue={issue} />)
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
