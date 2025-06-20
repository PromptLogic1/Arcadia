/**
 * @jest-environment node
 */

import { cacheService } from '../redis.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');
jest.mock('@/lib/circuit-breaker', () => ({
  redisCircuitBreaker: {
    execute: jest.fn(async (fn, fallback) => {
      try {
        return await fn();
      } catch (error) {
        // If there's a fallback, use it (mimics circuit breaker behavior)
        if (fallback) {
          return fallback();
        }
        throw error;
      }
    }),
    getState: jest.fn(() => 'closed'),
  },
}));

describe('RedisService & CacheService - Enhanced Coverage', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    multi: jest.fn(),
  };

  const mockGetRedisClient = getRedisClient as jest.MockedFunction<
    typeof getRedisClient
  >;
  const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
    typeof isRedisConfigured
  >;
  const mockLog = log as jest.Mocked<typeof log>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as any);
  });

  describe('Enhanced coverage for uncovered lines', () => {
    // Test for lines 403-409 (cacheService.getOrSet when Redis not configured)
    it('should handle direct fetch failure when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch data');
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Direct fetch failed when Redis not configured',
        expect.objectContaining({
          metadata: {
            key: 'test-key',
            error: 'Fetch failed',
          },
        })
      );
    });

    it('should handle non-Error objects in direct fetch when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const fetcher = jest.fn().mockRejectedValue('String error');

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch data');
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Direct fetch failed when Redis not configured',
        expect.objectContaining({
          metadata: {
            key: 'test-key',
            error: 'String error',
          },
        })
      );
    });

    // Test for lines 430-439 (Redis configuration error with fetch failure)
    it('should handle fetch failure after Redis configuration error', async () => {
      // Mock Redis client creation to fail with config error
      mockGetRedisClient.mockImplementation(() => {
        throw new Error('Redis configuration error: invalid URL');
      });

      const fetcher = jest
        .fn()
        .mockRejectedValue(new Error('Fetch also failed'));

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result.success).toBe(false);
      // When circuit breaker returns null, it's treated as cache miss and goes to fetch
      expect(result.error).toBe('Failed to fetch and cache data');
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Cache fetch failed',
        expect.objectContaining({
          metadata: {
            key: 'test-key',
            error: 'Fetch also failed',
          },
        })
      );
    });

    it('should handle non-Error fetch failure after Redis configuration error', async () => {
      // Mock Redis client creation to fail with config error
      mockGetRedisClient.mockImplementation(() => {
        throw new Error('Redis configuration error: missing credentials');
      });

      const fetcher = jest.fn().mockRejectedValue('String fetch error');

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result.success).toBe(false);
      // When circuit breaker returns null, it's treated as cache miss and goes to fetch
      expect(result.error).toBe('Failed to fetch and cache data');
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Cache fetch failed',
        expect.objectContaining({
          metadata: {
            key: 'test-key',
            error: 'String fetch error',
          },
        })
      );
    });

    it('should handle non-Redis-config errors gracefully', async () => {
      // Mock Redis client creation to fail with non-config error
      mockGetRedisClient.mockImplementation(() => {
        throw new Error('Random error');
      });

      const fetcher = jest.fn().mockResolvedValue('test-data');

      // Circuit breaker will catch the error and return null (fallback)
      // This will be treated as a cache miss
      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-data');
      expect(fetcher).toHaveBeenCalled();
    });

    it('should successfully fall back to direct fetch on Redis config error', async () => {
      // Mock Redis client creation to fail with config error
      mockGetRedisClient.mockImplementation(() => {
        throw new Error('Redis configuration failed: connection timeout');
      });

      const fetcher = jest.fn().mockResolvedValue('fresh-data');

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe('fresh-data');
      // When Redis fails in circuit breaker, it falls back to null (cache miss)
      // Then tries to cache the fresh data which will fail again
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to cache fresh data',
        expect.objectContaining({
          metadata: {
            key: 'test-key',
            error: 'Failed to store data in Redis',
          },
        })
      );
    });
  });

  describe('Additional edge cases for complete coverage', () => {
    it('should handle complex Redis configuration error messages', async () => {
      const configErrors = [
        'Redis configuration missing: UPSTASH_REDIS_REST_URL',
        'Redis configuration invalid: malformed URL',
        'Redis configuration error: authentication failed',
      ];

      for (const errorMessage of configErrors) {
        jest.clearAllMocks(); // Clear mocks between iterations

        mockGetRedisClient.mockImplementation(() => {
          throw new Error(errorMessage);
        });

        const fetcher = jest.fn().mockResolvedValue(`data-${errorMessage}`);

        const result = await cacheService.getOrSet(
          `key-${errorMessage}`,
          fetcher
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(`data-${errorMessage}`);
        // When Redis fails in circuit breaker, it falls back to null (cache miss)
        // Then tries to cache the fresh data which will fail again
        expect(mockLog.warn).toHaveBeenCalledWith(
          'Failed to cache fresh data',
          expect.objectContaining({
            metadata: {
              key: `key-${errorMessage}`,
              error: 'Failed to store data in Redis',
            },
          })
        );
      }
    });

    it('should handle getOrSet with schema validation and Redis config error', async () => {
      // Mock Redis client creation to fail with config error
      mockGetRedisClient.mockImplementation(() => {
        throw new Error('Redis configuration error');
      });

      const schema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const fetcher = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const result = await cacheService.getOrSet(
        'schema-test-key',
        fetcher,
        300,
        schema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should handle edge case where Redis becomes available after initial config check', async () => {
      let callCount = 0;
      mockIsRedisConfigured.mockImplementation(() => {
        callCount++;
        return callCount > 1; // False first time, true after
      });

      const fetcher = jest.fn().mockResolvedValue('test-data');

      const result = await cacheService.getOrSet('edge-case-key', fetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
