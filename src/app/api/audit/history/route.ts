import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/audit/history - List audit history for a domain
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const limit = parseInt(searchParams.get("limit") || "10");

  // Hardcoded user for now (same as other endpoints)
  const userId = "cmmhnqbj80000gmax06hwu6on";

  if (!domain) {
    return NextResponse.json(
      { error: "Domain-Parameter erforderlich" },
      { status: 400 }
    );
  }

  try {
    const history = await prisma.auditHistory.findMany({
      where: {
        domain,
        userId,
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
