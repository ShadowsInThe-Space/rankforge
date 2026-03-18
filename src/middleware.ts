import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Admin Route Protection ────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (payload.role !== 'ADMIN') {
        // Not admin → redirect to audit dashboard
        return NextResponse.redirect(new URL('/audit', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ─── Auth Route Protection (redirect if already logged in) ──
  if (pathname === '/login' || pathname === '/register') {
    const token = request.cookies.get('token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        jwt.verify(token, JWT_SECRET);
        // Already logged in → go to audit
        return NextResponse.redirect(new URL('/audit', request.url));
      } catch {
        // Invalid token → continue to login/register
      }
    }
  }

  // ─── Protected App Routes ──────────────────────────────────
  if (
    pathname.startsWith('/audit') &&
    !pathname.startsWith('/audit/new') // new is a page, not an API
  ) {
    const token = request.cookies.get('token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/register', '/audit/:path*'],
};
