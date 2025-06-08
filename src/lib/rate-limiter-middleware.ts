import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { withRateLimit as withRedisRateLimit } from '@/services/rate-limiting.service';

/**
 * Redis-based Rate Limiting Middleware
 *
 * Replaces the old in-memory rate limiting with Redis-based implementation
 * using Upstash for production-ready, distributed rate limiting.
 */

// Default configurations for different route types
// Now mapped to Redis-based rate limiting service types
export const RATE_LIMIT_CONFIGS = {
  // Strict limits for auth-related endpoints
  auth: 'auth' as const,
  // Moderate limits for data creation and game sessions
  create: 'gameSession' as const,
  // Relaxed limits for reading data
  read: 'api' as const,
  // Very strict limits for expensive operations
  expensive: 'upload' as const,
  // Game actions (mark cell, etc)
  gameAction: 'api' as const,
} as const;

// Redis-based rate limiting - no in-memory storage needed
type RateLimitType = 'api' | 'auth' | 'upload' | 'gameSession';

/**
 * Rate limiting middleware function - now using Redis
 */
export function withRateLimit<T extends readonly unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  limitType: RateLimitType
) {
  return async function rateLimitedHandler(
    req: NextRequest,
    ...args: T
  ): Promise<NextResponse> {
    // Use Redis-based rate limiting service
    const result = await withRedisRateLimit(
      req,
      () => handler(req, ...args),
      limitType
    );

    if (!result.success) {
      const error = result.error;

      if (typeof error === 'string' && error.includes('RATE_LIMIT_EXCEEDED')) {
        logger.warn('Redis rate limit exceeded', {
          metadata: {
            path: req.nextUrl.pathname,
            limitType,
            error,
          },
        });

        return NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded',
          },
          { status: 429 }
        );
      }

      // Other errors (Redis issues, etc.)
      logger.error(
        'Rate limiting service error',
        new Error(typeof error === 'string' ? error : 'Rate limiting failed'),
        {
          metadata: {
            path: req.nextUrl.pathname,
            limitType,
            error: typeof error === 'string' ? error : 'Unknown error',
          },
        }
      );

      // Fail open - allow request if rate limiting is down
      return await handler(req, ...args);
    }

    if (result.data === null) {
      logger.error(
        'Rate limiting service returned null data',
        new Error('Unexpected null data from rate limiting service'),
        {
          metadata: {
            path: req.nextUrl.pathname,
            limitType,
          },
        }
      );

      // Fail open - allow request if rate limiting is down
      return await handler(req, ...args);
    }

    return result.data;
  };
}

/**
 * Create a rate-limited API route handler
 */
export function createRateLimitedHandler<T extends readonly unknown[]>(
  limitType: RateLimitType,
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return withRateLimit(handler, limitType);
}
