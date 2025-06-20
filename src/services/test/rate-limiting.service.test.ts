/**
 * Tests for rate-limiting.service.ts
 * Following context7 pattern: one clear behavior per test
 * Mocking at SDK edge only (Upstash Redis/Ratelimit methods)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';

// Mock dependencies at module level
jest.mock('@upstash/ratelimit');
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockGetRedisClient = getRedisClient as jest.MockedFunction<
  typeof getRedisClient
>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
  typeof isRedisConfigured
>;
const MockRatelimit = Ratelimit as jest.MockedClass<typeof Ratelimit>;

describe('RateLimitingService', () => {
  const mockRedisClient = { ping: jest.fn() };
  const mockLimitInstance = {
    limit: jest.fn(),
  };

  // Mock static methods on Ratelimit
  beforeAll(() => {
    MockRatelimit.slidingWindow = jest
      .fn()
      .mockReturnValue('sliding-window-limiter');
    MockRatelimit.fixedWindow = jest
      .fn()
      .mockReturnValue('fixed-window-limiter');
    MockRatelimit.tokenBucket = jest
      .fn()
      .mockReturnValue('token-bucket-limiter');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      jest.resetModules();
    });

    // Default mock setup
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedisClient as any);

    // Reset mock limit instance
    mockLimitInstance.limit.mockClear();

    // Mock Ratelimit constructor to return our mock instance
    MockRatelimit.mockImplementation(() => mockLimitInstance as any);
  });

  describe('checkApiLimit', () => {
    it('checks rate limit when Redis is configured', async () => {
      await jest.isolateModules(async () => {
        // Setup mocks
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');
        jest.mock('@/lib/logger');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkApiLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
        expect(result.data?.limit).toBe(100);
        expect(result.data?.remaining).toBe(99);
        expect(result.data?.resetTime).toBeDefined();
        expect(mockLimitInstance.limit).toHaveBeenCalledWith('user:123');
      });
    });

    it('fails open when Redis is not configured', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@/lib/redis');
        const { isRedisConfigured } = await import('@/lib/redis');
        (isRedisConfigured as jest.Mock).mockReturnValue(false);

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkApiLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
        expect(result.data?.limit).toBe(100);
        expect(result.data?.remaining).toBe(100);
      });
    });

    it('fails open when rate limiter throws error', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockRejectedValue(new Error('Redis error')),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkApiLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
        expect(result.data?.limit).toBe(100);
        expect(result.data?.remaining).toBe(100);
      });
    });

    it('logs debug info for successful rate limit check', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');
        jest.mock('@/lib/logger');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );
        const { log } = await import('@/lib/logger');

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        await rateLimitingService.checkApiLimit('user:123');

        expect((log as jest.Mocked<typeof log>).debug).toHaveBeenCalled();
      });
    });
  });

  describe('checkAuthLimit', () => {
    it('uses fixed window rate limiter for auth', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 5,
            remaining: 4,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result =
          await rateLimitingService.checkAuthLimit('ip:192.168.1.1');

        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(5);
        expect(result.data?.remaining).toBe(4);
      });
    });

    it('handles rate limiter initialization failure', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        (
          Ratelimit as jest.MockedClass<typeof Ratelimit>
        ).mockImplementationOnce(() => {
          throw new Error('Initialization failed');
        });
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkAuthLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
      });
    });

    it('fails open when Redis is not configured', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@/lib/redis');
        const { isRedisConfigured } = await import('@/lib/redis');
        (isRedisConfigured as jest.Mock).mockReturnValue(false);

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkAuthLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
        expect(result.data?.limit).toBe(5);
        expect(result.data?.remaining).toBe(5);
      });
    });

    it('fails open when rate limiter throws error', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockRejectedValue(new Error('Auth Redis error')),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkAuthLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
      });
    });
  });

  describe('checkUploadLimit', () => {
    it('uses token bucket rate limiter for uploads', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 30000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkUploadLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(10);
        expect(result.data?.remaining).toBe(9);
        expect(mockLimitInstance.limit).toHaveBeenCalledWith('user:123');
      });
    });

    it('handles rate limiter initialization failure', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        (
          Ratelimit as jest.MockedClass<typeof Ratelimit>
        ).mockImplementationOnce(() => {
          throw new Error('Upload initialization failed');
        });
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result = await rateLimitingService.checkUploadLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
      });
    });
  });

  describe('checkGameSessionLimit', () => {
    it('checks game session creation rate limit', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result =
          await rateLimitingService.checkGameSessionLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(10);
        expect(result.data?.remaining).toBe(9);
      });
    });

    it('handles rate limiter initialization failure', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        (
          Ratelimit as jest.MockedClass<typeof Ratelimit>
        ).mockImplementationOnce(() => {
          throw new Error('Game session initialization failed');
        });
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result =
          await rateLimitingService.checkGameSessionLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
      });
    });
  });

  describe('checkGameActionLimit', () => {
    it('checks game action rate limit', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 30,
            remaining: 29,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result =
          await rateLimitingService.checkGameActionLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(30);
        expect(result.data?.remaining).toBe(29);
        expect(mockLimitInstance.limit).toHaveBeenCalledWith('user:123');
      });
    });

    it('handles rate limiter initialization failure', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        (
          Ratelimit as jest.MockedClass<typeof Ratelimit>
        ).mockImplementationOnce(() => {
          throw new Error('Game action initialization failed');
        });
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const result =
          await rateLimitingService.checkGameActionLimit('user:123');

        expect(result.success).toBe(true);
        expect(result.data?.allowed).toBe(true);
      });
    });
  });

  describe('getIdentifier', () => {
    it('returns user identifier when userId provided', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = { headers: { get: jest.fn() } } as any;
      const identifier = rateLimitingService.getIdentifier(request, 'user-123');

      expect(identifier).toBe('user:user-123');
    });

    it('extracts IP from x-forwarded-for header', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = {
        headers: {
          get: jest.fn(header => {
            if (header === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
            return null;
          }),
        },
      } as any;
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('uses x-real-ip header as fallback', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = {
        headers: {
          get: jest.fn(header => {
            if (header === 'x-real-ip') return '192.168.1.2';
            return null;
          }),
        },
      } as any;
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.2');
    });

    it('uses cf-connecting-ip header as fallback', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = {
        headers: {
          get: jest.fn(header => {
            if (header === 'cf-connecting-ip') return '192.168.1.3';
            return null;
          }),
        },
      } as any;
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.3');
    });

    it('returns unknown when no IP headers present', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any;
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:unknown');
    });

    it('handles x-forwarded-for with whitespace correctly', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = {
        headers: {
          get: jest.fn(header => {
            if (header === 'x-forwarded-for')
              return '  192.168.1.100  , 10.0.0.1';
            return null;
          }),
        },
      } as any;
      const identifier = rateLimitingService.getIdentifier(request);

      expect(identifier).toBe('ip:192.168.1.100');
    });

    it('prioritizes headers in correct order', async () => {
      const { rateLimitingService } = await import('../rate-limiting.service');
      const request = {
        headers: {
          get: jest.fn(header => {
            if (header === 'x-forwarded-for') return '192.168.1.1';
            if (header === 'x-real-ip') return '192.168.1.2';
            if (header === 'cf-connecting-ip') return '192.168.1.3';
            return null;
          }),
        },
      } as any;
      const identifier = rateLimitingService.getIdentifier(request);

      // Should use x-forwarded-for first
      expect(identifier).toBe('ip:192.168.1.1');
    });
  });

  describe('withRateLimit', () => {
    const mockHandler = jest.fn();
    const mockRequest = {
      headers: {
        get: jest.fn(header => {
          if (header === 'x-real-ip') return '192.168.1.1';
          return null;
        }),
      },
    } as any;

    beforeEach(() => {
      mockHandler.mockClear();
      mockHandler.mockResolvedValue({ data: 'success' });
    });

    it('executes handler when rate limit allows', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { withRateLimit } = await import('../rate-limiting.service');
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
    });

    it('blocks execution when rate limit exceeded', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: false,
            limit: 100,
            remaining: 0,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { withRateLimit } = await import('../rate-limiting.service');
        const result = await withRateLimit(mockRequest, mockHandler, 'api');

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Rate limit exceeded/);
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });

    it('handles different limit types', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { withRateLimit } = await import('../rate-limiting.service');

        await withRateLimit(mockRequest, mockHandler, 'auth');
        await withRateLimit(mockRequest, mockHandler, 'upload');
        await withRateLimit(mockRequest, mockHandler, 'gameSession');
        await withRateLimit(mockRequest, mockHandler, 'gameAction');

        expect(mockHandler).toHaveBeenCalledTimes(4);
      });
    });

    it('handles handler errors', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const errorHandler = jest
          .fn()
          .mockRejectedValue(new Error('Handler error'));

        const { withRateLimit } = await import('../rate-limiting.service');
        const result = await withRateLimit(mockRequest, errorHandler, 'api');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Request processing failed');
      });
    });

    it('handles rate limit check failures', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@/lib/redis');
        const { isRedisConfigured } = await import('@/lib/redis');
        (isRedisConfigured as jest.Mock).mockReturnValue(false);

        const { withRateLimit } = await import('../rate-limiting.service');
        const result = await withRateLimit(mockRequest, mockHandler, 'api');

        // Even when Redis is not configured, it should fail open and allow the request
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ data: 'success' });
        expect(mockHandler).toHaveBeenCalled();
      });
    });

    it('handles rate limit check returning error response', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => {
            throw new Error('Rate limit service unavailable');
          }
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { withRateLimit } = await import('../rate-limiting.service');
        const result = await withRateLimit(mockRequest, mockHandler, 'api');

        // Service fails open on errors
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ data: 'success' });
        expect(mockHandler).toHaveBeenCalled();
      });
    });

    it('handles rate limit check returning null data', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        // First setup normal mock
        const mockLimitInstance = {
          limit: jest.fn(),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService, withRateLimit } = await import(
          '../rate-limiting.service'
        );

        // Override the checkApiLimit method to return null data
        const originalCheckApiLimit = rateLimitingService.checkApiLimit;
        rateLimitingService.checkApiLimit = jest.fn().mockResolvedValueOnce({
          success: true,
          data: null,
          error: null,
        } as any);

        const result = await withRateLimit(mockRequest, mockHandler, 'api');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Rate limit check returned null data');
        expect(mockHandler).not.toHaveBeenCalled();

        // Restore original method
        rateLimitingService.checkApiLimit = originalCheckApiLimit;
      });
    });

    it('handles rate limit exceeded with custom reset time calculation', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const resetTime = Date.now() + 90000; // 90 seconds from now
        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: false,
            limit: 100,
            remaining: 0,
            reset: resetTime,
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { withRateLimit } = await import('../rate-limiting.service');
        const result = await withRateLimit(mockRequest, mockHandler, 'api');

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Try again in \d+ seconds/);
        // Should be approximately 90 seconds
        const match = result.error?.match(/Try again in (\d+) seconds/);
        const seconds = match && match[1] ? parseInt(match[1], 10) : 0;
        expect(seconds).toBeGreaterThanOrEqual(89);
        expect(seconds).toBeLessThanOrEqual(91);
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });

    it('defaults to 60 seconds when resetTime is undefined', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: false,
            limit: 100,
            remaining: 0,
            reset: undefined, // No reset time provided
            reason: undefined,
          }),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { withRateLimit } = await import('../rate-limiting.service');
        const result = await withRateLimit(mockRequest, mockHandler, 'api');

        expect(result.success).toBe(false);
        expect(result.error).toBe(
          'Rate limit exceeded. Try again in 60 seconds.'
        );
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('comprehensive coverage tests', () => {
    it('covers all rate limiter initialization error paths', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => {
            throw new Error('API limiter init failed');
          }
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const apiResult = await rateLimitingService.checkApiLimit('test:123');
        expect(apiResult.success).toBe(true);
        expect(apiResult.data?.allowed).toBe(true);
      });
    });

    it('covers all rate limit check fail-open scenarios', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@/lib/redis');
        const { isRedisConfigured } = await import('@/lib/redis');
        (isRedisConfigured as jest.Mock).mockReturnValue(false);

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );

        const authResult =
          await rateLimitingService.checkAuthLimit('test:auth');
        expect(authResult.success).toBe(true);
        expect(authResult.data?.allowed).toBe(true);

        const uploadResult =
          await rateLimitingService.checkUploadLimit('test:upload');
        expect(uploadResult.success).toBe(true);
        expect(uploadResult.data?.allowed).toBe(true);

        const gameSessionResult =
          await rateLimitingService.checkGameSessionLimit('test:session');
        expect(gameSessionResult.success).toBe(true);
        expect(gameSessionResult.data?.allowed).toBe(true);

        const gameActionResult =
          await rateLimitingService.checkGameActionLimit('test:action');
        expect(gameActionResult.success).toBe(true);
        expect(gameActionResult.data?.allowed).toBe(true);
      });
    });

    it('covers error handling in rate limit checks', async () => {
      await jest.isolateModules(async () => {
        jest.mock('@upstash/ratelimit');
        jest.mock('@/lib/redis');

        const { Ratelimit } = await import('@upstash/ratelimit');
        const { getRedisClient, isRedisConfigured } = await import(
          '@/lib/redis'
        );

        const mockLimitInstance = {
          limit: jest.fn().mockRejectedValue(new Error('Auth Redis error')),
        };

        (Ratelimit as jest.MockedClass<typeof Ratelimit>).mockImplementation(
          () => mockLimitInstance as any
        );
        (isRedisConfigured as jest.Mock).mockReturnValue(true);
        (getRedisClient as jest.Mock).mockReturnValue({ ping: jest.fn() });

        const { rateLimitingService } = await import(
          '../rate-limiting.service'
        );
        const authResult =
          await rateLimitingService.checkAuthLimit('test:auth');
        expect(authResult.success).toBe(true);
        expect(authResult.data?.allowed).toBe(true);
      });
    });
  });
});
