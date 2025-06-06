import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Rate limiting configuration per route
 * Allows different limits for different endpoints
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Skip successful requests (only count errors) */
  skipSuccessfulRequests?: boolean;
  /** Skip failed requests (only count successes) */
  skipFailedRequests?: boolean;
  /** Key generator function */
  keyGenerator?: (req: NextRequest) => string;
}

// Default configurations for different route types
export const RATE_LIMIT_CONFIGS = {
  // Strict limits for auth-related endpoints
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Moderate limits for data creation
  create: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Relaxed limits for reading data
  read: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Very strict limits for expensive operations
  expensive: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  // Game actions (mark cell, etc)
  gameAction: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

// In-memory storage for rate limit data
// In production, use Redis or similar
const rateLimitStore = new Map<
  string,
  { requests: number[]; blocked: boolean }
>();

/**
 * Clean up old entries from the store
 */
function cleanupStore(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (
      data.requests.length === 0 ||
      data.requests[0] === undefined ||
      now - data.requests[0] > 3600000
    ) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupStore, 5 * 60 * 1000);
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetAt: number } {
  const key = (config.keyGenerator || defaultKeyGenerator)(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create rate limit data
  let data = rateLimitStore.get(key);
  if (!data) {
    data = { requests: [], blocked: false };
    rateLimitStore.set(key, data);
  }

  // Filter out old requests
  data.requests = data.requests.filter(timestamp => timestamp > windowStart);

  // Check if currently blocked
  if (data.blocked && data.requests.length > 0) {
    const firstRequest = data.requests[0];
    if (firstRequest === undefined) {
      data.blocked = false;
    } else {
      const blockExpiry = firstRequest + config.windowMs;
      if (now < blockExpiry) {
        return {
          limited: true,
          remaining: 0,
          resetAt: blockExpiry,
        };
      } else {
        data.blocked = false;
      }
    }
  }

  // Check current limit
  if (data.requests.length >= config.maxRequests) {
    data.blocked = true;
    const firstRequest = data.requests[0];
    return {
      limited: true,
      remaining: 0,
      resetAt: firstRequest
        ? firstRequest + config.windowMs
        : now + config.windowMs,
    };
  }

  // Add current request
  data.requests.push(now);

  const firstRequest = data.requests[0];
  return {
    limited: false,
    remaining: config.maxRequests - data.requests.length,
    resetAt: firstRequest
      ? firstRequest + config.windowMs
      : now + config.windowMs,
  };
}

/**
 * Rate limiting middleware function
 */
export function withRateLimit<T extends readonly unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async function rateLimitedHandler(
    req: NextRequest,
    ...args: T
  ): Promise<NextResponse> {
    const { limited, remaining, resetAt } = checkRateLimit(req, config);

    if (limited) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

      logger.warn('Rate limit exceeded', {
        metadata: {
          ip: defaultKeyGenerator(req),
          path: req.nextUrl.pathname,
          remaining,
          retryAfter,
        },
      });

      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter,
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(req, ...args);

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetAt.toString());

    return response;
  };
}

/**
 * Create a rate-limited API route handler
 */
export function createRateLimitedHandler<T extends readonly unknown[]>(
  config: RateLimitConfig,
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return withRateLimit(handler, config);
}
