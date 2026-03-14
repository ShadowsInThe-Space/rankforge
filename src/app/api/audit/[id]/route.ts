import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";

// ─── DELETE Audit ─────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // Check if audit exists and belongs to user
  const audit = await prisma.audit.findUnique({
    where: { id, userId: user.userId },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit nicht gefunden" }, { status: 404 });
  }

  // Delete audit (cascade deletes pages)
  await prisma.audit.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

// ─── Export CSV ───────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id, userId: user.userId },
    include: {
      pages: {
        select: {
          url: true,
          statusCode: true,
          title: true,
          description: true,
          h1: true,
          wordCount: true,
          score: true,
          contentType: true,
          issues: true,
        },
      },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit nicht gefunden" }, { status: 404 });
  }

  // Generate CSV
  const headers = ["URL", "Status Code", "Title", "Description", "H1", "Word Count", "Score", "Content Type", "Issues"];
  const rows = audit.pages.map((page) => {
    const issues = Array.isArray(page.issues) ? page.issues.length : 0;
    return [
      page.url,
      page.statusCode?.toString() || "",
      page.title || "",
      page.description || "",
      page.h1 || "",
      page.wordCount?.toString() || "",
      page.score?.toString() || "",
      page.contentType || "",
      issues.toString(),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${audit.domain}-audit.csv"`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Calculate progress based on status
  let progress = 0;
  switch (audit.status) {
    case "pending":
      progress = 0;
      break;
    case "mapping":
      progress = 10;
      break;
    case "crawling":
      progress = 10 + Math.min(40, (audit.pagesFound / 50) * 40);
      break;
    case "analyzing":
      progress = 80;
      break;
    case "done":
      progress = 100;
      break;
    case "error":
      progress = 0;
      break;
  }

  return NextResponse.json({ ...audit, progress: Math.round(progress) });
}
