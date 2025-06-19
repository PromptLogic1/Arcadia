/**
 * @jest-environment node
 */

import { redisService, cacheService } from '../redis.service';
import {
  getRedisClient,
  isRedisConfigured,
  createRedisKey,
  REDIS_PREFIXES,
} from '@/lib/redis';
import { redisCircuitBreaker } from '@/lib/circuit-breaker';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/circuit-breaker');
jest.mock('@/lib/logger');

const mockGetRedisClient = getRedisClient as jest.MockedFunction<
  typeof getRedisClient
>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
  typeof isRedisConfigured
>;
const mockCreateRedisKey = createRedisKey as jest.MockedFunction<
  typeof createRedisKey
>;
const mockRedisCircuitBreaker = redisCircuitBreaker as jest.Mocked<
  typeof redisCircuitBreaker
>;

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incrby: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
};

// Mock global window to simulate client-side environment
const originalWindow = global.window;

describe('redisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedisClient.mockReturnValue(mockRedisClient as any);
    mockIsRedisConfigured.mockReturnValue(true);
    mockRedisCircuitBreaker.execute.mockImplementation(fn => fn());
    mockRedisCircuitBreaker.getState.mockReturnValue('CLOSED');

    // Ensure we're in server-side environment by default
    delete (global as any).window;
  });

  afterAll(() => {
    global.window = originalWindow;
  });

  describe('set', () => {
    it('should set value successfully without TTL', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');

      const result = await redisService.set('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        'test-value'
      );
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith('Redis SET operation successful', {
        metadata: { key: 'test-key', ttl: undefined },
      });
    });

    it('should set value successfully with TTL', async () => {
      mockRedisClient.setex.mockResolvedValueOnce('OK');

      const result = await redisService.set('test-key', 'test-value', 300);

      expect(result.success).toBe(true);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        'test-value'
      );
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should serialize objects to JSON', async () => {
      const objectValue = { name: 'test', count: 42 };
      mockRedisClient.set.mockResolvedValueOnce('OK');

      await redisService.set('test-key', objectValue);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(objectValue)
      );
    });

    it('should handle null values', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');

      await redisService.set('test-key', null);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', null);
    });

    it('should skip operation on client-side', async () => {
      // Simulate client-side environment
      (global as any).window = {};

      const result = await redisService.set('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith(
        'Redis operations not available client-side - skipping SET operation',
        { metadata: { key: 'test-key' } }
      );
    });

    it('should skip operation when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await redisService.set('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith(
        'Redis not configured - skipping SET operation',
        { metadata: { key: 'test-key' } }
      );
    });

    it('should handle Redis errors through circuit breaker', async () => {
      mockRedisCircuitBreaker.execute.mockRejectedValueOnce(
        new Error('Redis connection failed')
      );

      const result = await redisService.set('test-key', 'test-value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to store data in Redis');
      expect(log.error).toHaveBeenCalledWith(
        'Redis SET operation failed',
        expect.any(Error),
        { metadata: { key: 'test-key', circuitState: 'CLOSED' } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockRedisCircuitBreaker.execute.mockRejectedValueOnce('String error');

      const result = await redisService.set('test-key', 'test-value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to store data in Redis');
      expect(log.error).toHaveBeenCalledWith(
        'Redis SET operation failed',
        expect.any(Error),
        { metadata: { key: 'test-key', circuitState: 'CLOSED' } }
      );
    });
  });

  describe('get', () => {
    it('should get value successfully', async () => {
      mockRedisClient.get.mockResolvedValueOnce('test-value');

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(log.debug).toHaveBeenCalledWith('Redis GET operation completed', {
        metadata: {
          key: 'test-key',
          found: true,
          circuitState: 'CLOSED',
        },
      });
    });

    it('should return null when value not found', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(log.debug).toHaveBeenCalledWith('Redis GET operation completed', {
        metadata: {
          key: 'test-key',
          found: false,
          circuitState: 'CLOSED',
        },
      });
    });

    it('should return null on client-side', async () => {
      // Simulate client-side environment
      (global as any).window = {};

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return null when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should use circuit breaker with fallback', async () => {
      const fallbackFn = jest.fn().mockReturnValue(null);
      mockRedisCircuitBreaker.execute.mockImplementationOnce((fn, fallback) => {
        return fallback!();
      });

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle browser environment error gracefully', async () => {
      const browserError = new Error('browser environment');
      mockRedisCircuitBreaker.execute.mockRejectedValueOnce(browserError);

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return null on Redis errors instead of failing', async () => {
      mockRedisCircuitBreaker.execute.mockRejectedValueOnce(
        new Error('Redis connection failed')
      );

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(log.error).toHaveBeenCalledWith(
        'Redis GET operation failed',
        expect.any(Error),
        { metadata: { key: 'test-key', circuitState: 'CLOSED' } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockRedisCircuitBreaker.execute.mockRejectedValueOnce('String error');

      const result = await redisService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getWithSchema', () => {
    const mockSchema = {
      parse: jest.fn(),
    };

    beforeEach(() => {
      mockSchema.parse.mockClear();
    });

    it('should get and validate value successfully', async () => {
      const rawData = '{"name":"test","count":42}';
      const parsedData = { name: 'test', count: 42 };

      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: rawData,
      });

      mockSchema.parse.mockReturnValueOnce(parsedData);

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(parsedData);
      expect(mockSchema.parse).toHaveBeenCalledWith(parsedData);
    });

    it('should handle non-string data', async () => {
      const objectData = { name: 'test', count: 42 };

      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: objectData,
      });

      mockSchema.parse.mockReturnValueOnce(objectData);

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(objectData);
      expect(mockSchema.parse).toHaveBeenCalledWith(objectData);
    });

    it('should return null when no data found', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockSchema.parse).not.toHaveBeenCalled();
    });

    it('should handle get operation failure', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: false,
        error: 'Get failed',
      });

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Get failed');
    });

    it('should handle JSON parse error', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: 'invalid-json{',
      });

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Retrieved data does not match expected schema'
      );
      expect(log.error).toHaveBeenCalledWith(
        'Redis data validation failed',
        expect.any(Error),
        { metadata: { key: 'test-key' } }
      );
    });

    it('should handle schema validation error', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: '{"invalid":"data"}',
      });

      mockSchema.parse.mockImplementationOnce(() => {
        throw new Error('Schema validation failed');
      });

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Retrieved data does not match expected schema'
      );
    });

    it('should handle non-Error objects in validation', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: '{"test":"data"}',
      });

      mockSchema.parse.mockImplementationOnce(() => {
        throw 'String error';
      });

      const result = await redisService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Retrieved data does not match expected schema'
      );
      expect(log.error).toHaveBeenCalledWith(
        'Redis data validation failed',
        expect.any(Error),
        { metadata: { key: 'test-key' } }
      );
    });
  });

  describe('delete', () => {
    it('should delete key successfully', async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);

      const result = await redisService.delete('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      expect(log.debug).toHaveBeenCalledWith(
        'Redis DELETE operation successful',
        { metadata: { key: 'test-key', deleted: 1 } }
      );
    });

    it('should return 0 when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await redisService.delete('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith(
        'Redis not configured - skipping DELETE operation',
        { metadata: { key: 'test-key' } }
      );
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await redisService.delete('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete data from Redis');
      expect(log.error).toHaveBeenCalledWith(
        'Redis DELETE operation failed',
        expect.any(Error),
        { metadata: { key: 'test-key' } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockRedisClient.del.mockRejectedValueOnce('String error');

      const result = await redisService.delete('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete data from Redis');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValueOnce(1);

      const result = await redisService.exists('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
      expect(log.debug).toHaveBeenCalledWith(
        'Redis EXISTS operation successful',
        { metadata: { key: 'test-key', exists: 1 } }
      );
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValueOnce(0);

      const result = await redisService.exists('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should return false when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await redisService.exists('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(mockRedisClient.exists).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.exists.mockRejectedValueOnce(
        new Error('Exists check failed')
      );

      const result = await redisService.exists('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check key existence in Redis');
    });

    it('should handle non-Error objects', async () => {
      mockRedisClient.exists.mockRejectedValueOnce('String error');

      const result = await redisService.exists('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check key existence in Redis');
    });
  });

  describe('increment', () => {
    it('should increment counter successfully', async () => {
      mockRedisClient.incrby.mockResolvedValueOnce(5);

      const result = await redisService.increment('test-key', 2);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('test-key', 2);
      expect(log.debug).toHaveBeenCalledWith(
        'Redis INCREMENT operation successful',
        { metadata: { key: 'test-key', by: 2, newValue: 5 } }
      );
    });

    it('should increment by 1 by default', async () => {
      mockRedisClient.incrby.mockResolvedValueOnce(1);

      const result = await redisService.increment('test-key');

      expect(result.success).toBe(true);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('test-key', 1);
    });

    it('should return 0 when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await redisService.increment('test-key', 3);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
      expect(mockRedisClient.incrby).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.incrby.mockRejectedValueOnce(
        new Error('Increment failed')
      );

      const result = await redisService.increment('test-key', 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to increment counter in Redis');
    });

    it('should handle non-Error objects', async () => {
      mockRedisClient.incrby.mockRejectedValueOnce('String error');

      const result = await redisService.increment('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to increment counter in Redis');
    });
  });

  describe('expire', () => {
    it('should set expiration successfully', async () => {
      mockRedisClient.expire.mockResolvedValueOnce(1);

      const result = await redisService.expire('test-key', 300);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 300);
      expect(log.debug).toHaveBeenCalledWith(
        'Redis EXPIRE operation successful',
        { metadata: { key: 'test-key', ttlSeconds: 300, result: 1 } }
      );
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.expire.mockResolvedValueOnce(0);

      const result = await redisService.expire('test-key', 300);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should return false when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await redisService.expire('test-key', 300);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.expire.mockRejectedValueOnce(new Error('Expire failed'));

      const result = await redisService.expire('test-key', 300);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to set expiration in Redis');
    });

    it('should handle non-Error objects', async () => {
      mockRedisClient.expire.mockRejectedValueOnce('String error');

      const result = await redisService.expire('test-key', 300);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to set expiration in Redis');
    });
  });
});

