import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
// For production, use Redis or similar
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 30; // 30 requests per minute

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if request is within rate limit
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @returns RateLimitResult
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimits.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + WINDOW_MS;
    rateLimits.set(identifier, {
      count: 1,
      resetTime,
    });
    return {
      success: true,
      remaining: MAX_REQUESTS - 1,
      resetTime,
    };
  }

  if (entry.count >= MAX_REQUESTS) {
    // Rate limited
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limiter middleware for Next.js API routes
 * @param request - NextRequest object
 * @param identifier - Optional custom identifier (defaults to userId or IP)
 * @returns NextResponse if rate limited, null if allowed
 */
export function rateLimitMiddleware(
  request: NextRequest,
  identifier?: string
): NextResponse | null {
  // Get identifier (userId from auth, or IP)
  let rateLimitKey = identifier;

  if (!rateLimitKey) {
    // Try to get userId from auth header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use token as identifier (simplified)
      rateLimitKey = authHeader.substring(7, 37); // First 30 chars of token
    } else {
      // Fall back to IP
      rateLimitKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || request.headers.get('x-real-ip')
        || 'unknown';
    }
  }

  const result = checkRateLimit(rateLimitKey);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        }
      }
    );
  }

  // Return response with rate limit headers (but allow request)
  return null;
}

/**
 * More restrictive rate limiter for sensitive endpoints
 */
export function strictRateLimitMiddleware(request: NextRequest, identifier?: string): NextResponse | null {
  // Strict limits: 10 requests per minute
  const originalMax = MAX_REQUESTS;
  (globalThis as unknown as { MAX_REQUESTS: number }).MAX_REQUESTS = 10;
  
  const result = rateLimitMiddleware(request, identifier);
  
  (globalThis as unknown as { MAX_REQUESTS: number }).MAX_REQUESTS = originalMax;
  
  return result;
}

// Cleanup old entries periodically (call in API route or cron)
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}
