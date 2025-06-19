import { rateLimitingService, withRateLimit } from '../rate-limiting.service';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@upstash/ratelimit');
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockGetRedisClient = getRedisClient as jest.MockedFunction<
  typeof getRedisClient
>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
  typeof isRedisConfigured
>;
const mockLog = log as jest.Mocked<typeof log>;
const MockRatelimit = Ratelimit as jest.MockedClass<typeof Ratelimit>;

describe('RateLimitingService', () => {
  const mockRedisClient = { ping: jest.fn() };
  const mockLimitResult = {
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
    reason: undefined,
  };

  // Helper to reset rate limiter instances
  function resetRateLimiterInstances() {
    (rateLimitingService as any).apiRateLimiter = null;
    (rateLimitingService as any).authRateLimiter = null;
    (rateLimitingService as any).uploadRateLimiter = null;
    (rateLimitingService as any).gameSessionRateLimiter = null;
    (rateLimitingService as any).gameActionRateLimiter = null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedisClient as any);

    // Reset rate limiter instances
    resetRateLimiterInstances();
  });

  describe('checkApiLimit', () => {
    it('checks rate limit when Redis is configured', async () => {
      const mockLimit = jest.fn().mockResolvedValue(mockLimitResult);
      MockRatelimit.prototype.limit = mockLimit;

      const result = await rateLimitingService.checkApiLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetTime: mockLimitResult.reset,
        reason: undefined,
      });
      expect(mockLimit).toHaveBeenCalledWith('user:123');
      expect(MockRatelimit).toHaveBeenCalledWith({
        redis: mockRedisClient,
        limiter: expect.any(Object),
        prefix: '@arcadia/rate-limit:api',
        analytics: false,
      });
    });

    it('fails open when Redis is not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await rateLimitingService.checkApiLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.limit).toBe(100);
      expect(result.data?.remaining).toBe(100);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'API rate limit check skipped - Redis not configured',
        expect.any(Object)
      );
    });

    it('fails open when rate limiter throws error', async () => {
      const mockLimit = jest.fn().mockRejectedValue(new Error('Redis error'));
      MockRatelimit.prototype.limit = mockLimit;

      const result = await rateLimitingService.checkApiLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'API rate limit check failed',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('logs debug info for successful rate limit check', async () => {
      const mockLimit = jest.fn().mockResolvedValue(mockLimitResult);
      MockRatelimit.prototype.limit = mockLimit;

      await rateLimitingService.checkApiLimit('user:123');

      expect(mockLog.debug).toHaveBeenCalledWith('API rate limit check', {
        metadata: {
          identifier: 'user:123',
          allowed: true,
          remaining: 99,
        },
      });
    });
  });

  describe('checkAuthLimit', () => {
    it('uses fixed window rate limiter for auth', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        limit: 5,
        remaining: 4,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await rateLimitingService.checkAuthLimit('ip:192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(5);
      expect(MockRatelimit).toHaveBeenCalledWith({
        redis: mockRedisClient,
        limiter: expect.any(Object),
        prefix: '@arcadia/rate-limit:auth',
        analytics: false,
      });
    });

    it('handles rate limiter initialization failure', async () => {
      resetRateLimiterInstances();
      MockRatelimit.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const result = await rateLimitingService.checkAuthLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to initialize auth rate limiter',
        expect.any(Error)
      );
    });

    it('fails open when Redis is not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await rateLimitingService.checkAuthLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.limit).toBe(5);
      expect(result.data?.remaining).toBe(5);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Auth rate limit check skipped - Redis not configured',
        expect.objectContaining({
          metadata: { identifier: 'user:123' },
        })
      );
    });

    it('fails open when rate limiter throws error', async () => {
      const mockLimit = jest
        .fn()
        .mockRejectedValue(new Error('Auth Redis error'));
      MockRatelimit.prototype.limit = mockLimit;

      const result = await rateLimitingService.checkAuthLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Auth rate limit check failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: { identifier: 'user:123' },
        })
      );
    });
  });

  describe('checkUploadLimit', () => {
    it('uses token bucket rate limiter for uploads', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 30000,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await rateLimitingService.checkUploadLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(10);
      expect(MockRatelimit).toHaveBeenCalledWith({
        redis: mockRedisClient,
        limiter: expect.any(Object),
        prefix: '@arcadia/rate-limit:upload',
        analytics: false,
      });
    });

    it('handles rate limiter initialization failure', async () => {
      resetRateLimiterInstances();
      MockRatelimit.mockImplementation(() => {
        throw new Error('Upload initialization failed');
      });

      const result = await rateLimitingService.checkUploadLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to initialize upload rate limiter',
        expect.any(Error)
      );
    });
  });

  describe('checkGameSessionLimit', () => {
    it('checks game session creation rate limit', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        limit: 10,
        remaining: 9,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result =
        await rateLimitingService.checkGameSessionLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(10);
      expect(MockRatelimit).toHaveBeenCalledWith({
        redis: mockRedisClient,
        limiter: expect.any(Object),
        prefix: '@arcadia/rate-limit:game-session',
        analytics: false,
      });
    });

    it('handles rate limiter initialization failure', async () => {
      resetRateLimiterInstances();
      MockRatelimit.mockImplementation(() => {
        throw new Error('Game session initialization failed');
      });

      const result =
        await rateLimitingService.checkGameSessionLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to initialize game session rate limiter',
        expect.any(Error)
      );
    });
  });

  describe('checkGameActionLimit', () => {
    it('checks game action rate limit', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        limit: 30,
        remaining: 29,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await rateLimitingService.checkGameActionLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(30);
      expect(MockRatelimit).toHaveBeenCalledWith({
        redis: mockRedisClient,
        limiter: expect.any(Object),
        prefix: '@arcadia/rate-limit:game-action',
        analytics: false,
      });
    });

    it('handles rate limiter initialization failure', async () => {
      resetRateLimiterInstances();
      MockRatelimit.mockImplementation(() => {
        throw new Error('Game action initialization failed');
      });

      const result = await rateLimitingService.checkGameActionLimit('user:123');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to initialize game action rate limiter',
        expect.any(Error)
      );
    });
  });

  describe('getIdentifier', () => {
    it('returns user identifier when userId provided', () => {
      const request = new Request('http://localhost');
      const identifier = rateLimitingService.getIdentifier(request, 'user-123');

      expect(identifier).toBe('user:user-123');
    });

    it('extracts IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('uses x-real-ip header as fallback', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.2');
    });

    it('uses cf-connecting-ip header as fallback', () => {
      const request = new Request('http://localhost', {
        headers: {
          'cf-connecting-ip': '192.168.1.3',
        },
      });
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.3');
    });

    it('returns unknown when no IP headers present', () => {
      const request = new Request('http://localhost');
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:unknown');
    });

    it('handles x-forwarded-for with whitespace correctly', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '  192.168.1.100  , 10.0.0.1',
        },
      });
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.100');
    });

    it('prioritizes headers in correct order', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
          'cf-connecting-ip': '192.168.1.3',
        },
      });
      const identifier = rateLimitingService.getIdentifier(request);

      // Should use x-forwarded-for first
      expect(identifier).toBe('ip:192.168.1.1');
    });
  });

  describe('withRateLimit', () => {
    const mockHandler = jest.fn().mockResolvedValue({ data: 'success' });
    const mockRequest = new Request('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.1' },
    });

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('executes handler when rate limit allows', async () => {
      const mockLimit = jest.fn().mockResolvedValue(mockLimitResult);
      MockRatelimit.prototype.limit = mockLimit;

      const result = await withRateLimit(
        mockRequest,
        mockHandler,
        'api',
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'success' });
      expect(mockHandler).toHaveBeenCalled();
    });

    it('blocks execution when rate limit exceeded', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        success: false,
        remaining: 0,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await withRateLimit(mockRequest, mockHandler, 'api');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Rate limit exceeded/);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.any(Object)
      );
    });

    it('handles different limit types', async () => {
      const mockLimit = jest.fn().mockResolvedValue(mockLimitResult);
      MockRatelimit.prototype.limit = mockLimit;

      await withRateLimit(mockRequest, mockHandler, 'auth');
      await withRateLimit(mockRequest, mockHandler, 'upload');
      await withRateLimit(mockRequest, mockHandler, 'gameSession');
      await withRateLimit(mockRequest, mockHandler, 'gameAction');

      expect(mockHandler).toHaveBeenCalledTimes(4);
    });

    it('handles handler errors', async () => {
      const mockLimit = jest.fn().mockResolvedValue(mockLimitResult);
      MockRatelimit.prototype.limit = mockLimit;
      const errorHandler = jest
        .fn()
        .mockRejectedValue(new Error('Handler error'));

      const result = await withRateLimit(mockRequest, errorHandler, 'api');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request processing failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Handler execution failed',
        expect.any(Error)
      );
    });

    it('handles rate limit check failures', async () => {
      mockIsRedisConfigured.mockReturnValue(false);
      const mockLimit = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await withRateLimit(mockRequest, mockHandler, 'api');

      // Even when Redis is not configured, it should fail open and allow the request
      expect(result.success).toBe(true);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('handles rate limit check returning error response', async () => {
      // Mock a rate limit check that returns an error response (lines 566-572)
      jest.spyOn(rateLimitingService, 'checkApiLimit').mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Rate limit service unavailable',
      });

      const result = await withRateLimit(mockRequest, mockHandler, 'api');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit service unavailable');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('handles rate limit check returning null data', async () => {
      // Mock a rate limit check that returns null data (lines 574-580)
      jest.spyOn(rateLimitingService, 'checkApiLimit').mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await withRateLimit(mockRequest, mockHandler, 'api');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit check returned null data');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('handles rate limit exceeded with custom reset time calculation', async () => {
      const resetTime = Date.now() + 90000; // 90 seconds from now
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        success: false,
        remaining: 0,
        reset: resetTime,
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await withRateLimit(mockRequest, mockHandler, 'api');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Try again in 90 seconds');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('defaults to 60 seconds when resetTime is undefined', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        ...mockLimitResult,
        success: false,
        remaining: 0,
        reset: undefined, // No reset time provided
      });
      MockRatelimit.prototype.limit = mockLimit;

      const result = await withRateLimit(mockRequest, mockHandler, 'api');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Try again in 60 seconds');
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('comprehensive coverage tests', () => {
    it('covers all rate limiter initialization error paths', async () => {
      // Reset all instances
      (rateLimitingService as any).apiRateLimiter = null;
      (rateLimitingService as any).authRateLimiter = null;
      (rateLimitingService as any).uploadRateLimiter = null;
      (rateLimitingService as any).gameSessionRateLimiter = null;
      (rateLimitingService as any).gameActionRateLimiter = null;

      // Test API rate limiter creation with error (lines 52-57)
      MockRatelimit.mockImplementationOnce(() => {
        throw new Error('API limiter init failed');
      });

      const apiResult = await rateLimitingService.checkApiLimit('test:123');
      expect(apiResult.success).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to initialize API rate limiter',
        expect.any(Error)
      );
    });

    it('covers all rate limit check fail-open scenarios', async () => {
      // Test when Redis is not configured for each service
      mockIsRedisConfigured.mockReturnValue(false);

      const authResult = await rateLimitingService.checkAuthLimit('test:auth');
      expect(authResult.success).toBe(true);
      expect(authResult.data?.allowed).toBe(true);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Auth rate limit check skipped - Redis not configured',
        expect.objectContaining({ metadata: { identifier: 'test:auth' } })
      );

      const uploadResult =
        await rateLimitingService.checkUploadLimit('test:upload');
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.allowed).toBe(true);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Upload rate limit check skipped - Redis not configured',
        expect.objectContaining({ metadata: { identifier: 'test:upload' } })
      );

      const gameSessionResult =
        await rateLimitingService.checkGameSessionLimit('test:session');
      expect(gameSessionResult.success).toBe(true);
      expect(gameSessionResult.data?.allowed).toBe(true);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Game session rate limit check skipped - Redis not configured',
        expect.objectContaining({ metadata: { identifier: 'test:session' } })
      );

      const gameActionResult =
        await rateLimitingService.checkGameActionLimit('test:action');
      expect(gameActionResult.success).toBe(true);
      expect(gameActionResult.data?.allowed).toBe(true);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Game action rate limit check skipped - Redis not configured',
        expect.objectContaining({ metadata: { identifier: 'test:action' } })
      );
    });

    it('covers error handling in rate limit checks', async () => {
      mockIsRedisConfigured.mockReturnValue(true);

      // Test auth limit error
      const mockAuthLimit = jest
        .fn()
        .mockRejectedValue(new Error('Auth Redis error'));
      MockRatelimit.prototype.limit = mockAuthLimit;

      const authResult = await rateLimitingService.checkAuthLimit('test:auth');
      expect(authResult.success).toBe(true);
      expect(authResult.data?.allowed).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Auth rate limit check failed',
        expect.any(Error),
        expect.objectContaining({ metadata: { identifier: 'test:auth' } })
      );
    });
  });
});
