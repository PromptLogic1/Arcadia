/**
 * Enhanced Cache Service with Metrics and Resilience
 *
 * This service provides a high-level cache interface with:
 * - Circuit breaker protection
 * - Cache stampede protection
 * - Comprehensive metrics
 * - Type-safe operations with Zod validation
 * - Graceful degradation
 */

import type { z } from 'zod';
import { enhancedRedis } from '@/lib/redis-enhanced';
import { createRedisKey, REDIS_PREFIXES } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';

/**
 * Enhanced TTL strategy for consistent caching
 */
export const ENHANCED_CACHE_TTL = {
  // Short-lived data
  SESSION: 15 * 60, // 15 minutes
  RATE_LIMIT: 60, // 1 minute
  TEMP_DATA: 5 * 60, // 5 minutes

  // Medium-lived data
  USER_PROFILE: 30 * 60, // 30 minutes
  BOARD_DATA: 60 * 60, // 1 hour
  QUERY_RESULT: 10 * 60, // 10 minutes
  API_RESPONSE: 5 * 60, // 5 minutes

  // Long-lived data
  PUBLIC_BOARDS: 4 * 60 * 60, // 4 hours
  LEADERBOARD: 2 * 60 * 60, // 2 hours
  USER_STATS: 24 * 60 * 60, // 24 hours
  STATIC_DATA: 7 * 24 * 60 * 60, // 7 days
} as const;

/**
 * Cache operation options
 */
interface CacheOptions {
  ttl?: number;
  namespace?: string;
  fallback?: () => Promise<unknown> | unknown;
  skipCache?: boolean;
}

/**
 * Enhanced cache service with metrics and resilience
 */
class EnhancedCacheService {
  /**
   * Create a namespaced cache key
   */
  private createKey(key: string, namespace?: string): string {
    const prefix = namespace || 'general';
    return createRedisKey(REDIS_PREFIXES.CACHE, prefix, key);
  }

  /**
   * Store data in cache with enhanced error handling
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<ServiceResponse<void>> {
    try {
      const { ttl = ENHANCED_CACHE_TTL.QUERY_RESULT, namespace } = options;
      const cacheKey = this.createKey(key, namespace);

      const success = await enhancedRedis.set(cacheKey, data, ttl);

      if (success) {
        return createServiceSuccess(undefined);
      } else {
        log.warn('Cache set operation returned false', {
          metadata: { key: cacheKey, ttl },
        });
        return createServiceError('Failed to store data in cache');
      }
    } catch (error) {
      log.error(
        'Cache set operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, options },
        }
      );
      return createServiceError('Cache operation failed');
    }
  }

  /**
   * Get data from cache with type validation and metrics
   */
  async get<T>(
    key: string,
    schema?: z.ZodSchema<T>,
    options: CacheOptions = {}
  ): Promise<ServiceResponse<T | null>> {
    try {
      const { namespace, fallback } = options;
      const cacheKey = this.createKey(key, namespace);

      const cachedData = await enhancedRedis.get<string>(cacheKey);

      if (cachedData === null) {
        log.debug('Cache miss', {
          metadata: { key: cacheKey },
        });

        if (fallback) {
          try {
            const fallbackData = await fallback();
            return createServiceSuccess(fallbackData as T);
          } catch (fallbackError) {
            log.error(
              'Cache fallback failed',
              fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError))
            );
            return createServiceSuccess(null);
          }
        }

        return createServiceSuccess(null);
      }

