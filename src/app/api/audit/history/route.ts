import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";

// GET /api/audit/history - List audit history for a domain
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
  const domain = searchParams.get("domain");
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!domain) {
    return NextResponse.json(
      { error: "Domain-Parameter erforderlich" },
      { status: 400 }
    );
  }

  // Validate domain to prevent injection
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/.test(domain)) {
    return NextResponse.json(
      { error: "Ungültige Domain" },
      { status: 400 }
    );
  }

  try {
    // Get audit IDs for this user and domain
    const userAudits = await prisma.audit.findMany({
      where: {
        userId: user.userId,
        domain,
      },
      select: { id: true },
    });

    const auditIds = userAudits.map(a => a.id);

    if (auditIds.length === 0) {
      return NextResponse.json([]);
    }

    const history = await prisma.auditHistory.findMany({
      where: {
        auditId: { in: auditIds },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        auditId: true,
        domain: true,
        score: true,
        grade: true,
        pagesFound: true,
        createdAt: true,
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch audit history:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Audit-Historie" },
      { status: 500 }
    );
  }
}
