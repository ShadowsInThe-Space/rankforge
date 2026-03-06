import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;

    const audit = await prisma.audit.findUnique({
      where: { id },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    let shareToken = audit.shareToken;
    
    // If enabling public, generate a token if none exists
    if (isPublic && !shareToken) {
      shareToken = randomUUID();
    }

    // If disabling public, keep the token but set isPublic to false
    const updated = await prisma.audit.update({
      where: { id },
      data: {
        isPublic: isPublic ?? !audit.isPublic,
        shareToken: isPublic ? shareToken : audit.shareToken,
      },
    });

    return NextResponse.json({
      isPublic: updated.isPublic,
      shareUrl: updated.isPublic 
        ? `${request.nextUrl.origin}/audit/${id}/public?token=${updated.shareToken}`
        : null,
    });
  } catch (error) {
    console.error("Error toggling audit sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    const audit = await prisma.audit.findUnique({
      where: { id },
      select: {
        isPublic: true,
        shareToken: true,
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // If token provided, verify it matches
    if (token) {
      if (!audit.isPublic || audit.shareToken !== token) {
        return NextResponse.json({ error: "Invalid token" }, { status: 403 });
      }
    }

    return NextResponse.json({
      isPublic: audit.isPublic,
      hasToken: !!audit.shareToken,
    });
  } catch (error) {
    console.error("Error getting audit sharing status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
