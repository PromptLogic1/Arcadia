import { cache, CACHE_TTL, CACHE_KEYS, CACHE_KEY_TTL_MAP } from '../cache';
import { cacheService } from '@/services/redis.service';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';
import { cacheMetrics, measureLatency } from '@/lib/cache-metrics';
import { z } from 'zod';

// Mock dependencies
jest.mock('@/services/redis.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/cache-metrics');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockLog = log as jest.Mocked<typeof log>;
const mockCacheMetrics = cacheMetrics as jest.Mocked<typeof cacheMetrics>;
const mockMeasureLatency = measureLatency as jest.MockedFunction<
  typeof measureLatency
>;

describe('RedisCache', () => {
  const mockLatencyFn = jest.fn(() => 100);

  beforeEach(() => {
    jest.clearAllMocks();
    mockMeasureLatency.mockReturnValue(mockLatencyFn);
  });

  describe('set', () => {
    it('stores data in cache with TTL', async () => {
      mockCacheService.set.mockResolvedValue(createServiceSuccess(undefined));

      const result = await cache.set('test-key', { data: 'test' }, 300);

      expect(result.success).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        300
      );
      expect(mockCacheMetrics.recordSet).toHaveBeenCalledWith(100);
    });

    it('uses default TTL when not specified', async () => {
      mockCacheService.set.mockResolvedValue(createServiceSuccess(undefined));

      await cache.set('test-key', { data: 'test' });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        300
      );
    });

    it('handles cache service errors', async () => {
      mockCacheService.set.mockResolvedValue(createServiceError('Redis error'));

      const result = await cache.set('test-key', { data: 'test' });

      expect(result.success).toBe(false);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Cache set operation failed',
        expect.objectContaining({
          metadata: { key: 'test-key', ttl: 300, error: 'Redis error' },
        })
      );
      expect(mockCacheMetrics.recordError).toHaveBeenCalledWith(100);
    });

    it('handles exceptions', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Network error'));

      const result = await cache.set('test-key', { data: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to store in cache');
      expect(mockLog.error).toHaveBeenCalled();
      expect(mockCacheMetrics.recordError).toHaveBeenCalledWith(100);
    });
  });

  describe('get', () => {
    const testSchema = z.object({
      data: z.string(),
    });

    it('retrieves data from cache with schema validation', async () => {
      const testData = { data: 'test' };
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceSuccess(testData)
      );

      const result = await cache.get('test-key', testSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(mockCacheService.getWithSchema).toHaveBeenCalledWith(
        'test-key',
        testSchema
      );
      expect(mockCacheMetrics.recordHit).toHaveBeenCalledWith(100);
    });

    it('returns null when data not found', async () => {
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceSuccess(null)
      );

      const result = await cache.get('test-key', testSchema);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockCacheMetrics.recordMiss).toHaveBeenCalledWith(100);
    });

    it('returns null when no schema provided', async () => {
      const result = await cache.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Cache get without schema - use schema for type safety',
        expect.objectContaining({ metadata: { key: 'test-key' } })
      );
    });

    it('handles cache service errors', async () => {
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceError('Redis error')
      );

      const result = await cache.get('test-key', testSchema);

      expect(result.success).toBe(false);
      expect(mockCacheMetrics.recordError).toHaveBeenCalledWith(100);
    });

    it('handles exceptions', async () => {
      mockCacheService.getWithSchema.mockRejectedValue(
        new Error('Network error')
      );

      const result = await cache.get('test-key', testSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve from cache');
      expect(mockLog.error).toHaveBeenCalled();
    });
  });

  describe('setWithCategory', () => {
    it('uses TTL from category', async () => {
      mockCacheService.set.mockResolvedValue(createServiceSuccess(undefined));

      await cache.setWithCategory('test-key', { data: 'test' }, 'USER_PROFILE');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        CACHE_TTL.USER_PROFILE
      );
    });
  });

  describe('getWithFallback', () => {
    const testSchema = z.object({ data: z.string() });
    const fallbackData = { data: 'fallback' };
    const mockFallback = jest.fn().mockResolvedValue(fallbackData);

    beforeEach(() => {
      mockFallback.mockClear();
    });

    it('returns cached data when available', async () => {
      const cachedData = { data: 'cached' };
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceSuccess(cachedData)
      );

      const result = await cache.getWithFallback(
        'test-key',
        mockFallback,
        'USER_PROFILE',
        testSchema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(mockFallback).not.toHaveBeenCalled();
    });

    it('calls fallback on cache miss', async () => {
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceSuccess(null)
      );
      mockCacheService.set.mockResolvedValue(createServiceSuccess(undefined));

      const result = await cache.getWithFallback(
        'test-key',
        mockFallback,
        'USER_PROFILE',
        testSchema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fallbackData);
      expect(mockFallback).toHaveBeenCalled();

      // Verify it tries to cache the fresh data
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async cache
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        fallbackData,
        CACHE_TTL.USER_PROFILE
      );
    });

    it('handles fallback errors', async () => {
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceSuccess(null)
      );
      mockFallback.mockRejectedValue(new Error('Fetch failed'));

      const result = await cache.getWithFallback(
        'test-key',
        mockFallback,
        'USER_PROFILE',
        testSchema
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch data');
      expect(mockLog.error).toHaveBeenCalled();
    });

    it('continues even if caching fresh data fails', async () => {
      mockCacheService.getWithSchema.mockResolvedValue(
        createServiceSuccess(null)
      );
      mockCacheService.set.mockRejectedValue(new Error('Cache write failed'));

      const result = await cache.getWithFallback(
        'test-key',
        mockFallback,
        'USER_PROFILE',
        testSchema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fallbackData);

      // Wait for async cache attempt
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to cache fresh data',
        expect.any(Object)
      );
    });
  });

  describe('getOrSet', () => {
    it('delegates to cache service', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
      const expectedResult = createServiceSuccess({ data: 'test' });
      mockCacheService.getOrSet.mockResolvedValue(expectedResult);

      const result = await cache.getOrSet('test-key', fetcher, 300);

      expect(result).toBe(expectedResult);
      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'test-key',
        fetcher,
        300
      );
    });
  });

  describe('invalidate', () => {
    it('invalidates single key', async () => {
      mockCacheService.invalidate.mockResolvedValue(
        createServiceSuccess(undefined)
      );

      const result = await cache.invalidate('test-key');

      expect(result.success).toBe(true);
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('test-key');
    });

    it('invalidates pattern when key contains wildcard', async () => {
      mockCacheService.invalidatePattern.mockResolvedValue(
        createServiceSuccess(undefined)
      );

      const result = await cache.invalidate('test-*');

      expect(result.success).toBe(true);
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('test-*');
    });

    it('handles invalidation errors', async () => {
      mockCacheService.invalidate.mockRejectedValue(new Error('Redis error'));

      const result = await cache.invalidate('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to invalidate cache');
      expect(mockLog.error).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('invalidates all cache entries', async () => {
      mockCacheService.invalidatePattern.mockResolvedValue(
        createServiceSuccess(undefined)
      );

      const result = await cache.clear();

      expect(result.success).toBe(true);
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('*');
    });
  });

  describe('createKey', () => {
    it('delegates to cache service', () => {
      mockCacheService.createKey.mockReturnValue('@arcadia/cache:user:123');

      const key = cache.createKey('user', '123');

      expect(key).toBe('@arcadia/cache:user:123');
      expect(mockCacheService.createKey).toHaveBeenCalledWith('user', '123');
    });
  });

  describe('setAuto', () => {
    it('uses correct TTL based on key prefix', async () => {
      mockCacheService.set.mockResolvedValue(createServiceSuccess(undefined));

      await cache.setAuto('@arcadia/cache:user-profile:123', { data: 'test' });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        '@arcadia/cache:user-profile:123',
        { data: 'test' },
        CACHE_TTL.USER_PROFILE
      );
    });

    it('uses default TTL for unknown key types', async () => {
      mockCacheService.set.mockResolvedValue(createServiceSuccess(undefined));

      await cache.setAuto('@arcadia/cache:unknown:123', { data: 'test' });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        '@arcadia/cache:unknown:123',
        { data: 'test' },
        CACHE_TTL.QUERY_RESULT
      );
    });
  });

  describe('CACHE_KEYS', () => {
    it('generates correct cache keys', () => {
      mockCacheService.createKey.mockImplementation(
        (prefix, ...parts) => `@arcadia/cache:${[prefix, ...parts].join(':')}`
      );

      expect(CACHE_KEYS.USER_PROFILE('123')).toBe(
        '@arcadia/cache:user-profile:123'
      );
      expect(CACHE_KEYS.BOARD_DATA('board-456')).toBe(
        '@arcadia/cache:bingo-board:board-456'
      );
      expect(CACHE_KEYS.SESSION_DATA('session-789')).toBe(
        '@arcadia/cache:session:session-789'
      );
      expect(CACHE_KEYS.USER_BOARDS('user-123', 'active')).toBe(
        '@arcadia/cache:user-boards:user-123:active'
      );
    });
  });

  describe('CACHE_KEY_TTL_MAP', () => {
    it('maps all key prefixes to TTL categories', () => {
      const allTTLCategories = Object.keys(CACHE_TTL);
      const mappedCategories = Object.values(CACHE_KEY_TTL_MAP);

      mappedCategories.forEach(category => {
        expect(allTTLCategories).toContain(category);
      });
    });
  });
});
