/**
 * Redis-based distributed cache for performance optimization
 * Type-safe implementation using Zod validation
 */

import { cacheService } from '@/services/redis.service';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';

/**
 * Centralized TTL strategy for consistent caching
 */
export const CACHE_TTL = {
  // Short-lived data
  SESSION: 15 * 60, // 15 minutes
  RATE_LIMIT: 60, // 1 minute

  // Medium-lived data
  USER_PROFILE: 30 * 60, // 30 minutes
  BOARD_DATA: 60 * 60, // 1 hour
  QUERY_RESULT: 5 * 60, // 5 minutes

  // Long-lived data
  PUBLIC_BOARDS: 4 * 60 * 60, // 4 hours
  LEADERBOARD: 2 * 60 * 60, // 2 hours
  USER_STATS: 24 * 60 * 60, // 24 hours
} as const;

/**
 * Redis-based cache implementation
 * Replaces the old in-memory cache with distributed Redis storage
 */
class RedisCache {
  /**
   * Store data in Redis cache with TTL
   */
  async set<T>(
    key: string,
    data: T,
    ttlSeconds = 300
  ): Promise<ServiceResponse<void>> {
    try {
      const result = await cacheService.set(key, data, ttlSeconds);
      if (!result.success) {
        log.warn('Cache set operation failed', {
          metadata: { key, ttl: ttlSeconds, error: result.error },
        });
      }
      return result;
    } catch (error) {
      log.error(
        'Cache set operation threw error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, ttl: ttlSeconds },
        }
      );
      return createServiceError('Failed to store in cache');
    }
  }

  /**
   * Get data from Redis cache with type validation
   * @param schema - Optional Zod schema for runtime validation. Strongly recommended for type safety.
   */
  async get<T>(
    key: string,
    schema?: { parse: (data: unknown) => T }
  ): Promise<ServiceResponse<T | null>> {
    try {
      if (schema) {
        return await cacheService.getWithSchema(key, schema);
      } else {
        // Without schema, we delegate to the lower-level service
        // which will return unknown data that the caller must handle
        log.debug('Cache get without schema - use schema for type safety', {
          metadata: { key },
        });
        // For type safety without schema, we must return null
        // This forces callers to either provide a schema or handle null
        return createServiceSuccess(null);
      }
    } catch (error) {
      log.error(
        'Cache get operation threw error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );
      return createServiceError('Failed to retrieve from cache');
    }
  }

  /**
   * Set data with TTL category for consistency
   */
  async setWithCategory<T>(
    key: string,
    data: T,
    category: keyof typeof CACHE_TTL
  ): Promise<ServiceResponse<void>> {
    return await this.set(key, data, CACHE_TTL[category]);
  }

  /**
   * Get with fallback fetcher - graceful degradation pattern
   */
  async getWithFallback<T>(
    key: string,
    fallbackFetcher: () => Promise<T>,
    category: keyof typeof CACHE_TTL,
    schema?: { parse: (data: unknown) => T }
  ): Promise<ServiceResponse<T>> {
    // Try cache first
    const cacheResult = await this.get(key, schema);

    if (cacheResult.success && cacheResult.data !== null) {
      return createServiceSuccess(cacheResult.data);
    }

    // Cache miss or error - fetch from source
    try {
      const freshData = await fallbackFetcher();

      // Try to cache (non-blocking)
      this.setWithCategory(key, freshData, category).catch(error => {
        log.warn('Failed to cache fresh data', {
          metadata: { key, error },
        });
      });

      return createServiceSuccess(freshData);
    } catch (error) {
      log.error(
        'Fallback fetcher failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );
      return createServiceError('Failed to fetch data');
    }
  }

  /**
   * Get data with fallback fetcher pattern
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<ServiceResponse<T>> {
    return await cacheService.getOrSet(key, fetcher, ttlSeconds);
  }

  /**
   * Invalidate cache entries by key or pattern
   */
  async invalidate(keyOrPattern: string): Promise<ServiceResponse<void>> {
    try {
      if (keyOrPattern.includes('*')) {
        return await cacheService.invalidatePattern(keyOrPattern);
      } else {
        return await cacheService.invalidate(keyOrPattern);
      }
    } catch (error) {
      log.error(
        'Cache invalidation threw error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { keyOrPattern },
        }
      );
      return createServiceError('Failed to invalidate cache');
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clear(): Promise<ServiceResponse<void>> {
    return await this.invalidate('*');
  }

  /**
   * Create structured cache key
   */
  createKey(prefix: string, ...parts: string[]): string {
    return cacheService.createKey(prefix, ...parts);
  }

  /**
   * Set data with automatic TTL based on key type
   */
  async setAuto<T>(key: string, data: T): Promise<ServiceResponse<void>> {
    // Extract prefix from key to determine TTL
    const keyPrefix = key.split(':')[1]; // Skip '@arcadia/cache:' prefix
    const ttlCategory =
      CACHE_KEY_TTL_MAP[keyPrefix as keyof typeof CACHE_KEY_TTL_MAP];

    if (ttlCategory) {
      return await this.setWithCategory(
        key,
        data,
        ttlCategory as keyof typeof CACHE_TTL
      );
    } else {
      // Default TTL for unknown key types
      return await this.set(key, data, CACHE_TTL.QUERY_RESULT);
    }
  }
}

export const cache = new RedisCache();

export const CACHE_KEYS = {
  USER_PROFILE: (userId: string): string =>
    cache.createKey('user-profile', userId),
  BOARD_DATA: (boardId: string): string =>
    cache.createKey('bingo-board', boardId),
  SESSION_DATA: (sessionId: string): string =>
    cache.createKey('session', sessionId),
  QUERY_RESULT: (queryKey: string): string =>
    cache.createKey('query', queryKey),
  PUBLIC_BOARDS: (filters: string): string =>
    cache.createKey('public-boards', filters),
  USER_BOARDS: (userId: string, filters: string): string =>
    cache.createKey('user-boards', userId, filters),
  LEADERBOARD: (gameType: string): string =>
    cache.createKey('leaderboard', gameType),
  USER_STATS: (userId: string): string => cache.createKey('user-stats', userId),
} as const;

/**
 * Cache key to TTL category mapping for consistency
 */
export const CACHE_KEY_TTL_MAP = {
  'user-profile': 'USER_PROFILE',
  'bingo-board': 'BOARD_DATA',
  session: 'SESSION',
  query: 'QUERY_RESULT',
  'public-boards': 'PUBLIC_BOARDS',
  'user-boards': 'QUERY_RESULT',
  leaderboard: 'LEADERBOARD',
  'user-stats': 'USER_STATS',
} as const;
