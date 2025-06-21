/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { testRedisConnection } from '@/lib/redis';
import { rateLimitingService, withRateLimit } from '@/services/rate-limiting.service';
import { redisService, cacheService } from '@/services/redis.service';
import { log } from '@/lib/logger';

// Mock external dependencies
jest.mock('@/lib/redis', () => ({
  testRedisConnection: jest.fn(),
}));

jest.mock('@/services/rate-limiting.service', () => ({
  rateLimitingService: {
    getIdentifier: jest.fn(),
    checkApiLimit: jest.fn(),
  },
  withRateLimit: jest.fn(),
}));

jest.mock('@/services/redis.service', () => ({
  redisService: {
    set: jest.fn(),
    getWithSchema: jest.fn(),
    exists: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
    expire: jest.fn(),
  },
  cacheService: {
    createKey: jest.fn(),
    getOrSet: jest.fn(),
    invalidate: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockTestRedisConnection = testRedisConnection as jest.MockedFunction<typeof testRedisConnection>;
const mockRateLimitingService = rateLimitingService as jest.Mocked<typeof rateLimitingService>;
const mockWithRateLimit = withRateLimit as jest.MockedFunction<typeof withRateLimit>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockLog = log as jest.Mocked<typeof log>;

describe('GET /api/redis-test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (): NextRequest => {
    return new NextRequest('https://localhost:3000/api/redis-test', {
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  describe('Successful Redis Tests', () => {
    it('should return successful test results when all Redis operations work', async () => {
      // Mock rate limiting to pass through
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return {
          success: true,
          data: result,
          error: null,
        };
      });

      // Mock Redis connection test
      mockTestRedisConnection.mockResolvedValue({
        success: true,
        data: 'Redis connection successful',
      });

      // Mock basic Redis operations
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({
        success: true,
        data: { message: 'Hello Redis!', timestamp: Date.now() },
        error: null,
      });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });

      // Mock caching service
      const cacheKey = 'test:demo:key';
      mockCacheService.createKey.mockReturnValue(cacheKey);
      mockCacheService.getOrSet.mockResolvedValue({
        success: true,
        data: { cached: true, fetchedAt: Date.now() },
        error: null,
      });

      // Mock rate limiting status
      mockRateLimitingService.getIdentifier.mockReturnValue('test-identifier');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({
        success: true,
        data: { allowed: true, limit: 100, remaining: 95, resetTime: Date.now() + 60000 },
        error: null,
      });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Redis is working correctly!',
        tests: {
          connection: {
            success: true,
            message: 'Redis connection successful',
          },
          basicOperations: {
            success: true,
            data: {
              set: true,
              get: true,
              exists: true,
              delete: true,
            },
          },
          caching: {
            success: true,
            data: { cached: true, fetchedAt: expect.any(Number) },
          },
          rateLimit: {
            success: true,
            data: { remaining: 95, resetTime: expect.any(Number) },
          },
        },
      });
      expect(data.tests.timestamp).toBeDefined();
    });

    it('should call Redis operations with correct parameters', async () => {
      const testData = { message: 'Hello Redis!', timestamp: expect.any(Number) };
      
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({ success: true, data: 'Connected' });
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({ success: true, data: testData, error: null });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });
      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: true, data: {}, error: null });
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: true, data: { allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }, error: null });

      const request = createRequest();
      await GET(request);

      // Verify Redis operations were called with correct parameters
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^test:\d+$/),
        expect.objectContaining({
          message: 'Hello Redis!',
          timestamp: expect.any(Number),
        }),
        30
      );

      expect(mockRedisService.getWithSchema).toHaveBeenCalledWith(
        expect.stringMatching(/^test:\d+$/),
        expect.any(Object) // Zod schema
      );

      expect(mockCacheService.createKey).toHaveBeenCalledWith('test', 'demo');
      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'test:demo:key',
        expect.any(Function),
        60
      );
    });

    it('should log test progress and results', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({ success: true, data: 'Connected' });
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({ 
        success: true, 
        data: { message: 'Hello Redis!', timestamp: Date.now() },
        error: null 
      });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });
      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: true, data: {}, error: null });
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: true, data: { allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }, error: null });

      const request = createRequest();
      await GET(request);

      expect(mockLog.info).toHaveBeenCalledWith('Testing Redis connection');
      expect(mockLog.info).toHaveBeenCalledWith('Testing basic Redis operations');
      expect(mockLog.info).toHaveBeenCalledWith('Testing caching service');
      expect(mockLog.info).toHaveBeenCalledWith('Testing rate limiting status');
      expect(mockLog.info).toHaveBeenCalledWith(
        'Redis tests completed successfully',
        expect.objectContaining({
          metadata: expect.objectContaining({
            testResults: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('Redis Test Failures', () => {
    it('should handle Redis connection failure', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({
        success: false,
        error: { code: 'CONNECTION_FAILED', message: 'Connection failed' },
      });

      // Mock other operations as successful
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({ success: true, data: {}, error: null });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });
      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: true, data: {}, error: null });
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: true, data: { allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }, error: null });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(data.tests.connection.success).toBe(false);
      expect(data.tests.connection.error).toBe('Connection failed');
    });

    it('should handle basic operations failure', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({ success: true, data: 'Connected' });
      
      // Mock basic operations to fail
      mockRedisService.set.mockResolvedValue({ success: false, data: null, error: 'Mock error' });
      mockRedisService.getWithSchema.mockResolvedValue({ success: false, data: null, error: 'Mock error' });
      mockRedisService.exists.mockResolvedValue({ success: false, data: null, error: 'Mock error' });
      mockRedisService.delete.mockResolvedValue({ success: false, data: null, error: 'Mock error' });

      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: true, data: {}, error: null });
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: true, data: { allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }, error: null });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(data.tests.basicOperations.success).toBe(false);
    });

    it('should handle caching service failure', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({ success: true, data: 'Connected' });
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({ success: true, data: {}, error: null });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });
      
      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: false, data: null, error: 'Cache error' });
      
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: true, data: { allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }, error: null });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(data.tests.caching.success).toBe(false);
    });

    it('should handle rate limiting check failure', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({ success: true, data: 'Connected' });
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({ success: true, data: {}, error: null });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });
      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: true, data: {}, error: null });
      
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: false, data: null, error: 'Rate limit error' });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(data.tests.rateLimit.success).toBe(false);
    });

    it('should handle unexpected exceptions during tests', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockRejectedValue(new Error('Unexpected error'));

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Redis test failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Redis test failed',
        expect.any(Error)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      mockWithRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'RATE_LIMIT_EXCEEDED',
      });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(429);
      expect(data).toEqual({
        success: false,
        error: 'Rate limit exceeded',
      });
    });

    it('should handle other rate limiting errors', async () => {
      mockWithRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'Some other error',
      });

      const request = createRequest();
      const response = await GET(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Some other error',
      });
    });

    it('should use API rate limiting', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler, type) => {
        expect(type).toBe('api');
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockTestRedisConnection.mockResolvedValue({ success: true, data: 'Connected' });
      mockRedisService.set.mockResolvedValue({ success: true, data: null, error: null });
      mockRedisService.getWithSchema.mockResolvedValue({ success: true, data: {}, error: null });
      mockRedisService.exists.mockResolvedValue({ success: true, data: true, error: null });
      mockRedisService.delete.mockResolvedValue({ success: true, data: 1, error: null });
      mockCacheService.createKey.mockReturnValue('test:demo:key');
      mockCacheService.getOrSet.mockResolvedValue({ success: true, data: {}, error: null });
      mockRateLimitingService.getIdentifier.mockReturnValue('test-id');
      mockRateLimitingService.checkApiLimit.mockResolvedValue({ success: true, data: { allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }, error: null });

      const request = createRequest();
      await GET(request);

      expect(mockWithRateLimit).toHaveBeenCalledWith(
        request,
        expect.any(Function),
        'api'
      );
    });
  });
});

