/**
 * Redis Service - Basic Operations
 *
 * Service layer for Redis operations following the project's service pattern.
 * All operations return ServiceResponse for consistent error handling.
 *
 * IMPORTANT: All Redis operations are server-side only. Client-side calls
 * will be handled gracefully by falling back to direct fetcher execution.
 */

import {
  getRedisClient,
  createRedisKey,
  REDIS_PREFIXES,
  isRedisConfigured,
} from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { redisCircuitBreaker } from '@/lib/circuit-breaker';

/**
 * Check if we're running in a browser environment
 * Redis operations should never run client-side
 */
function isClientSide(): boolean {
  return typeof window !== 'undefined';
}

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
    if (isClientSide()) {
      log.debug(
        'Redis operations not available client-side - skipping SET operation',
        {
          metadata: { key },
        }
      );
      return createServiceSuccess(undefined);
    }

    if (!isRedisConfigured()) {
      log.debug('Redis not configured - skipping SET operation', {
        metadata: { key },
      });
      return createServiceSuccess(undefined);
    }

    try {
      // Use circuit breaker for fault tolerance
      await redisCircuitBreaker.execute(async () => {
        const redis = getRedisClient();

        // Serialize objects to JSON for storage
        const serializedValue =
          typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : value;

        if (ttlSeconds) {
          await redis.setex(key, ttlSeconds, serializedValue);
        } else {
          await redis.set(key, serializedValue);
        }
      });

      log.debug('Redis SET operation successful', {
        metadata: { key, ttl: ttlSeconds },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Redis SET operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, circuitState: redisCircuitBreaker.getState() },
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
    if (isClientSide()) {
      // Silent return for client-side - this is expected behavior
      return createServiceSuccess(null);
    }

    if (!isRedisConfigured()) {
      // Silent return when Redis not configured
      return createServiceSuccess(null);
    }

    try {
      // Use circuit breaker with fallback to null
      const value = await redisCircuitBreaker.execute(
        async () => {
          const redis = getRedisClient();
          return await redis.get(key);
        },
        // Fallback returns null (cache miss) when circuit is open
        () => null
      );

      log.debug('Redis GET operation completed', {
        metadata: {
          key,
          found: value !== null,
          circuitState: redisCircuitBreaker.getState(),
        },
      });

      return createServiceSuccess(value);
    } catch (error) {
      // Check if this is a client-side error (should not happen with checks above)
      if (
        error instanceof Error &&
        error.message.includes('browser environment')
      ) {
        return createServiceSuccess(null);
      }

      log.error(
        'Redis GET operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, circuitState: redisCircuitBreaker.getState() },
        }
      );

      // Return null instead of error for graceful degradation
      return createServiceSuccess(null);
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
      return createServiceError(
        result.error || 'Failed to get value from Redis'
      );
    }

    if (result.data === null) {
      return createServiceSuccess(null);
    }

    try {
      // Parse JSON string if needed
      const parsedData =
        typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

      const validated = schema.parse(parsedData);
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
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - skipping DELETE operation', {
        metadata: { key },
      });
      return createServiceSuccess(0);
    }

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
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - returning false for EXISTS operation', {
        metadata: { key },
      });
      return createServiceSuccess(false);
    }

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
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - returning 0 for INCREMENT operation', {
        metadata: { key, by },
      });
      return createServiceSuccess(0);
    }

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
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - returning false for EXPIRE operation', {
        metadata: { key, ttlSeconds },
      });
      return createServiceSuccess(false);
    }

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
 * Automatically handles client-side vs server-side execution
 */
export const cacheService = {
  /**
   * Set a value in cache with TTL
   * On client-side, this is a no-op
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
   * On client-side, always returns null (cache miss)
   */
  async get(key: string): Promise<ServiceResponse<unknown>> {
    const result = await redisService.get(key);
    if (!result.success) {
      return createServiceError(result.error || 'Failed to get from cache');
    }
    // Return the data without type assertion - caller should validate
    return createServiceSuccess(result.data);
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
   * Get from cache or fetch and cache with schema validation
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300,
    schema?: { parse: (data: unknown) => T }
  ): Promise<ServiceResponse<T>> {
    // If running client-side, always fetch directly (no caching)
    if (isClientSide()) {
      try {
        const fresh = await fetcher();
        return createServiceSuccess(fresh);
      } catch (error) {
        log.debug('Direct fetch failed on client-side', {
          metadata: {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        return createServiceError('Failed to fetch data');
      }
    }

    // If Redis is not configured, just fetch directly
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - fetching directly', {
        metadata: { key },
      });
      try {
        const fresh = await fetcher();
        return createServiceSuccess(fresh);
      } catch (error) {
        log.debug('Direct fetch failed when Redis not configured', {
          metadata: {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        return createServiceError('Failed to fetch data');
      }
    }

    // Try to get from cache first, but handle Redis client creation errors
    let cached: ServiceResponse<unknown>;
    try {
      cached = await redisService.get(key);
    } catch (error) {
      // If Redis client creation fails, fall back to direct fetch
      if (
        error instanceof Error &&
        error.message.includes('Redis configuration')
      ) {
        log.warn('Redis configuration failed, falling back to direct fetch', {
          metadata: { key, error: error.message },
        });
        try {
          const fresh = await fetcher();
          return createServiceSuccess(fresh);
        } catch (fetchError) {
          log.error(
            'Direct fetch failed after Redis configuration error',
            fetchError instanceof Error
              ? fetchError
              : new Error(String(fetchError)),
            {
              metadata: { key },
            }
          );
          return createServiceError('Failed to fetch data');
        }
      }
      throw error; // Re-throw if it's not a Redis config error
    }

    if (cached.success && cached.data !== null) {
      log.debug('Cache HIT', {
        metadata: { key },
      });

      // If schema is provided, validate the cached data
      if (schema) {
        try {
          const validated = schema.parse(cached.data);
          return createServiceSuccess(validated);
        } catch (error) {
          log.warn('Cached data failed validation, fetching fresh', {
            metadata: { key, error },
          });
          // Fall through to fetch fresh data
        }
      } else {
        // Without schema, we can't validate the type
        // But we can still return the data since it was originally stored by the fetcher
        // The TypeScript compiler will trust the generic type T
        log.debug('Cache hit without schema - returning cached data', {
          metadata: { key },
        });
        // Without schema, we must fetch fresh data to ensure type safety
        // This is the safest approach to avoid type mismatches
        log.debug('No schema provided - fetching fresh data for type safety');
      }
    }

    // Cache miss - fetch fresh data
    try {
      log.debug('Cache MISS - fetching fresh data', {
        metadata: { key },
      });
      const fresh = await fetcher();

      // Try to store in cache, but don't fail if Redis is not available
      try {
        const setResult = await redisService.set(key, fresh, ttlSeconds);
        if (!setResult.success) {
          log.warn('Failed to cache fresh data', {
            metadata: { key, error: setResult.error },
          });
        }
      } catch (cacheError) {
        // Log but don't fail - data was fetched successfully
        log.warn('Failed to cache data due to Redis configuration issue', {
          metadata: {
            key,
            error:
              cacheError instanceof Error
                ? cacheError.message
                : String(cacheError),
          },
        });
      }

      return createServiceSuccess(fresh);
    } catch (error) {
      log.debug('Cache fetch failed', {
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      });

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
    if (!isRedisConfigured()) {
      log.debug('Redis not configured - skipping pattern invalidation', {
        metadata: { pattern },
      });
      return createServiceSuccess(undefined);
    }

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
