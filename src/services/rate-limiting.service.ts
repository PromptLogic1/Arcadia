/**
 * Rate Limiting Service
 *
 * Implements rate limiting using Upstash Ratelimit library.
 * Provides different rate limiting strategies for various use cases.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient, REDIS_PREFIXES, isRedisConfigured } from '@/lib/redis';
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

// Private instances - lazy initialized
let apiRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;
let uploadRateLimiter: Ratelimit | null = null;
let gameSessionRateLimiter: Ratelimit | null = null;
let gameActionRateLimiter: Ratelimit | null = null;

/**
 * Get API rate limiter instance
 */
function getApiRateLimiter(): Ratelimit | null {
  if (!apiRateLimiter && isRedisConfigured()) {
    try {
      apiRateLimiter = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(100, '60 s'), // 100 requests per minute
        prefix: `${REDIS_PREFIXES.RATE_LIMIT}:api`,
        analytics: false, // Disable analytics to reduce Redis calls
      });
    } catch (error) {
      log.error(
        'Failed to initialize API rate limiter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  return apiRateLimiter;
}

/**
 * Get Auth rate limiter instance
 */
function getAuthRateLimiter(): Ratelimit | null {
  if (!authRateLimiter && isRedisConfigured()) {
    try {
      authRateLimiter = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.fixedWindow(5, '60 s'), // 5 attempts per minute
        prefix: `${REDIS_PREFIXES.RATE_LIMIT}:auth`,
        analytics: false, // Disable analytics to reduce Redis calls
      });
    } catch (error) {
      log.error(
        'Failed to initialize auth rate limiter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  return authRateLimiter;
}

/**
 * Get Upload rate limiter instance
 */
function getUploadRateLimiter(): Ratelimit | null {
  if (!uploadRateLimiter && isRedisConfigured()) {
    try {
      uploadRateLimiter = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.tokenBucket(10, '30 s', 3), // 10 tokens, 30s refill, 3 tokens/refill
        prefix: `${REDIS_PREFIXES.RATE_LIMIT}:upload`,
        analytics: false, // Disable analytics to reduce Redis calls
      });
    } catch (error) {
      log.error(
        'Failed to initialize upload rate limiter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  return uploadRateLimiter;
}

/**
 * Get Game Session rate limiter instance
 */
function getGameSessionRateLimiter(): Ratelimit | null {
  if (!gameSessionRateLimiter && isRedisConfigured()) {
    try {
      gameSessionRateLimiter = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 sessions per minute
        prefix: `${REDIS_PREFIXES.RATE_LIMIT}:game-session`,
        analytics: false, // Disable analytics to reduce Redis calls
      });
    } catch (error) {
      log.error(
        'Failed to initialize game session rate limiter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  return gameSessionRateLimiter;
}

/**
 * Get Game Action rate limiter instance (for marking cells, etc.)
 */
function getGameActionRateLimiter(): Ratelimit | null {
  if (!gameActionRateLimiter && isRedisConfigured()) {
    try {
      gameActionRateLimiter = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(30, '60 s'), // 30 game actions per minute
        prefix: `${REDIS_PREFIXES.RATE_LIMIT}:game-action`,
        analytics: false, // Disable analytics to reduce Redis calls
      });
    } catch (error) {
      log.error(
        'Failed to initialize game action rate limiter',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  return gameActionRateLimiter;
}

/**
 * Rate limiting service with different strategies
 */
export const rateLimitingService = {
  /**
   * Check API rate limit
   */
  async checkApiLimit(
    identifier: string
  ): Promise<ServiceResponse<RateLimitResponse>> {
    try {
      const limiter = getApiRateLimiter();

      // If Redis is not configured, allow the request (fail open)
      if (!limiter) {
        log.debug('API rate limit check skipped - Redis not configured', {
          metadata: { identifier },
        });

        return {
          success: true,
          data: {
            allowed: true,
            limit: 100,
            remaining: 100,
            resetTime: Date.now() + 60000,
          },
          error: null,
        };
      }

      const result = await limiter.limit(identifier);

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

      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        data: {
          allowed: true,
          limit: 100,
          remaining: 100,
          resetTime: Date.now() + 60000,
        },
        error: null,
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
      const limiter = getAuthRateLimiter();

      // If Redis is not configured, allow the request (fail open)
      if (!limiter) {
        log.debug('Auth rate limit check skipped - Redis not configured', {
          metadata: { identifier },
        });

        return {
          success: true,
          data: {
            allowed: true,
            limit: 5,
            remaining: 5,
            resetTime: Date.now() + 60000,
          },
          error: null,
        };
      }

      const result = await limiter.limit(identifier);

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

      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        data: {
          allowed: true,
          limit: 5,
          remaining: 5,
          resetTime: Date.now() + 60000,
        },
        error: null,
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
      const limiter = getUploadRateLimiter();

      // If Redis is not configured, allow the request (fail open)
      if (!limiter) {
        log.debug('Upload rate limit check skipped - Redis not configured', {
          metadata: { identifier },
        });

        return {
          success: true,
          data: {
            allowed: true,
            limit: 10,
            remaining: 10,
            resetTime: Date.now() + 30000,
          },
          error: null,
        };
      }

      const result = await limiter.limit(identifier);

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

      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        data: {
          allowed: true,
          limit: 10,
          remaining: 10,
          resetTime: Date.now() + 30000,
        },
        error: null,
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
      const limiter = getGameSessionRateLimiter();

      // If Redis is not configured, allow the request (fail open)
      if (!limiter) {
        log.debug(
          'Game session rate limit check skipped - Redis not configured',
          {
            metadata: { identifier },
          }
        );

        return {
          success: true,
          data: {
            allowed: true,
            limit: 10,
            remaining: 10,
            resetTime: Date.now() + 60000,
          },
          error: null,
        };
      }

      const result = await limiter.limit(identifier);

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

      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        data: {
          allowed: true,
          limit: 10,
          remaining: 10,
          resetTime: Date.now() + 60000,
        },
        error: null,
      };
    }
  },

  /**
   * Check game action rate limit (for marking cells, etc.)
   */
  async checkGameActionLimit(
    identifier: string
  ): Promise<ServiceResponse<RateLimitResponse>> {
    try {
      const limiter = getGameActionRateLimiter();

      // If Redis is not configured, allow the request (fail open)
      if (!limiter) {
        log.debug(
          'Game action rate limit check skipped - Redis not configured',
          {
            metadata: { identifier },
          }
        );

        return {
          success: true,
          data: {
            allowed: true,
            limit: 30,
            remaining: 30,
            resetTime: Date.now() + 60000,
          },
          error: null,
        };
      }

      const result = await limiter.limit(identifier);

      log.debug('Game action rate limit check', {
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
        'Game action rate limit check failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { identifier },
        }
      );

      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        data: {
          allowed: true,
          limit: 30,
          remaining: 30,
          resetTime: Date.now() + 60000,
        },
        error: null,
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
  limitType: 'api' | 'auth' | 'upload' | 'gameSession' | 'gameAction' = 'api',
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
    case 'gameAction':
      limitCheck = await rateLimitingService.checkGameActionLimit(identifier);
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