describe('POST /api/redis-test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (): NextRequest => {
    return new NextRequest('https://localhost:3000/api/redis-test', {
      method: 'POST',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  describe('Successful Counter Operations', () => {
    it('should increment counter and return success', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockRedisService.increment.mockResolvedValue({ success: true, data: 5, error: null });

      const request = createRequest();
      const response = await POST(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Counter incremented',
        counter: 5,
      });

      expect(mockRedisService.increment).toHaveBeenCalledWith('test:counter');
      expect(mockLog.info).toHaveBeenCalledWith(
        'Counter incremented',
        expect.objectContaining({
          metadata: {
            counter: 5,
            success: true,
          },
        })
      );
    });

    it('should set expiration for first increment', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      // Mock first increment (counter = 1)
      mockRedisService.increment.mockResolvedValue({ success: true, data: 1, error: null });
      mockRedisService.expire.mockResolvedValue({ success: true, data: true, error: null });

      const request = createRequest();
      const response = await POST(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(200);
      expect(data.counter).toBe(1);
      expect(mockRedisService.expire).toHaveBeenCalledWith('test:counter', 300);
    });

    it('should not set expiration for subsequent increments', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      // Mock subsequent increment (counter > 1)
      mockRedisService.increment.mockResolvedValue({ success: true, data: 5, error: null });

      const request = createRequest();
      await POST(request);

      expect(mockRedisService.expire).not.toHaveBeenCalled();
    });
  });

  describe('Counter Operation Failures', () => {
    it('should handle increment operation failure', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockRedisService.increment.mockResolvedValue({ success: false, data: null, error: 'Increment error' });

      const request = createRequest();
      const response = await POST(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.counter).toBeNull(); // Since increment failed
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      mockWithRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'RATE_LIMIT_EXCEEDED',
      });

      const request = createRequest();
      const response = await POST(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(429);
      expect(data).toEqual({
        success: false,
        error: 'Rate limit exceeded',
      });
    });

    it('should use auth rate limiting', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler, type) => {
        expect(type).toBe('auth');
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockRedisService.increment.mockResolvedValue({ success: true, data: 1, error: null });
      mockRedisService.expire.mockResolvedValue({ success: true, data: true, error: null });

      const request = createRequest();
      await POST(request);

      expect(mockWithRateLimit).toHaveBeenCalledWith(
        request,
        expect.any(Function),
        'auth'
      );
    });

    it('should handle non-rate-limit errors', async () => {
      mockWithRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'Some other error',
      });

      const request = createRequest();
      const response = await POST(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(response!.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Some other error',
      });
    });
  });

  describe('Error Handling', () => {
    it('should log counter operations', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockRedisService.increment.mockResolvedValue({ success: true, data: 3, error: null });

      const request = createRequest();
      await POST(request);

      expect(mockLog.info).toHaveBeenCalledWith(
        'Counter incremented',
        expect.objectContaining({
          metadata: {
            counter: 3,
            success: true,
          },
        })
      );
    });
  });

  describe('Response Format', () => {
    it('should return JSON response with correct content type', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockRedisService.increment.mockResolvedValue({ success: true, data: 1, error: null });
      mockRedisService.expire.mockResolvedValue({ success: true, data: true, error: null });

      const request = createRequest();
      const response = await POST(request);

      expect(response!.headers.get('content-type')).toContain('application/json');
    });

    it('should return consistent response structure', async () => {
      mockWithRateLimit.mockImplementation(async (request, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      mockRedisService.increment.mockResolvedValue({ success: true, data: 2, error: null });

      const request = createRequest();
      const response = await POST(request);
      expect(response).toBeDefined();
      const data = await response!.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('counter');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.message).toBe('string');
      expect(typeof data.counter).toBe('number');
    });
  });
});