describe('cacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    delete (global as any).window;
  });

  describe('set', () => {
    it('should delegate to redisService.set with default TTL', async () => {
      jest.spyOn(redisService, 'set').mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      const result = await cacheService.set('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        300
      );
    });

    it('should use custom TTL', async () => {
      jest.spyOn(redisService, 'set').mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      await cacheService.set('test-key', 'test-value', 600);

      expect(redisService.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        600
      );
    });
  });

  describe('get', () => {
    it('should delegate to redisService.get', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: 'test-value',
      });

      const result = await cacheService.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-value');
      expect(redisService.get).toHaveBeenCalledWith('test-key');
    });

    it('should handle get failure', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: false,
        error: 'Get failed',
      });

      const result = await cacheService.get('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Get failed');
    });
  });

  describe('getWithSchema', () => {
    it('should delegate to redisService.getWithSchema', async () => {
      const mockSchema = { parse: jest.fn() };
      const testData = { test: 'data' };

      jest.spyOn(redisService, 'getWithSchema').mockResolvedValueOnce({
        success: true,
        data: testData,
      });

      const result = await cacheService.getWithSchema('test-key', mockSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(redisService.getWithSchema).toHaveBeenCalledWith(
        'test-key',
        mockSchema
      );
    });
  });

  describe('getOrSet', () => {
    const mockFetcher = jest.fn();
    const mockSchema = { parse: jest.fn() };

    beforeEach(() => {
      mockFetcher.mockClear();
      mockSchema.parse.mockClear();
    });

    it('should always fetch fresh data when no schema provided', async () => {
      const cachedData = 'cached-value';
      const freshData = 'fresh-value';

      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: cachedData,
      });
      jest.spyOn(redisService, 'set').mockResolvedValueOnce({
        success: true,
        data: undefined,
      });
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(mockFetcher).toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith(
        'Cache hit without schema - returning cached data',
        { metadata: { key: 'test-key' } }
      );
      expect(log.debug).toHaveBeenCalledWith(
        'No schema provided - fetching fresh data for type safety'
      );
    });

    it('should fetch and cache data on cache miss', async () => {
      const freshData = 'fresh-value';
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: null,
      });
      jest.spyOn(redisService, 'set').mockResolvedValueOnce({
        success: true,
        data: undefined,
      });
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher, 600);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(mockFetcher).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith('test-key', freshData, 600);
      expect(log.debug).toHaveBeenCalledWith(
        'Cache MISS - fetching fresh data',
        { metadata: { key: 'test-key' } }
      );
    });

    it('should validate cached data with schema', async () => {
      const cachedData = { test: 'data' };
      const validatedData = { test: 'validated' };

      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: cachedData,
      });
      mockSchema.parse.mockReturnValueOnce(validatedData);

      const result = await cacheService.getOrSet(
        'test-key',
        mockFetcher,
        300,
        mockSchema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validatedData);
      expect(mockSchema.parse).toHaveBeenCalledWith(cachedData);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cached data fails validation', async () => {
      const cachedData = { test: 'invalid' };
      const freshData = { test: 'fresh' };

      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: cachedData,
      });
      jest.spyOn(redisService, 'set').mockResolvedValueOnce({
        success: true,
        data: undefined,
      });
      mockSchema.parse.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet(
        'test-key',
        mockFetcher,
        300,
        mockSchema
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(log.warn).toHaveBeenCalledWith(
        'Cached data failed validation, fetching fresh',
        { metadata: { key: 'test-key', error: expect.any(Error) } }
      );
    });

    it('should fetch directly on client-side', async () => {
      // Simulate client-side environment
      (global as any).window = {};

      const freshData = 'client-side-data';
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(mockFetcher).toHaveBeenCalled();
    });

    it('should handle client-side fetch error', async () => {
      // Simulate client-side environment
      (global as any).window = {};

      mockFetcher.mockRejectedValueOnce(new Error('Fetch failed'));

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch data');
    });

    it('should fetch directly when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);
      const freshData = 'no-redis-data';
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(log.debug).toHaveBeenCalledWith(
        'Redis not configured - fetching directly',
        { metadata: { key: 'test-key' } }
      );
    });

    it('should handle Redis configuration error', async () => {
      jest
        .spyOn(redisService, 'get')
        .mockRejectedValueOnce(new Error('Redis configuration'));
      const freshData = 'fallback-data';
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(log.warn).toHaveBeenCalledWith(
        'Redis configuration failed, falling back to direct fetch',
        { metadata: { key: 'test-key', error: 'Redis configuration' } }
      );
    });

    it('should handle non-Redis configuration errors', async () => {
      jest
        .spyOn(redisService, 'get')
        .mockRejectedValueOnce(new Error('Other error'));

      await expect(
        cacheService.getOrSet('test-key', mockFetcher)
      ).rejects.toThrow('Other error');
    });

    it('should handle cache set failure gracefully', async () => {
      const freshData = 'fresh-value';
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: null,
      });
      jest.spyOn(redisService, 'set').mockResolvedValueOnce({
        success: false,
        error: 'Set failed',
      });
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(log.warn).toHaveBeenCalledWith('Failed to cache fresh data', {
        metadata: { key: 'test-key', error: 'Set failed' },
      });
    });

    it('should handle cache set error gracefully', async () => {
      const freshData = 'fresh-value';
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: null,
      });
      jest
        .spyOn(redisService, 'set')
        .mockRejectedValueOnce(new Error('Redis error'));
      mockFetcher.mockResolvedValueOnce(freshData);

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(true);
      expect(result.data).toBe(freshData);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to cache data due to Redis configuration issue',
        { metadata: { key: 'test-key', error: 'Redis error' } }
      );
    });

    it('should handle fetcher error', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: null,
      });
      mockFetcher.mockRejectedValueOnce(new Error('Fetch failed'));

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch and cache data');
      expect(log.debug).toHaveBeenCalledWith('Cache fetch failed', {
        metadata: { key: 'test-key', error: 'Fetch failed' },
      });
    });

    it('should handle non-Error objects in fetcher', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce({
        success: true,
        data: null,
      });
      mockFetcher.mockRejectedValueOnce('String error');

      const result = await cacheService.getOrSet('test-key', mockFetcher);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch and cache data');
    });
  });

  describe('invalidate', () => {
    it('should invalidate cache successfully', async () => {
      jest.spyOn(redisService, 'delete').mockResolvedValueOnce({
        success: true,
        data: 1,
      });

      const result = await cacheService.invalidate('test-key');

      expect(result.success).toBe(true);
      expect(redisService.delete).toHaveBeenCalledWith('test-key');
      expect(log.info).toHaveBeenCalledWith('Cache invalidated', {
        metadata: { key: 'test-key' },
      });
    });

    it('should handle invalidation failure', async () => {
      jest.spyOn(redisService, 'delete').mockResolvedValueOnce({
        success: false,
        error: 'Delete failed',
      });

      const result = await cacheService.invalidate('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate pattern successfully', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['test-key-1', 'test-key-2']);
      mockRedisClient.del.mockResolvedValueOnce(2);

      const result = await cacheService.invalidatePattern('test-key-*');

      expect(result.success).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test-key-*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'test-key-1',
        'test-key-2'
      );
      expect(log.info).toHaveBeenCalledWith('Cache pattern invalidated', {
        metadata: { pattern: 'test-key-*', keysDeleted: 2 },
      });
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.keys.mockResolvedValueOnce([]);

      const result = await cacheService.invalidatePattern('test-key-*');

      expect(result.success).toBe(true);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith('No keys found for pattern', {
        metadata: { pattern: 'test-key-*' },
      });
    });

    it('should skip when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValueOnce(false);

      const result = await cacheService.invalidatePattern('test-key-*');

      expect(result.success).toBe(true);
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
      expect(log.debug).toHaveBeenCalledWith(
        'Redis not configured - skipping pattern invalidation',
        { metadata: { pattern: 'test-key-*' } }
      );
    });

    it('should handle pattern invalidation error', async () => {
      mockRedisClient.keys.mockRejectedValueOnce(new Error('Keys failed'));

      const result = await cacheService.invalidatePattern('test-key-*');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to invalidate cache pattern');
      expect(log.error).toHaveBeenCalledWith(
        'Cache pattern invalidation failed',
        expect.any(Error),
        { metadata: { pattern: 'test-key-*' } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockRedisClient.keys.mockRejectedValueOnce('String error');

      const result = await cacheService.invalidatePattern('test-key-*');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to invalidate cache pattern');
    });
  });

  describe('createKey', () => {
    it('should create cache key using redis utility', () => {
      mockCreateRedisKey.mockReturnValueOnce('cache:category:part1:part2');

      const result = cacheService.createKey('category', 'part1', 'part2');

      expect(result).toBe('cache:category:part1:part2');
      expect(mockCreateRedisKey).toHaveBeenCalledWith(
        REDIS_PREFIXES.CACHE,
        'category',
        'part1',
        'part2'
      );
    });
  });
});
