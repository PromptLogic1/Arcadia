/**
 * Rate Limiting Service
 *
 * Implements rate limiting using Upstash Ratelimit library.
 * Provides different rate limiting strategies for various use cases.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient, REDIS_PREFIXES } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';

/**
 * Rate limit response
 */
export interface RateLimitResponse {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime?: number;
  reason?: string;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requests: number;
  windowSeconds: number;
  identifier: string;
}

/**
 * Rate limiting service with different strategies
 */
export const rateLimitingService = {
  // API rate limiter - sliding window for smooth rate limiting
  api: new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(100, '60 s'), // 100 requests per minute
    prefix: `${REDIS_PREFIXES.RATE_LIMIT}:api`,
    analytics: true,
  }),

  // Authentication rate limiter - fixed window for security
  auth: new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.fixedWindow(5, '60 s'), // 5 attempts per minute
    prefix: `${REDIS_PREFIXES.RATE_LIMIT}:auth`,
    analytics: true,
  }),

  // File upload rate limiter - token bucket for burst handling
  upload: new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.tokenBucket(10, '30 s', 3), // 10 tokens, 30s refill, 3 tokens/refill
    prefix: `${REDIS_PREFIXES.RATE_LIMIT}:upload`,
    analytics: true,
  }),

  // Game session rate limiter - for creating game sessions
  gameSession: new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 sessions per minute
    prefix: `${REDIS_PREFIXES.RATE_LIMIT}:game-session`,
    analytics: true,
  }),

  /**
   * Check API rate limit
   */
  async checkApiLimit(
    identifier: string
  ): Promise<ServiceResponse<RateLimitResponse>> {
    try {
      const result = await this.api.limit(identifier);

      log.debug('API rate limit check', {
        metadata: {
          identifier,
          allowed: result.success,
          remaining: result.remaining,
        },
      });

      return {
        success: true,
        data: {
          allowed: result.success,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.reset,
          reason: result.reason,
        },
        error: null,
      };
    } catch (error) {
      log.error(
        'API rate limit check failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { identifier },
        }
      );

      return {
        success: false,
        data: null,
        error: 'Rate limiting temporarily unavailable',
      };
    }
  },

  /**
   * Check authentication rate limit
   */
  async checkAuthLimit(
    identifier: string
  ): Promise<ServiceResponse<RateLimitResponse>> {
    try {
      const result = await this.auth.limit(identifier);

      log.debug('Auth rate limit check', {
        metadata: {
          identifier,
          allowed: result.success,
          remaining: result.remaining,
        },
      });

      return {
        success: true,
        data: {
          allowed: result.success,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.reset,
          reason: result.reason,
        },
        error: null,
      };
    } catch (error) {
      log.error(
        'Auth rate limit check failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { identifier },
        }
      );

      return {
        success: false,
        data: null,
        error: 'Authentication rate limiting temporarily unavailable',
      };
    }
  },

  /**
   * Check upload rate limit
   */
  async checkUploadLimit(
    identifier: string
  ): Promise<ServiceResponse<RateLimitResponse>> {
    try {
      const result = await this.upload.limit(identifier);

      log.debug('Upload rate limit check', {
        metadata: {
          identifier,
          allowed: result.success,
          remaining: result.remaining,
        },
      });

      return {
        success: true,
        data: {
          allowed: result.success,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.reset,
          reason: result.reason,
        },
        error: null,
      };
    } catch (error) {
      log.error(
        'Upload rate limit check failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { identifier },
        }
      );

      return {
        success: false,
        data: null,
        error: 'Upload rate limiting temporarily unavailable',
      };
    }
  },

  /**
   * Check game session creation rate limit
   */
  async checkGameSessionLimit(
    identifier: string
  ): Promise<ServiceResponse<RateLimitResponse>> {
    try {
      const result = await this.gameSession.limit(identifier);

      log.debug('Game session rate limit check', {
        metadata: {
          identifier,
          allowed: result.success,
          remaining: result.remaining,
        },
      });

      return {
        success: true,
        data: {
          allowed: result.success,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.reset,
          reason: result.reason,
        },
        error: null,
      };
    } catch (error) {
      log.error(
        'Game session rate limit check failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { identifier },
        }
      );

      return {
        success: false,
        data: null,
        error: 'Game session rate limiting temporarily unavailable',
      };
    }
  },

  /**
   * Get client identifier from request
   * Uses IP as fallback, but can be enhanced with user ID, API key, etc.
   */
  getIdentifier(request: Request, userId?: string): string {
    if (userId) {
      return `user:${userId}`;
    }

    // Extract IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    const ip =
      forwarded?.split(',')[0]?.trim() || realIp || cfConnectingIp || 'unknown';

    return `ip:${ip}`;
  },
};

/**
 * Rate limiting middleware helper for API routes
 */
export async function withRateLimit<T>(
  request: Request,
  handler: () => Promise<T>,
  limitType: 'api' | 'auth' | 'upload' | 'gameSession' = 'api',
  userId?: string
): Promise<ServiceResponse<T>> {
  const identifier = rateLimitingService.getIdentifier(request, userId);

  let limitCheck: ServiceResponse<RateLimitResponse>;

  switch (limitType) {
    case 'auth':
      limitCheck = await rateLimitingService.checkAuthLimit(identifier);
      break;
    case 'upload':
      limitCheck = await rateLimitingService.checkUploadLimit(identifier);
      break;
    case 'gameSession':
      limitCheck = await rateLimitingService.checkGameSessionLimit(identifier);
      break;
    default:
      limitCheck = await rateLimitingService.checkApiLimit(identifier);
  }

  if (!limitCheck.success) {
    return {
      success: false,
      data: null,
      error: limitCheck.error,
    };
  }

  if (limitCheck.data === null) {
    return {
      success: false,
      data: null,
      error: 'Rate limit check returned null data',
    };
  }

  if (!limitCheck.data.allowed) {
    log.warn('Rate limit exceeded', {
      metadata: {
        identifier,
        limitType,
        remaining: limitCheck.data.remaining,
        resetTime: limitCheck.data.resetTime,
      },
    });

    return {
      success: false,
      data: null,
      error: `Rate limit exceeded. Try again in ${
        limitCheck.data.resetTime
          ? Math.ceil((limitCheck.data.resetTime - Date.now()) / 1000)
          : 60
      } seconds.`,
    };
  }

  try {
    const result = await handler();
    return { success: true, data: result, error: null };
  } catch (error) {
    log.error(
      'Handler execution failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      data: null,
      error: 'Request processing failed',
    };
  }
}
