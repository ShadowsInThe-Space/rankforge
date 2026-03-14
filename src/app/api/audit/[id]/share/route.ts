import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";

// Generate a random token using crypto
function generateToken(): string {
  return crypto.randomUUID();
}

// Generate share token
export async function POST(
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
  
  // Verify user owns the audit
  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { userId: true },
  });
  
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.userId !== user.userId) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }
  
  // Generate a unique, hard-to-guess token
  const shareToken = generateToken();
  
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
    where: { id },
    select: {
      userId: true,
      isPublic: true,
      shareToken: true,
    },
  });
  
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Only owner can see share token
  if (audit.userId !== user.userId) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
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
  const body = await request.json();
  const { isPublic } = body;
  
  // Verify user owns the audit
  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { userId: true, shareToken: true },
  });
  
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.userId !== user.userId) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
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
