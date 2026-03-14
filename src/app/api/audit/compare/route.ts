import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SeoIssue, TechnicalAnalysis } from "@/types/audit";

interface AuditHistoryWithTech {
  id: string;
  auditId: string;
  domain: string;
  score: number;
  grade: string;
  pagesFound: number;
  createdAt: Date;
  technical: TechnicalAnalysis | null;
  content: unknown;
  links: unknown;
  summary: unknown;
  advancedSeo: unknown;
  dateConsistency: unknown;
  indexTier: unknown;
  navboostScore: number | null;
  navboostAnalysis: unknown;
  linkTierScore: number | null;
  linkTierAnalysis: unknown;
}

// GET /api/audit/compare?older=<id>&newer=<id>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const olderId = searchParams.get("older");
  const newerId = searchParams.get("newer");

  if (!olderId || !newerId) {
    return NextResponse.json(
      { error: "Beide Audit-IDs erforderlich (older und newer)" },
      { status: 400 }
    );
  }

  try {
    // Fetch both audits
    const [olderAudit, newerAudit] = await Promise.all([
      prisma.auditHistory.findUnique({
        where: { id: olderId },
      }),
      prisma.auditHistory.findUnique({
        where: { id: newerId },
      }),
    ]);

    if (!olderAudit || !newerAudit) {
      return NextResponse.json(
        { error: "Ein oder beide Audits nicht gefunden" },
        { status: 404 }
      );
    }

    // Build comparison result
    const older = olderAudit as unknown as AuditHistoryWithTech;
    const newer = newerAudit as unknown as AuditHistoryWithTech;

    // Calculate score changes
    const scoreDiff = newer.score - older.score;

    // Get issues from both audits
    const olderIssues = (older.technical as TechnicalAnalysis)?.issues || [];
    const newerIssues = (newer.technical as TechnicalAnalysis)?.issues || [];

    // Find new issues (in newer but not in older)
    const newIssues = newerIssues.filter(
      (newIssue: SeoIssue) =>
        !olderIssues.some(
          (oldIssue: SeoIssue) =>
            oldIssue.page === newIssue.page &&
            oldIssue.type === newIssue.type &&
            oldIssue.message === newIssue.message
        )
    );

    // Find resolved issues (in older but not in newer)
    const resolvedIssues = olderIssues.filter(
      (oldIssue: SeoIssue) =>
        !newerIssues.some(
          (newIssue: SeoIssue) =>
            newIssue.page === oldIssue.page &&
            newIssue.type === oldIssue.type &&
            newIssue.message === oldIssue.message
        )
    );

    // Calculate page count change
    const pagesDiff = newer.pagesFound - older.pagesFound;

    // Get advanced SEO issues
    const olderAdvanced = (older.advancedSeo as { issues?: SeoIssue[] })?.issues || [];
    const newerAdvanced = (newer.advancedSeo as { issues?: SeoIssue[] })?.issues || [];

    const newAdvancedIssues = newerAdvanced.filter(
      (newIssue: SeoIssue) =>
        !olderAdvanced.some(
          (oldIssue: SeoIssue) =>
            oldIssue.page === newIssue.page &&
            oldIssue.type === newIssue.type &&
            oldIssue.message === newIssue.message
        )
    );

    const resolvedAdvancedIssues = olderAdvanced.filter(
      (oldIssue: SeoIssue) =>
        !newerAdvanced.some(
          (newIssue: SeoIssue) =>
            newIssue.page === oldIssue.page &&
            newIssue.type === oldIssue.type &&
            newIssue.message === oldIssue.message
        )
    );

    // Build comparison result
    const comparison = {
      older: {
        id: older.id,
        auditId: older.auditId,
        score: older.score,
        grade: older.grade,
        pagesFound: older.pagesFound,
        createdAt: older.createdAt.toISOString(),
        navboostScore: older.navboostScore,
        linkTierScore: older.linkTierScore,
      },
      newer: {
        id: newer.id,
        auditId: newer.auditId,
        score: newer.score,
        grade: newer.grade,
        pagesFound: newer.pagesFound,
        createdAt: newer.createdAt.toISOString(),
        navboostScore: newer.navboostScore,
        linkTierScore: newer.linkTierScore,
      },
      diff: {
        score: scoreDiff,
        scorePercent: older.score > 0 ? ((scoreDiff / older.score) * 100).toFixed(1) : "0",
        pages: pagesDiff,
        navboostScore: (newer.navboostScore || 0) - (older.navboostScore || 0),
        linkTierScore: (newer.linkTierScore || 0) - (older.linkTierScore || 0),
      },
      issues: {
        new: [...newIssues, ...newAdvancedIssues],
        resolved: [...resolvedIssues, ...resolvedAdvancedIssues],
        totalNew: newIssues.length + newAdvancedIssues.length,
        totalResolved: resolvedIssues.length + resolvedAdvancedIssues.length,
      },
      trend: scoreDiff > 0 ? "improving" : scoreDiff < 0 ? "declining" : "stable",
    };

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Failed to compare audits:", error);
    return NextResponse.json(
      { error: "Fehler beim Vergleichen der Audits" },
      { status: 500 }
    );
  }
}
