// src/components/index-tier-report.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TierPrediction, IndexTier } from "@/lib/analyzers/index-tier";

interface Props {
  prediction: TierPrediction;
  url?: string;
}

export function IndexTierReportCard({ prediction, url }: Props) {
  const getTierColor = (tier: IndexTier) => {
    if (tier.includes("Base")) return "text-green-600 dark:text-green-400";
    if (tier.includes("Zeppelin")) return "text-blue-600 dark:text-blue-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getTierIcon = (tier: IndexTier) => {
    if (tier.includes("Base")) return "💎";
    if (tier.includes("Zeppelin")) return "👍";
    return "🗑️";
  };

  const getTierBadgeVariant = (tier: IndexTier) => {
    if (tier.includes("Base")) return "default" as const;
    if (tier.includes("Zeppelin")) return "secondary" as const;
    return "outline" as const;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-blue-600";
    return "text-orange-600";
  };

  const formatDays = (days: number | null) => {
    if (days === null) return "Unknown";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
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
          <CardTitle className="flex items-center gap-2">
            <span>{getTierIcon(prediction.tier)}</span>
            <span>Index Tier Prediction</span>
          </CardTitle>
          <Badge variant={getTierBadgeVariant(prediction.tier)}>
            {prediction.tier}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(prediction.overallScore)}`}>
              {prediction.overallScore}
              <span className="text-lg text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="text-2xl font-semibold">{prediction.confidence}%</p>
          </div>
        </div>

        {/* Recommendation */}
        <Alert
          variant={
            prediction.tier.includes("Base")
              ? "default"
              : prediction.tier.includes("Landfill")
                ? "destructive"
                : "default"
          }
        >
          <AlertDescription>{prediction.recommendation}</AlertDescription>
        </Alert>

        {/* Factor Breakdown */}
        <div>
          <h3 className="font-semibold mb-3">Factor Breakdown</h3>
          <div className="space-y-4">
            {/* Freshness */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">Freshness</span>
                  <span className="text-xs text-muted-foreground ml-2">(30% weight)</span>
                </div>
                <Badge variant="outline">{prediction.factors.freshness.score}/100</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Last Updated:{" "}
                {formatDays(prediction.factors.freshness.daysSinceUpdate)}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    prediction.factors.freshness.score >= 80
                      ? "bg-green-600"
                      : prediction.factors.freshness.score >= 50
                        ? "bg-blue-600"
                        : "bg-orange-600"
                  }`}
                  style={{ width: `${prediction.factors.freshness.score}%` }}
                />
              </div>
            </div>

            {/* Update Frequency */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">Update Frequency</span>
                  <span className="text-xs text-muted-foreground ml-2">(25% weight)</span>
                </div>
                <Badge variant="outline">
                  {prediction.factors.updateFrequency.score}/100
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated: {prediction.factors.updateFrequency.estimatedFrequency}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    prediction.factors.updateFrequency.score >= 80
                      ? "bg-green-600"
                      : prediction.factors.updateFrequency.score >= 50
                        ? "bg-blue-600"
                        : "bg-orange-600"
                  }`}
                  style={{ width: `${prediction.factors.updateFrequency.score}%` }}
                />
              </div>
            </div>

            {/* Backlink Quality */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">Backlink Quality</span>
                  <span className="text-xs text-muted-foreground ml-2">(25% weight)</span>
                </div>
                <Badge variant="outline">
                  {prediction.factors.backlinkQuality.score}/100
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>
                  Internal Links: {prediction.factors.backlinkQuality.internalBacklinks}
                </span>
                {prediction.factors.backlinkQuality.orphanPage && (
                  <Badge variant="destructive" className="text-xs">
                    Orphan
                  </Badge>
                )}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    prediction.factors.backlinkQuality.score >= 80
                      ? "bg-green-600"
                      : prediction.factors.backlinkQuality.score >= 50
                        ? "bg-blue-600"
                        : "bg-orange-600"
                  }`}
                  style={{ width: `${prediction.factors.backlinkQuality.score}%` }}
                />
              </div>
            </div>

            {/* Page Speed */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">Page Speed</span>
                  <span className="text-xs text-muted-foreground ml-2">(10% weight)</span>
                </div>
                <Badge variant="outline">{prediction.factors.pageSpeed.score}/100</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated Score: {prediction.factors.pageSpeed.estimatedScore}/100
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    prediction.factors.pageSpeed.score >= 80
                      ? "bg-green-600"
                      : prediction.factors.pageSpeed.score >= 50
                        ? "bg-blue-600"
                        : "bg-orange-600"
                  }`}
                  style={{ width: `${prediction.factors.pageSpeed.score}%` }}
                />
              </div>
            </div>

            {/* User Engagement */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">User Engagement</span>
                  <span className="text-xs text-muted-foreground ml-2">(10% weight)</span>
                </div>
                <Badge variant="outline">
                  {prediction.factors.userEngagement.score}/100
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Word Count: {prediction.factors.userEngagement.wordCount}</div>
                <div className="flex gap-2">
                  {prediction.factors.userEngagement.hasMultimedia && (
                    <Badge variant="outline" className="text-xs">
                      Multimedia ✓
                    </Badge>
                  )}
                  {prediction.factors.userEngagement.headingDepth >= 3 && (
                    <Badge variant="outline" className="text-xs">
                      Good Structure ✓
                    </Badge>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    prediction.factors.userEngagement.score >= 80
                      ? "bg-green-600"
                      : prediction.factors.userEngagement.score >= 50
                        ? "bg-blue-600"
                        : "bg-orange-600"
                  }`}
                  style={{ width: `${prediction.factors.userEngagement.score}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* What This Means */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
          <h4 className="font-semibold mb-2">💡 What This Means</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {prediction.tier.includes("Base") && (
              <>
                <li>This page is stored in Google's premium tier (Flash/RAM)</li>
                <li>Links FROM this page have HIGHEST value</li>
                <li>Google crawls this page frequently</li>
                <li>Strong ranking potential</li>
              </>
            )}
            {prediction.tier.includes("Zeppelin") && (
              <>
                <li>This page is stored in Google's mid-tier (SSD)</li>
                <li>Links from this page have GOOD value</li>
                <li>Decent crawl frequency and ranking potential</li>
                <li>Can reach Base tier with improvements</li>
              </>
            )}
            {prediction.tier.includes("Landfill") && (
              <>
                <li>This page is stored in Google's low-priority tier (HDD)</li>
                <li>Links from this page have LOW value</li>
                <li>Rarely crawled, poor ranking potential</li>
                <li>Needs significant improvements to rank well</li>
              </>
            )}
          </ul>
        </div>

        {/* Google Leak Context */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
          <h4 className="font-semibold mb-2">📖 Based on Google API Leak 2024</h4>
          <p className="text-muted-foreground">
            Google stores pages in 3 tiers based on importance and freshness.{" "}
            <strong>Base tier</strong> (Flash/RAM) contains the most valuable content,{" "}
            <strong>Zeppelin</strong> (SSD) is mid-tier, and <strong>Landfill</strong>{" "}
            (HDD) is for low-priority pages.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
