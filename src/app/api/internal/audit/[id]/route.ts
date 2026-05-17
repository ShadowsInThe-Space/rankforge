import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const key = request.headers.get("x-internal-api-key");
  if (!key || key !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const audit = await prisma.audit.findUnique({
      where: { id },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: audit.id,
      status: audit.status,
      url: audit.url,
      domain: audit.domain,
      score: audit.score,
      grade: audit.grade,
      pagesFound: (audit as Record<string, unknown>).pagesFound ?? audit.url,
      keywords: [],
      pages: [],
    });
  } catch (err) {
    console.error("Internal audit status error:", err);
    return NextResponse.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
