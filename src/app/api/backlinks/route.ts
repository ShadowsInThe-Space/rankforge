import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { analyzeExternalBacklinks, scoreExternalBacklinks } from "@/lib/analyzers/links";
import { calculateScore, scoreToGrade } from "@/lib/analyzers/scoring";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";

/**
 * Backlink Analysis API
 * 
 * Analyzes external backlinks from crawled pages
 * - Anchor text distribution
 * - Link quality (nofollow, sponsored, etc.)
 * - External link score
 * 
 * POST /api/backlinks
 * Body: { auditId: string }
 */

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authCheck = requireAuth(request);
  if (authCheck) return authCheck;

  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { auditId } = body as { auditId: string };

    if (!auditId) {
      return NextResponse.json(
        { error: "Audit ID ist erforderlich" },
        { status: 400 }
      );
    }

    // Get audit with pages and verify ownership
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        pages: {
          select: {
            url: true,
            html: true,
            links: true,
          },
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    // Verify user owns the audit
    if (audit.userId !== user.userId) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    if (audit.status !== "done") {
      return NextResponse.json(
        { error: "Audit ist noch nicht abgeschlossen" },
        { status: 400 }
      );
    }

    // Analyze external backlinks from HTML
    const externalBacklinks = analyzeExternalBacklinks(
      audit.pages.map((p) => ({
        url: p.url,
        html: p.html || "",
        links: p.links as { internal: string[]; external: string[] } | null,
      }))
    );

    // Calculate external backlink score
    const externalBacklinkScore = scoreExternalBacklinks(externalBacklinks);

    // Update audit with external backlink data
    const safeSerialize = (obj: unknown) => {
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
    };

    // Update audit with backlink analysis
    // Note: In a real implementation, we'd add a new field to the audit model
    // For now, we return the analysis
    
    // Return the analysis results
    return NextResponse.json({
      success: true,
      auditId: audit.id,
      domain: audit.domain,
      analysis: {
        ...externalBacklinks,
        score: externalBacklinkScore,
        grade: scoreToGrade(externalBacklinkScore),
      },
      summary: {
        totalExternalLinks: externalBacklinks.totalExternalLinks,
        uniqueDomains: externalBacklinks.uniqueDomains,
        pagesWithExternalLinks: externalBacklinks.pagesWithExternalLinks,
        avgExternalLinksPerPage: externalBacklinks.avgExternalLinksPerPage,
        score: externalBacklinkScore,
        grade: scoreToGrade(externalBacklinkScore),
        doFollowRatio: externalBacklinks.linkQuality.doFollow / 
          (externalBacklinks.linkQuality.doFollow + externalBacklinks.linkQuality.noFollow || 1),
        topAnchorTypes: Object.entries(externalBacklinks.anchorText.distribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Backlink analysis error:", error);
    return NextResponse.json(
      { error: "Backlink-Analyse fehlgeschlagen" },
      { status: 500 }
    );
  }
}

// GET - Get backlink analysis for a specific audit
export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authCheck = requireAuth(request);
  if (authCheck) return authCheck;

  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const auditId = searchParams.get("auditId");

  if (!auditId) {
    return NextResponse.json(
      { error: "Audit ID ist erforderlich" },
      { status: 400 }
    );
  }

  try {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: {
        userId: true,
        id: true,
        domain: true,
        links: true, // Contains internal link analysis
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit nicht gefunden" },
        { status: 404 }
      );
    }

    // Verify user owns the audit
    if (audit.userId !== user.userId) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Return existing link data (internal)
    // External backlink analysis requires HTML which isn't stored in audit
    return NextResponse.json({
      auditId: audit.id,
      domain: audit.domain,
      message: "Verwende POST für vollständige externe Backlink-Analyse",
      internalLinks: audit.links,
    });
  } catch (error) {
    console.error("Backlink GET error:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Backlink-Daten" },
      { status: 500 }
    );
  }
}
