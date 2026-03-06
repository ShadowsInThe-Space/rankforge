// src/components/date-consistency-report.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { DateConsistencyReport } from "@/lib/analyzers/date-consistency";

interface Props {
  report: DateConsistencyReport;
  url?: string;
}

export function DateConsistencyReportCard({ report, url }: Props) {
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    // Handle string dates from JSON
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return "N/A";
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="h-8 w-8 text-green-600" />;
    if (score >= 70)
      return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
    return <XCircle className="h-8 w-8 text-red-600" />;
  };

  const getSeverityBadge = (severity: "HIGH" | "MEDIUM" | "LOW") => {
    const variants = {
      HIGH: "destructive",
      MEDIUM: "default",
      LOW: "secondary",
    } as const;

    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  return (
    <Card>
      {url && (
        <div className="px-4 pt-4">
          <p className="text-sm font-mono text-muted-foreground truncate" title={url}>
            {url.length > 80 ? "..." + url.slice(-80) : url}
          </p>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Date Consistency Analysis</CardTitle>
          <div className="flex items-center gap-3">
            {getScoreIcon(report.score)}
            <span className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
              {report.score}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Recommendation */}
        <Alert
          variant={
            report.score >= 90
              ? "default"
              : report.conflicts.some((c) => c.severity === "HIGH")
                ? "destructive"
                : "default"
          }
        >
          <AlertDescription>{report.recommendation}</AlertDescription>
        </Alert>

        {/* Date Sources */}
        <div>
          <h3 className="font-semibold mb-3">Detected Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Structured Data */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Structured Data</span>
                {report.dates.structuredData.found ? (
                  <Badge variant="outline">
                    {report.dates.structuredData.schema}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not found</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(report.dates.structuredData.date)}
              </p>
            </div>

            {/* URL Date */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">URL Pattern</span>
                {report.dates.urlDate.found ? (
                  <Badge variant="outline">Found</Badge>
                ) : (
                  <Badge variant="secondary">Not found</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(report.dates.urlDate.date)}
              </p>
              {report.dates.urlDate.pattern && (
                <p className="text-xs text-muted-foreground mt-1">
                  Pattern: {report.dates.urlDate.pattern}
                </p>
              )}
            </div>

            {/* Title Date */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Page Title</span>
                {report.dates.titleDate.found ? (
                  <Badge variant="outline">Found</Badge>
                ) : (
                  <Badge variant="secondary">Not found</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(report.dates.titleDate.date)}
              </p>
              {report.dates.titleDate.text && (
                <p className="text-xs text-muted-foreground mt-1">
                  Text: &quot;{report.dates.titleDate.text}&quot;
                </p>
              )}
            </div>

            {/* Byline Date */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Byline/Publish Date</span>
                {report.dates.bylineDate.found ? (
                  <Badge variant="outline">Found</Badge>
                ) : (
                  <Badge variant="secondary">Not found</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(report.dates.bylineDate.date)}
              </p>
              {report.dates.bylineDate.selector && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selector: {report.dates.bylineDate.selector}
                </p>
              )}
            </div>

            {/* Sitemap Date */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Sitemap lastmod</span>
                {report.dates.sitemapDate.found ? (
                  <Badge variant="outline">Found</Badge>
                ) : (
                  <Badge variant="secondary">Not checked</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(report.dates.sitemapDate.date)}
              </p>
            </div>
          </div>
        </div>

        {/* Conflicts */}
        {report.conflicts.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">
              Conflicts ({report.conflicts.length})
            </h3>
            <div className="space-y-3">
              {report.conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className="border border-l-4 border-l-red-500 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(conflict.severity)}
                      <span className="font-medium">
                        {conflict.discrepancyDays} days discrepancy
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{conflict.source1}</p>
                      <p className="font-medium">{formatDate(conflict.date1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{conflict.source2}</p>
                      <p className="font-medium">{formatDate(conflict.date2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Fix */}
        {report.conflicts.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <h4 className="font-semibold mb-2">How to Fix</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Choose one canonical date (usually the original publish date)</li>
              <li>
                Update structured data (JSON-LD Article schema) to match that
                date
              </li>
              <li>
                If date is in URL, ensure it matches structured data (or consider
                URL rewrite)
              </li>
              <li>Update byline/visible date on the page</li>
              <li>Update XML sitemap lastmod to match</li>
              <li>Verify all dates are consistent after changes</li>
            </ul>
          </div>
        )}

        {/* Google Leak Context */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
          <h4 className="font-semibold mb-2">📖 Based on Google API Leak 2024</h4>
          <p className="text-muted-foreground">
            Google extracts dates via three methods: <strong>bylineDate</strong>{" "}
            (structured data), <strong>syntacticDate</strong> (URL),{" "}
            <strong>semanticDate</strong> (content). Conflicts trigger penalties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