      // Parse cached data
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(cachedData);
      } catch (parseError) {
        log.error(
          'Failed to parse cached data',
          parseError instanceof Error
            ? parseError
            : new Error(String(parseError)),
          {
            metadata: { key: cacheKey },
          }
        );
        return createServiceSuccess(null);
      }

      // Validate with schema if provided
      if (schema) {
        try {
          const validatedData = schema.parse(parsedData);
          log.debug('Cache hit with validation', {
            metadata: { key: cacheKey },
          });
          return createServiceSuccess(validatedData);
        } catch (validationError) {
          log.warn('Cached data validation failed', {
            metadata: {
              key: cacheKey,
              error:
                validationError instanceof Error
                  ? validationError.message
                  : String(validationError),
            },
          });

          // Invalid data, remove from cache
          await this.del(key, { namespace });
          return createServiceSuccess(null);
        }
      }

      log.debug('Cache hit without validation', {
        metadata: { key: cacheKey },
      });
      return createServiceSuccess(parsedData as T);
    } catch (error) {
      log.error(
        'Cache get operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, options },
        }
      );

      if (options.fallback) {
        try {
          const fallbackData = await options.fallback();
          return createServiceSuccess(fallbackData as T);
        } catch (fallbackError) {
          log.error(
            'Cache fallback failed',
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError))
          );
        }
      }

      return createServiceSuccess(null);
    }
  }

  /**
   * Get or set with cache stampede protection
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    schema?: z.ZodSchema<T>,
    options: CacheOptions = {}
  ): Promise<ServiceResponse<T | null>> {
    try {
      const {
        ttl = ENHANCED_CACHE_TTL.QUERY_RESULT,
        namespace,
        skipCache = false,
      } = options;
      const cacheKey = this.createKey(key, namespace);

      if (skipCache) {
        const freshData = await fetcher();
        await this.set(key, freshData, options);
        return createServiceSuccess(freshData);
      }

      const result = await enhancedRedis.getOrSet(cacheKey, fetcher, ttl);

      if (result === null) {
        return createServiceSuccess(null);
      }

      // Validate with schema if provided
      if (schema) {
        try {
          const validatedData = schema.parse(result);
          return createServiceSuccess(validatedData);
        } catch (validationError) {
          log.warn('getOrSet data validation failed', {
            metadata: {
              key: cacheKey,
              error:
                validationError instanceof Error
                  ? validationError.message
                  : String(validationError),
            },
          });

          // Invalid data, remove from cache and refetch
          await this.del(key, { namespace });
          const freshData = await fetcher();
          await this.set(key, freshData, options);
          return createServiceSuccess(freshData);
        }
      }

      return createServiceSuccess(result);
    } catch (error) {
      log.error(
        'getOrSet operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, options },
        }
      );

      // Fallback to direct fetcher call
      try {
        const freshData = await fetcher();
        return createServiceSuccess(freshData);
      } catch (fetcherError) {
        log.error(
          'Fetcher fallback failed',
          fetcherError instanceof Error
            ? fetcherError
            : new Error(String(fetcherError))
        );
        return createServiceSuccess(null);
      }
    }
  }

  /**
   * Delete cached data
   */
  async del(
    key: string,
    options: CacheOptions = {}
  ): Promise<ServiceResponse<number>> {
    try {
      const { namespace } = options;
      const cacheKey = this.createKey(key, namespace);

      const deletedCount = await enhancedRedis.del(cacheKey);

      log.debug('Cache delete operation', {
        metadata: { key: cacheKey, deletedCount },
      });

      return createServiceSuccess(deletedCount);
    } catch (error) {
      log.error(
        'Cache delete operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, options },
        }
      );
      return createServiceError('Cache delete failed');
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(
    pattern: string,
    namespace?: string
  ): Promise<ServiceResponse<number>> {
    try {
      const fullPattern = namespace
        ? createRedisKey(REDIS_PREFIXES.CACHE, namespace, pattern)
        : createRedisKey(REDIS_PREFIXES.CACHE, '*', pattern);

      const deletedCount = await enhancedRedis.invalidateByPattern(fullPattern);

      log.info('Cache pattern invalidation', {
        metadata: { pattern: fullPattern, deletedCount },
      });

      return createServiceSuccess(deletedCount);
    } catch (error) {
      log.error(
        'Cache pattern invalidation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { pattern, namespace },
        }
      );
      return createServiceError('Cache pattern invalidation failed');
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    return enhancedRedis.getMetrics();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    enhancedRedis.resetMetrics();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return enhancedRedis.healthCheck();
  }

  /**
   * Warm cache for critical data
   */
  async warmCache<T>(
    items: Array<{
      key: string;
      fetcher: () => Promise<T>;
      schema?: z.ZodSchema<T>;
      options?: CacheOptions;
    }>
  ): Promise<ServiceResponse<number>> {
    try {
      let successCount = 0;

      await Promise.allSettled(
        items.map(async item => {
          try {
            await this.getOrSet(
              item.key,
              item.fetcher,
              item.schema,
              item.options
            );
            successCount++;
          } catch (error) {
            log.warn('Cache warming failed for item', {
              metadata: {
                key: item.key,
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        })
      );

      log.info('Cache warming completed', {
        metadata: { total: items.length, successful: successCount },
      });

      return createServiceSuccess(successCount);
    } catch (error) {
      log.error(
        'Cache warming failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return createServiceError('Cache warming failed');
    }
  }
}

// Export singleton instance
export const enhancedCache = new EnhancedCacheService();

// Export for backward compatibility
export { ENHANCED_CACHE_TTL as CACHE_TTL };
