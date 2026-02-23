'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import type { SiteLinkTierReport, LinkTierAnalysis } from '../lib/analyzers/link-tier';
import { AlertTriangle, CheckCircle2, Info, Link2, Link2Off } from 'lucide-react';

interface LinkTierReportProps {
  report: SiteLinkTierReport;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  if (score >= 40) return 'outline';
  return 'destructive';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Link Value';
  if (score >= 60) return 'Good Link Value';
  if (score >= 40) return 'Average Link Value';
  return 'Poor Link Value';
}

function getTierBadgeVariant(tier: 'base' | 'zeppelin' | 'landfill'): 'default' | 'secondary' | 'destructive' {
  if (tier === 'base') return 'default';
  if (tier === 'zeppelin') return 'secondary';
  return 'destructive';
}

function getTierIcon(tier: 'base' | 'zeppelin' | 'landfill'): string {
  if (tier === 'base') return '💎';
  if (tier === 'zeppelin') return '👍';
  return '🗑️';
}

export function LinkTierReport({ report }: LinkTierReportProps) {
  const totalPages = Object.keys(report.pageAnalyses).length;
  
  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Link Tier Analyzer</CardTitle>
              <CardDescription>
                Link value weighted by source page Index Tier (Google Algorithm Leak 2024)
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
            {/* Tier Distribution */}
            <div>
              <h3 className="font-semibold mb-2">Link Tier Distribution</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    💎 Base Tier (3.0x value)
                  </span>
                  <span className="font-medium">
                    {report.tierDistribution.baseTier}% ({Math.round(report.totalInternalLinks * report.tierDistribution.baseTier / 100)} links)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    👍 Zeppelin Tier (1.5x value)
                  </span>
                  <span className="font-medium">
                    {report.tierDistribution.zeppelinTier}% ({Math.round(report.totalInternalLinks * report.tierDistribution.zeppelinTier / 100)} links)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    🗑️ Landfill Tier (0.5x value)
                  </span>
                  <span className="font-medium">
                    {report.tierDistribution.landfillTier}% ({Math.round(report.totalInternalLinks * report.tierDistribution.landfillTier / 100)} links)
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="h-8 rounded-lg overflow-hidden flex">
              {report.tierDistribution.baseTier > 0 && (
                <div 
                  className="bg-green-500" 
                  style={{ width: `${report.tierDistribution.baseTier}%` }}
                  title={`${report.tierDistribution.baseTier}% Base tier`}
                />
              )}
              {report.tierDistribution.zeppelinTier > 0 && (
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${report.tierDistribution.zeppelinTier}%` }}
                  title={`${report.tierDistribution.zeppelinTier}% Zeppelin tier`}
                />
              )}
              {report.tierDistribution.landfillTier > 0 && (
                <div 
                  className="bg-red-500" 
                  style={{ width: `${report.tierDistribution.landfillTier}%` }}
                  title={`${report.tierDistribution.landfillTier}% Landfill tier`}
                />
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Links</p>
                <p className="text-2xl font-bold">{report.totalInternalLinks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pages Analyzed</p>
                <p className="text-2xl font-bold">{totalPages}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orphan Pages</p>
                <p className={`text-2xl font-bold ${report.orphanPages.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {report.orphanPages.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Link Opportunities */}
      {report.linkOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Opportunities
            </CardTitle>
            <CardDescription>
              High-value internal linking opportunities to boost page authority
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.linkOpportunities.map((opp, idx) => (
                <Alert key={idx} className="border-green-200 bg-green-50">
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTierBadgeVariant(opp.sourceTier)}>
                          {getTierIcon(opp.sourceTier)} {opp.sourceTier}
                        </Badge>
                        <span className="text-sm font-medium text-green-900">
                          {opp.expectedImpact}
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        <p><strong>Source:</strong> {new URL(opp.potentialSource).pathname || '/'}</p>
                        <p><strong>Target:</strong> {new URL(opp.targetPage).pathname}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orphan Pages */}
      {report.orphanPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Link2Off className="h-5 w-5" />
              Orphan Pages ({report.orphanPages.length})
            </CardTitle>
            <CardDescription>
              Pages with no inbound internal links (crawlability issues)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.orphanPages.slice(0, 10).map((url, idx) => (
                <Alert key={idx} variant="destructive">
                  <AlertDescription className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-mono text-sm">{new URL(url).pathname}</span>
                  </AlertDescription>
                </Alert>
              ))}
              {report.orphanPages.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  + {report.orphanPages.length - 10} more orphan pages
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Linked Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Linked Pages</CardTitle>
          <CardDescription>
            Pages with highest tier-weighted link value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.topLinkedPages.map((page, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{new URL(page.url).pathname || '/'}</p>
                  <p className="text-sm text-muted-foreground">
                    {page.inboundCount} inbound link{page.inboundCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(page.linkTierScore)}`}>
                  {page.linkTierScore}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Page-Level Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Page-Level Link Analysis</CardTitle>
          <CardDescription>
            Detailed link tier breakdown for each page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(report.pageAnalyses)
              .sort((a, b) => b[1].linkTierScore - a[1].linkTierScore)
              .slice(0, 15) // Top 15 pages
              .map(([url, analysis]) => (
                <PageLinkAnalysisCard key={url} url={url} analysis={analysis} />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageLinkAnalysisCard({ url, analysis }: { url: string; analysis: LinkTierAnalysis }) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* URL and Score */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" title={url}>
            {new URL(url).pathname || '/'}
          </p>
          <p className="text-sm text-muted-foreground truncate">{url}</p>
        </div>
        <div className="ml-4">
          <div className={`text-2xl font-bold ${getScoreColor(analysis.linkTierScore)}`}>
            {analysis.linkTierScore}/100
          </div>
        </div>
      </div>

      {/* Inbound Links Breakdown */}
      <div className="grid grid-cols-4 gap-3 pt-2 border-t">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{analysis.inboundLinks.total}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">💎 Base</p>
          <p className="text-lg font-semibold text-green-600">{analysis.inboundLinks.baseTier}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">👍 Zeppelin</p>
          <p className="text-lg font-semibold text-blue-600">{analysis.inboundLinks.zeppelinTier}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">🗑️ Landfill</p>
          <p className="text-lg font-semibold text-red-600">{analysis.inboundLinks.landfillTier}</p>
        </div>
      </div>

      {/* Top Sources */}
      {analysis.topSources.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">Top Link Sources:</p>
          <div className="space-y-1">
            {analysis.topSources.slice(0, 3).map((source, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant={getTierBadgeVariant(source.sourceTier)} className="shrink-0">
                    {getTierIcon(source.sourceTier)}
                  </Badge>
                  <span className="truncate">{new URL(source.sourceUrl).pathname || '/'}</span>
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {source.tierMultiplier}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {analysis.issues.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">Issues:</p>
          <div className="space-y-2">
            {analysis.issues.slice(0, 2).map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                {issue.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                {issue.severity === 'warning' && <Info className="h-4 w-4 text-yellow-500 shrink-0" />}
                {issue.severity === 'info' && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />}
                <span className="flex-1">{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
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
                <div className="flex-1">
                  <p>{rec.action}</p>
                  <p className="text-muted-foreground text-xs mt-1">{rec.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
