import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id, userId: user.userId },
    include: {
      pages: {
        select: {
          id: true,
          url: true,
          statusCode: true,
          title: true,
          description: true,
          h1: true,
          wordCount: true,
          issues: true,
          score: true,
          contentType: true,
        },
        orderBy: { url: "asc" },
      },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(audit);
}
