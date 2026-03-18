import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || '';

// ─── Token payload ──────────────────────────────────────────────
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/** Extract + verify JWT from Authorization header */
export async function getAuthUser(req: NextRequest): Promise<TokenPayload | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    const token = auth.slice(7);
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Middleware helper: returns 401 if not authenticated, 403 if not admin */
export async function requireAdmin(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null; // all good
}

/** Middleware helper: returns 401 if not authenticated */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

/** Get full user record from request */
export async function getAuthUserFull(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return null;
  return prisma.user.findUnique({ where: { id: user.userId } });
}
