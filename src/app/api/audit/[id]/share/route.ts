import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Generate a random token using crypto
function generateToken(): string {
  return crypto.randomUUID();
}

// Generate share token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Generate a unique, hard-to-guess token
  const shareToken = generateToken();
  
  // Check if audit exists
  const audit = await prisma.audit.findUnique({
    where: { id },
  });
  
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  
  // Update audit with share token
  await prisma.audit.update({
    where: { id },
    data: {
      shareToken,
      isPublic: true,
    },
  });
  
  return NextResponse.json({ token: shareToken });
}

// Get share status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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
  
  return NextResponse.json({
    isPublic: audit.isPublic,
    shareToken: audit.shareToken,
  });
}

// Update share settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { isPublic } = body;
  
  const audit = await prisma.audit.findUnique({
    where: { id },
  });
  
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  
  // Generate token if making public and no token exists
  let shareToken = audit.shareToken;
  if (isPublic && !shareToken) {
    shareToken = generateToken();
  }
  
  const updated = await prisma.audit.update({
    where: { id },
    data: {
      isPublic,
      shareToken,
    },
  });
  
  return NextResponse.json({
    isPublic: updated.isPublic,
    shareToken: updated.shareToken,
  });
}
