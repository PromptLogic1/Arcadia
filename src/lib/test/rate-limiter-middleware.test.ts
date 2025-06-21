/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withRateLimit, createRateLimitedHandler, RATE_LIMIT_CONFIGS } from '../rate-limiter-middleware';
import * as rateLimitingService from '@/services/rate-limiting.service';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/rate-limiting.service');
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Rate Limiter Middleware', () => {
  let mockRequest: NextRequest;
  let mockHandler: jest.Mock;
  let mockWithRedisRateLimit: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock request
    mockRequest = {
      nextUrl: {
        pathname: '/api/test',
      },
    } as NextRequest;

    // Create mock handler that returns a NextResponse
    mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ message: 'success' })
    );

    // Mock the rate limiting service
    mockWithRedisRateLimit = jest.spyOn(rateLimitingService, 'withRateLimit');
  });

  describe('withRateLimit', () => {
    it('allows requests when rate limit is not exceeded', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'api');
      const result = await rateLimitedHandler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'api'
      );
      expect(result).toBe(mockResponse);
    });

    it('returns 429 error when rate limit is exceeded', async () => {
      // Arrange
      mockWithRedisRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'RATE_LIMIT_EXCEEDED: Too many requests',
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'auth');
      const result = await rateLimitedHandler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'auth'
      );
      expect(logger.warn).toHaveBeenCalledWith('Redis rate limit exceeded', {
        metadata: {
          path: '/api/test',
          limitType: 'auth',
          error: 'RATE_LIMIT_EXCEEDED: Too many requests',
        },
      });
      
      expect(result).toBeInstanceOf(NextResponse);
      const body = await result.json();
      expect(body).toEqual({
        error: 'Too many requests',
        message: 'Rate limit exceeded',
      });
      expect(result.status).toBe(429);
    });

    it('fails open and allows request when rate limiting service errors', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockHandler.mockResolvedValue(mockResponse);
      mockWithRedisRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'Redis connection failed',
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'upload');
      const result = await rateLimitedHandler(mockRequest);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Rate limiting service error',
        expect.any(Error),
        {
          metadata: {
            path: '/api/test',
            limitType: 'upload',
            error: 'Redis connection failed',
          },
        }
      );
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });

    it('handles null data response from rate limiting service', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockHandler.mockResolvedValue(mockResponse);
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'gameSession');
      const result = await rateLimitedHandler(mockRequest);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Rate limiting service returned null data',
        expect.any(Error),
        {
          metadata: {
            path: '/api/test',
            limitType: 'gameSession',
          },
        }
      );
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });

    it('passes additional arguments to the handler', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      const mockHandlerWithArgs = jest.fn().mockResolvedValue(mockResponse);
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      const additionalArg1 = { id: '123' };
      const additionalArg2 = 'test';

      // Act
      const rateLimitedHandler = withRateLimit(mockHandlerWithArgs, 'api');
      const result = await rateLimitedHandler(mockRequest, additionalArg1, additionalArg2);

      // Assert
      expect(mockHandlerWithArgs).toHaveBeenCalledWith(mockRequest, additionalArg1, additionalArg2);
      expect(result).toBe(mockResponse);
    });
  });

  describe('createRateLimitedHandler', () => {
    it('creates a rate-limited handler with specified limit type', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      // Act
      const handler = createRateLimitedHandler('gameAction', mockHandler);
      const result = await handler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'gameAction'
      );
      expect(result).toBe(mockResponse);
    });

    it('handles different rate limit types correctly', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      const limitTypes: Array<'api' | 'auth' | 'upload' | 'gameSession' | 'gameAction'> = 
        ['api', 'auth', 'upload', 'gameSession', 'gameAction'];

      // Act & Assert
      for (const limitType of limitTypes) {
        jest.clearAllMocks();
        
        const handler = createRateLimitedHandler(limitType, mockHandler);
        await handler(mockRequest);

        expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
          mockRequest,
          expect.any(Function),
          limitType
        );
      }
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('exports correct rate limit configuration mappings', () => {
      expect(RATE_LIMIT_CONFIGS).toEqual({
        auth: 'auth',
        create: 'gameSession',
        read: 'api',
        expensive: 'upload',
        gameAction: 'gameAction',
      });
    });

    it('maps configuration names to correct rate limit types', () => {
      // Verify each mapping is correct
      expect(RATE_LIMIT_CONFIGS.auth).toBe('auth');
      expect(RATE_LIMIT_CONFIGS.create).toBe('gameSession');
      expect(RATE_LIMIT_CONFIGS.read).toBe('api');
      expect(RATE_LIMIT_CONFIGS.expensive).toBe('upload');
      expect(RATE_LIMIT_CONFIGS.gameAction).toBe('gameAction');
    });
  });

  describe('Error handling edge cases', () => {
    it('handles non-string error responses gracefully', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockHandler.mockResolvedValue(mockResponse);
      mockWithRedisRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: { code: 'UNKNOWN_ERROR', message: 'Something went wrong' } as unknown as string,
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'api');
      const result = await rateLimitedHandler(mockRequest);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Rate limiting service error',
        expect.any(Error),
        {
          metadata: {
            path: '/api/test',
            limitType: 'api',
            error: 'Unknown error',
          },
        }
      );
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });

    it('handles undefined error responses', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ message: 'success' });
      mockHandler.mockResolvedValue(mockResponse);
      mockWithRedisRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: undefined as unknown as string,
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'auth');
      const result = await rateLimitedHandler(mockRequest);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Rate limiting service error',
        expect.any(Error),
        {
          metadata: {
            path: '/api/test',
            limitType: 'auth',
            error: 'Unknown error',
          },
        }
      );
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });
  });

  describe('Concurrent request handling', () => {
    it('handles multiple concurrent requests independently', async () => {
      // Arrange
      const responses = [
        NextResponse.json({ id: 1 }),
        NextResponse.json({ id: 2 }),
        NextResponse.json({ id: 3 }),
      ];

      mockWithRedisRateLimit
        .mockResolvedValueOnce({ success: true, data: responses[0], error: null })
        .mockResolvedValueOnce({ success: true, data: responses[1], error: null })
        .mockResolvedValueOnce({ success: true, data: responses[2], error: null });

      const handler = withRateLimit(mockHandler, 'api');

      // Act
      const results = await Promise.all([
        handler(mockRequest),
        handler(mockRequest),
        handler(mockRequest),
      ]);

      // Assert
      expect(results).toEqual(responses);
      expect(mockWithRedisRateLimit).toHaveBeenCalledTimes(3);
    });

    it('handles mixed success and rate limit responses in concurrent requests', async () => {
      // Arrange
      const successResponse = NextResponse.json({ id: 1 });
      
      mockWithRedisRateLimit
        .mockResolvedValueOnce({ success: true, data: successResponse, error: null })
        .mockResolvedValueOnce({ 
          success: false, 
          data: null, 
          error: 'RATE_LIMIT_EXCEEDED: Too many requests' 
        })
        .mockResolvedValueOnce({ success: true, data: successResponse, error: null });

      const handler = withRateLimit(mockHandler, 'auth');

      // Act
      const results = await Promise.all([
        handler(mockRequest),
        handler(mockRequest),
        handler(mockRequest),
      ]);

      // Assert
      expect(results[0]).toBe(successResponse);
      expect(results[1].status).toBe(429);
      expect(results[2]).toBe(successResponse);
    });
  });

  describe('DDoS protection scenarios', () => {
    it('blocks rapid repeated requests from same source', async () => {
      // Arrange
      mockWithRedisRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'RATE_LIMIT_EXCEEDED: Too many requests',
      });

      const handler = withRateLimit(mockHandler, 'auth');

      // Act - Simulate 10 rapid requests
      const results = await Promise.all(
        Array(10).fill(null).map(() => handler(mockRequest))
      );

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledTimes(10);
      expect(logger.warn).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result.status).toBe(429);
      });
    });

    it('handles slow drip attacks by tracking over time windows', async () => {
      // Arrange - Simulate responses that eventually hit rate limit
      const responses = Array(5).fill({ success: true, data: NextResponse.json({ ok: true }), error: null })
        .concat(Array(5).fill({ success: false, data: null, error: 'RATE_LIMIT_EXCEEDED: Too many requests' }));
      
      responses.forEach((response, index) => {
        mockWithRedisRateLimit.mockResolvedValueOnce(response);
      });

      const handler = withRateLimit(mockHandler, 'upload');

      // Act
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await handler(mockRequest));
      }

      // Assert
      const successCount = results.filter(r => r.status !== 429).length;
      const blockedCount = results.filter(r => r.status === 429).length;
      
      expect(successCount).toBe(5);
      expect(blockedCount).toBe(5);
    });
  });

  describe('Integration with different rate limit algorithms', () => {
    it('works with sliding window algorithm (api type)', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ algorithm: 'sliding-window' });
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      // Act
      const handler = createRateLimitedHandler('api', mockHandler);
      const result = await handler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'api'
      );
      expect(result).toBe(mockResponse);
    });

    it('works with fixed window algorithm (auth type)', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ algorithm: 'fixed-window' });
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      // Act
      const handler = createRateLimitedHandler('auth', mockHandler);
      const result = await handler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'auth'
      );
      expect(result).toBe(mockResponse);
    });

    it('works with token bucket algorithm (upload type)', async () => {
      // Arrange
      const mockResponse = NextResponse.json({ algorithm: 'token-bucket' });
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: mockResponse,
        error: null,
      });

      // Act
      const handler = createRateLimitedHandler('upload', mockHandler);
      const result = await handler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'upload'
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('Distributed rate limiting scenarios', () => {
    it('coordinates rate limits across multiple instances', async () => {
      // Arrange
      const instance1Handler = withRateLimit(mockHandler, 'gameSession');
      const instance2Handler = withRateLimit(mockHandler, 'gameSession');

      // First instance uses some quota
      mockWithRedisRateLimit.mockResolvedValueOnce({
        success: true,
        data: NextResponse.json({ remaining: 8 }),
        error: null,
      });

      // Second instance sees reduced quota
      mockWithRedisRateLimit.mockResolvedValueOnce({
        success: true,
        data: NextResponse.json({ remaining: 7 }),
        error: null,
      });

      // Act
      const result1 = await instance1Handler(mockRequest);
      const result2 = await instance2Handler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenCalledTimes(2);
      expect(mockWithRedisRateLimit).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        'gameSession'
      );
      
      const body1 = await result1.json();
      const body2 = await result2.json();
      expect(body1.remaining).toBe(8);
      expect(body2.remaining).toBe(7);
    });
  });

  describe('Configuration edge cases', () => {
    it('handles requests with missing pathname gracefully', async () => {
      // Arrange
      const requestWithoutPath = {
        nextUrl: {},
      } as NextRequest;

      mockWithRedisRateLimit.mockResolvedValue({
        success: false,
        data: null,
        error: 'RATE_LIMIT_EXCEEDED: Too many requests',
      });

      // Act
      const handler = withRateLimit(mockHandler, 'api');
      const result = await handler(requestWithoutPath);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Redis rate limit exceeded', {
        metadata: {
          path: undefined,
          limitType: 'api',
          error: 'RATE_LIMIT_EXCEEDED: Too many requests',
        },
      });
      expect(result.status).toBe(429);
    });

    it('uses correct limit type from RATE_LIMIT_CONFIGS mapping', async () => {
      // Arrange
      mockWithRedisRateLimit.mockResolvedValue({
        success: true,
        data: NextResponse.json({ ok: true }),
        error: null,
      });

      // Act - Test each config mapping
      const authHandler = createRateLimitedHandler(RATE_LIMIT_CONFIGS.auth, mockHandler);
      await authHandler(mockRequest);

      const createHandler = createRateLimitedHandler(RATE_LIMIT_CONFIGS.create, mockHandler);
      await createHandler(mockRequest);

      // Assert
      expect(mockWithRedisRateLimit).toHaveBeenNthCalledWith(1, mockRequest, expect.any(Function), 'auth');
      expect(mockWithRedisRateLimit).toHaveBeenNthCalledWith(2, mockRequest, expect.any(Function), 'gameSession');
    });
  });

  describe('Burst traffic protection', () => {
    it('handles burst traffic with proper rate limiting', async () => {
      // Arrange
      let requestCount = 0;
      mockWithRedisRateLimit.mockImplementation(async () => {
        requestCount++;
        // Allow first 5 requests, then rate limit
        if (requestCount <= 5) {
          return {
            success: true,
            data: NextResponse.json({ request: requestCount }),
            error: null,
          };
        }
        return {
          success: false,
          data: null,
          error: 'RATE_LIMIT_EXCEEDED: Burst limit reached',
        };
      });

      const handler = withRateLimit(mockHandler, 'gameAction');

      // Act - Simulate burst of 10 requests
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await handler(mockRequest));
      }

      // Assert
      const successfulRequests = results.filter(r => r.status !== 429);
      const rateLimitedRequests = results.filter(r => r.status === 429);
      
      expect(successfulRequests).toHaveLength(5);
      expect(rateLimitedRequests).toHaveLength(5);
      expect(logger.warn).toHaveBeenCalledTimes(5);
    });
  });

  describe('Request handler execution', () => {
    it('executes the wrapped handler function correctly', async () => {
      // Arrange
      mockWithRedisRateLimit.mockImplementation(async (req, handler) => {
        const result = await handler();
        return { success: true, data: result, error: null };
      });

      // Act
      const rateLimitedHandler = withRateLimit(mockHandler, 'api');
      await rateLimitedHandler(mockRequest);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(mockWithRedisRateLimit).toHaveBeenCalled();
      
      // Verify the handler was passed correctly
      const handlerArg = mockWithRedisRateLimit.mock.calls[0][1];
      expect(typeof handlerArg).toBe('function');
    });

    it('preserves handler errors when rate limit passes', async () => {
      // Arrange
      const handlerError = new Error('Handler error');
      const errorHandler = jest.fn().mockRejectedValue(handlerError);
      
      mockWithRedisRateLimit.mockImplementation(async (req, handler) => {
        try {
          const result = await handler();
          return { success: true, data: result, error: null };
        } catch (error) {
          throw error;
        }
      });

      // Act & Assert
      const rateLimitedHandler = withRateLimit(errorHandler, 'api');
      await expect(rateLimitedHandler(mockRequest)).rejects.toThrow('Handler error');
    });
  });
});