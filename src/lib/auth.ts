import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Type assertion after validation
const jwtSecret: string = JWT_SECRET;

export interface AuthUser {
  userId: string;
  email: string;
  role?: string;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  // Check Authorization header first (API clients)
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fall back to HTTP-only cookie (browser)
    token = request.cookies.get('rf_token')?.value ?? null;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(
  request: NextRequest
): NextResponse | null {
  const user = getAuthUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}
