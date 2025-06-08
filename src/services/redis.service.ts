/**
 * Redis Service - Basic Operations
 *
 * Service layer for Redis operations following the project's service pattern.
 * All operations return ServiceResponse for consistent error handling.
 */

import { getRedisClient, createRedisKey, REDIS_PREFIXES, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';

/**
 * Basic Redis service with fundamental operations
 */
export const redisService = {
  /**
   * Set a value with optional TTL
   */
  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): Promise<ServiceResponse<void>> {
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - skipping SET operation', {
        metadata: { key },
      });
      return createServiceSuccess(undefined);
    }

    try {
      const redis = getRedisClient();

      // Upstash Redis REST API handles JSON serialization automatically
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, value);
      } else {
        await redis.set(key, value);
      }

      log.debug('Redis SET operation successful', {
        metadata: { key, ttl: ttlSeconds },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Redis SET operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );

      return createServiceError('Failed to store data in Redis');
    }
  },

  /**
   * Get a value from Redis
   * Returns unknown type - caller should validate/parse as needed
   */
  async get(key: string): Promise<ServiceResponse<unknown>> {
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - returning null for GET operation', {
        metadata: { key },
      });
      return createServiceSuccess(null);
    }

    try {
      const redis = getRedisClient();
      const value = await redis.get(key);

      log.debug('Redis GET operation successful', {
        metadata: { key },
      });

      return createServiceSuccess(value);
    } catch (error) {
      log.error(
        'Redis GET operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );

      return createServiceError('Failed to retrieve data from Redis');
    }
  },

  /**
   * Get a typed value with Zod schema validation
   * Use this when you need type safety with validation
   */
  async getWithSchema<T>(
    key: string,
    schema: { parse: (data: unknown) => T }
  ): Promise<ServiceResponse<T | null>> {
    const result = await this.get(key);

    if (!result.success) {
      return result as ServiceResponse<T | null>;
    }

    if (result.data === null) {
      return createServiceSuccess(null);
    }

    try {
      const validated = schema.parse(result.data);
      return createServiceSuccess(validated);
    } catch (error) {
      log.error(
        'Redis data validation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );
      return createServiceError(
        'Retrieved data does not match expected schema'
      );
    }
  },

  /**
   * Delete a key
   */
  async delete(key: string): Promise<ServiceResponse<number>> {
    try {
      const redis = getRedisClient();
      const deleted = await redis.del(key);

      log.debug('Redis DELETE operation successful', {
        metadata: { key, deleted },
      });

      return createServiceSuccess(deleted);
    } catch (error) {
      log.error(
        'Redis DELETE operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );

      return createServiceError('Failed to delete data from Redis');
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<ServiceResponse<boolean>> {
    try {
      const redis = getRedisClient();
      const exists = await redis.exists(key);

      log.debug('Redis EXISTS operation successful', {
        metadata: { key, exists },
      });

      return createServiceSuccess(exists === 1);
    } catch (error) {
      log.error(
        'Redis EXISTS operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );

      return createServiceError('Failed to check key existence in Redis');
    }
  },

  /**
   * Increment a counter
   */
  async increment(key: string, by = 1): Promise<ServiceResponse<number>> {
    try {
      const redis = getRedisClient();
      const newValue = await redis.incrby(key, by);

      log.debug('Redis INCREMENT operation successful', {
        metadata: { key, by, newValue },
      });

      return createServiceSuccess(newValue);
    } catch (error) {
      log.error(
        'Redis INCREMENT operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, by },
        }
      );

      return createServiceError('Failed to increment counter in Redis');
    }
  },

  /**
   * Set expiration on existing key
   */
  async expire(
    key: string,
    ttlSeconds: number
  ): Promise<ServiceResponse<boolean>> {
    try {
      const redis = getRedisClient();
      const result = await redis.expire(key, ttlSeconds);

      log.debug('Redis EXPIRE operation successful', {
        metadata: { key, ttlSeconds, result },
      });

      return createServiceSuccess(result === 1);
    } catch (error) {
      log.error(
        'Redis EXPIRE operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, ttlSeconds },
        }
      );

      return createServiceError('Failed to set expiration in Redis');
    }
  },
};

/**
 * Cache service for commonly used caching patterns
 */
export const cacheService = {
  /**
   * Set a value in cache with TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds = 300
  ): Promise<ServiceResponse<void>> {
    return await redisService.set(key, value, ttlSeconds);
  },

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<ServiceResponse<T | null>> {
    const result = await redisService.get(key);
    if (!result.success) {
      return result as ServiceResponse<T | null>;
    }
    return { ...result, data: result.data as T | null };
  },

  /**
   * Get a typed value with Zod schema validation
   */
  async getWithSchema<T>(
    key: string,
    schema: { parse: (data: unknown) => T }
  ): Promise<ServiceResponse<T | null>> {
    return await redisService.getWithSchema(key, schema);
  },

  /**
   * Get from cache or fetch and cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<ServiceResponse<T>> {
    // If Redis is not configured, just fetch directly
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - fetching directly', {
        metadata: { key },
      });
      try {
        const fresh = await fetcher();
        return createServiceSuccess(fresh);
      } catch (error) {
        log.error(
          'Direct fetch failed',
          error instanceof Error ? error : new Error(String(error)),
          {
            metadata: { key },
          }
        );
        return createServiceError('Failed to fetch data');
      }
    }

    // Try to get from cache first
    const cached = await redisService.get(key);

    if (cached.success && cached.data !== null) {
      log.debug('Cache HIT', {
        metadata: { key },
      });
      return createServiceSuccess(cached.data as T);
    }

    // Cache miss - fetch fresh data
    try {
      log.debug('Cache MISS - fetching fresh data', {
        metadata: { key },
      });
      const fresh = await fetcher();

      // Store in cache
      const setResult = await redisService.set(key, fresh, ttlSeconds);

      if (!setResult.success) {
        log.warn('Failed to cache fresh data', {
          metadata: { key, error: setResult.error },
        });
      }

      return createServiceSuccess(fresh);
    } catch (error) {
      log.error(
        'Cache fetch failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key },
        }
      );

      return createServiceError('Failed to fetch and cache data');
    }
  },

  /**
   * Invalidate cache by key
   */
  async invalidate(key: string): Promise<ServiceResponse<void>> {
    const result = await redisService.delete(key);

    if (result.success) {
      log.info('Cache invalidated', {
        metadata: { key },
      });
      return createServiceSuccess(undefined);
    }

    return createServiceError(result.error || 'Failed to invalidate cache');
  },

  /**
   * Invalidate multiple cache keys by pattern
   * Note: This is a simple implementation that gets all keys and filters.
   * For production with many keys, consider using Redis SCAN with pattern matching
   */
  async invalidatePattern(pattern: string): Promise<ServiceResponse<void>> {
    try {
      const redis = getRedisClient();

      // Get all keys matching the pattern
      // Note: In a large Redis instance, consider using SCAN instead of KEYS
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        log.debug('No keys found for pattern', {
          metadata: { pattern },
        });
        return createServiceSuccess(undefined);
      }

      // Delete all matching keys
      await redis.del(...keys);

      log.info('Cache pattern invalidated', {
        metadata: { pattern, keysDeleted: keys.length },
      });
      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Cache pattern invalidation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { pattern },
        }
      );
      return createServiceError('Failed to invalidate cache pattern');
    }
  },

  /**
   * Create cache key with consistent naming
   */
  createKey(category: string, ...parts: string[]): string {
    return createRedisKey(REDIS_PREFIXES.CACHE, category, ...parts);
  },
};
