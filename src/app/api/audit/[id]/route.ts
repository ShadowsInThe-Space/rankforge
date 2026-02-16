import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id },
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
