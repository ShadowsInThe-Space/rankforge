'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import type { SiteNavBoostReport, NavBoostAnalysis } from '../lib/analyzers/navboost';
import { AlertTriangle, CheckCircle2, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface NavBoostReportProps {
  report: SiteNavBoostReport;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 30) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 90) return 'default';
  if (score >= 70) return 'secondary';
  if (score >= 50) return 'outline';
  return 'destructive';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent NavBoost';
  if (score >= 70) return 'Good NavBoost';
  if (score >= 50) return 'Average NavBoost';
  if (score >= 30) return 'Poor NavBoost';
  return 'Critical NavBoost';
}

function getSeverityIcon(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <Info className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
  }
}

export function NavBoostReport({ report }: NavBoostReportProps) {
  const totalPages = report.totalPages;
  const dist = report.distribution;

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>NavBoost Simulator</CardTitle>
              <CardDescription>
                User engagement scoring based on Google Algorithm Leak 2024
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
                {report.overallScore}/100
              </div>
              <Badge variant={getScoreBadgeVariant(report.overallScore)} className="mt-2">
                {getScoreLabel(report.overallScore)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Distribution */}
            <div>
              <h3 className="font-semibold mb-2">Score Distribution</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Excellent (90-100)
                  </span>
                  <span className="font-medium">
                    {dist.excellent} pages ({Math.round(dist.excellent / totalPages * 100)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Good (70-89)
                  </span>
                  <span className="font-medium">
                    {dist.good} pages ({Math.round(dist.good / totalPages * 100)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    Average (50-69)
                  </span>
                  <span className="font-medium">
                    {dist.average} pages ({Math.round(dist.average / totalPages * 100)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Poor (30-49)
                  </span>
                  <span className="font-medium">
                    {dist.poor} pages ({Math.round(dist.poor / totalPages * 100)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Critical (0-29)
                  </span>
                  <span className="font-medium">
                    {dist.critical} pages ({Math.round(dist.critical / totalPages * 100)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="h-8 rounded-lg overflow-hidden flex">
              {dist.excellent > 0 && (
                <div 
                  className="bg-green-500" 
                  style={{ width: `${dist.excellent / totalPages * 100}%` }}
                  title={`${dist.excellent} excellent`}
                />
              )}
              {dist.good > 0 && (
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${dist.good / totalPages * 100}%` }}
                  title={`${dist.good} good`}
                />
              )}
              {dist.average > 0 && (
                <div 
                  className="bg-yellow-500" 
                  style={{ width: `${dist.average / totalPages * 100}%` }}
                  title={`${dist.average} average`}
                />
              )}
              {dist.poor > 0 && (
                <div 
                  className="bg-orange-500" 
                  style={{ width: `${dist.poor / totalPages * 100}%` }}
                  title={`${dist.poor} poor`}
                />
              )}
              {dist.critical > 0 && (
                <div 
                  className="bg-red-500" 
                  style={{ width: `${dist.critical / totalPages * 100}%` }}
                  title={`${dist.critical} critical`}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Issues */}
      {report.topIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Top NavBoost Issues
            </CardTitle>
            <CardDescription>
              Most common problems affecting user engagement signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.topIssues.map((issue, idx) => (
                <Alert key={idx}>
                  <AlertDescription className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{issue.issue}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Affects {issue.affectedPages} page{issue.affectedPages > 1 ? 's' : ''} • 
                        Avg impact: -{issue.avgImpact} points
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Recommendations */}
      {report.topRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Recommendations
            </CardTitle>
            <CardDescription>
              High-impact actions to improve NavBoost scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.topRecommendations.map((rec, idx) => (
                <Alert key={idx} className="border-blue-200 bg-blue-50">
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">{rec.recommendation}</p>
                        <p className="text-sm text-blue-700 mt-1">
                          {rec.affectedPages} page{rec.affectedPages > 1 ? 's' : ''} • 
                          Expected impact: {rec.totalImpact}
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Page Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Page-Level Analysis</CardTitle>
          <CardDescription>
            Detailed NavBoost breakdown for each crawled page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(() => {
              // Handle both Map (runtime) and plain object (from DB)
              const entries = report.pageAnalyses instanceof Map
                ? Array.from(report.pageAnalyses.entries())
                : Object.entries(report.pageAnalyses as Record<string, NavBoostAnalysis>);
              return entries
                .sort((a, b) => b[1].overallScore - a[1].overallScore)
                .slice(0, 10)
                .map(([url, analysis]) => (
                  <PageAnalysisCard key={url} url={url} analysis={analysis} />
                ));
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageAnalysisCard({ url, analysis }: { url: string; analysis: NavBoostAnalysis }) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* URL and Overall Score */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" title={url}>
            {new URL(url).pathname || '/'}
          </p>
          <p className="text-sm text-muted-foreground truncate">{url}</p>
        </div>
        <div className="ml-4">
          <div className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}/100
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ScoreMetric 
          label="CTR" 
          score={analysis.scoreBreakdown.ctrPotential}
          tooltip="Title & meta description appeal"
        />
        <ScoreMetric 
          label="Engagement" 
          score={analysis.scoreBreakdown.engagementPotential}
          tooltip="Content quality & structure"
        />
        <ScoreMetric 
          label="UX" 
          score={analysis.scoreBreakdown.uxQuality}
          tooltip="Speed & user experience"
        />
        <ScoreMetric 
          label="Click Quality" 
          score={analysis.scoreBreakdown.clickQuality}
          tooltip="Dwell time predictors"
        />
        <ScoreMetric 
          label="Intent" 
          score={analysis.scoreBreakdown.intentMatch}
          tooltip="Search intent satisfaction"
        />
      </div>

      {/* Signals */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div>
          <p className="text-sm text-muted-foreground">Est. Dwell Time</p>
          <p className="font-medium">{Math.floor(analysis.signals.estimatedDwellTime / 60)}m {analysis.signals.estimatedDwellTime % 60}s</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pogo-Stick Risk</p>
          <Badge variant={
            analysis.signals.pogoStickRisk === 'low' ? 'default' :
            analysis.signals.pogoStickRisk === 'medium' ? 'outline' : 'destructive'
          }>
            {analysis.signals.pogoStickRisk}
          </Badge>
        </div>
      </div>

      {/* Top Issues */}
      {analysis.issues.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">Top Issues:</p>
          <div className="space-y-2">
            {analysis.issues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                {getSeverityIcon(issue.severity)}
                <span className="flex-1">{issue.message}</span>
                <span className="text-muted-foreground">-{Math.abs(issue.impact)}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">Recommendations:</p>
          <div className="space-y-2">
            {analysis.recommendations.slice(0, 2).map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Badge variant={
                  rec.priority === 'high' ? 'destructive' :
                  rec.priority === 'medium' ? 'outline' : 'secondary'
                } className="shrink-0">
                  {rec.priority}
                </Badge>
                <span className="flex-1">{rec.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreMetric({ label, score, tooltip }: { label: string; score: number; tooltip: string }) {
  return (
    <div title={tooltip}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${getScoreColor(score)}`}>
        {score}
      </p>
    </div>
  );
}
