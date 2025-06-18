/**
 * Infrastructure Unit Tests
 * 
 * Tests error boundaries, retry logic, cache strategies, and rate limiting
 * Using actual project infrastructure implementations
 */

// Mock all external dependencies to avoid ESM issues - MUST be first
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: {
    slidingWindow: jest.fn(),
    fixedWindow: jest.fn(),
    tokenBucket: jest.fn(),
  },
}));

// Mock Redis for testing
jest.mock('@/lib/redis', () => ({
  isRedisConfigured: jest.fn(() => false),
  getRedisClient: jest.fn(() => {
    throw new Error('Redis not configured in test environment');
  }),
  REDIS_PREFIXES: {
    RATE_LIMIT: '@arcadia/rate-limit',
    CACHE: '@arcadia/cache',
    SESSION: '@arcadia/session',
    PRESENCE: '@arcadia/presence',
    QUEUE: '@arcadia/queue',
  },
  createRedisKey: jest.fn((prefix: string, ...parts: string[]) => 
    `${prefix}:${parts.join(':')}`
  ),
}));

// Mock cache metrics
jest.mock('@/lib/cache-metrics', () => ({
  cacheMetrics: {
    recordSet: jest.fn(),
    recordHit: jest.fn(),
    recordMiss: jest.fn(),
    recordError: jest.fn(),
  },
  measureLatency: jest.fn(() => () => 100),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock cache service
jest.mock('@/services/redis.service', () => ({
  cacheService: {
    set: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
    get: jest.fn().mockResolvedValue({ success: true, data: null, error: null }),
    getWithSchema: jest.fn().mockResolvedValue({ success: true, data: null, error: null }),
    getOrSet: jest.fn().mockResolvedValue({ success: true, data: null, error: null }),
    invalidate: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
    invalidatePattern: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
    createKey: jest.fn((prefix: string, ...parts: string[]) => 
      `@arcadia/cache:${prefix}:${parts.join(':')}`
    ),
  },
  redisService: {
    set: jest.fn().mockResolvedValue({ success: true, data: undefined, error: null }),
    get: jest.fn().mockResolvedValue({ success: true, data: null, error: null }),
  },
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ArcadiaError,
  ErrorCode,
  ErrorSeverity,
  ErrorFactory,
  handleError,
  isArcadiaError,
  isRetryableError,
} from '@/lib/error-handler';
import { CircuitBreaker, CircuitState } from '@/lib/circuit-breaker';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';
import { rateLimitingService, withRateLimit } from '@/services/rate-limiting.service';

describe('Infrastructure Reliability Patterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Note: NODE_ENV is read-only, using alternative approach for test environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      configurable: true,
    });
  });

  describe('Error Handling System', () => {
    describe('ArcadiaError Creation', () => {
      it('should create ArcadiaError with proper properties', () => {
        const error = new ArcadiaError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test validation error',
          severity: ErrorSeverity.LOW,
          metadata: { field: 'username' },
        });

        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.message).toBe('Test validation error');
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.statusCode).toBe(400);
        expect(error.retryable).toBe(false);
        expect(error.metadata).toEqual({ field: 'username' });
        expect(error.timestamp).toBeDefined();
      });

      it('should set default user message', () => {
        const error = new ArcadiaError({
          code: ErrorCode.UNAUTHORIZED,
          message: 'Access denied',
        });

        expect(error.userMessage).toBe('Please log in to continue.');
      });
    });

    describe('ErrorFactory', () => {
      it('should create validation errors', () => {
        const error = ErrorFactory.validation('Invalid input', { field: 'email' });
        
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.statusCode).toBe(400);
      });

      it('should create database errors', () => {
        const originalError = new Error('Connection timeout');
        const error = ErrorFactory.database(originalError, { table: 'users' });
        
        expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.cause).toBe(originalError);
      });

      it('should create rate limit errors', () => {
        const error = ErrorFactory.rateLimit({ endpoint: '/api/auth' });
        
        expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.statusCode).toBe(429);
      });
    });

    describe('Error Type Guards', () => {
      it('should identify ArcadiaError instances', () => {
        const arcadiaError = ErrorFactory.validation('Test error');
        const regularError = new Error('Regular error');
        
        expect(isArcadiaError(arcadiaError)).toBe(true);
        expect(isArcadiaError(regularError)).toBe(false);
      });

      it('should identify retryable errors', () => {
        const retryableError = ErrorFactory.database(new Error('Timeout'));
        const nonRetryableError = ErrorFactory.validation('Invalid input');
        
        expect(isRetryableError(retryableError)).toBe(true);
        expect(isRetryableError(nonRetryableError)).toBe(false);
      });
    });

    describe('Error Handler Integration', () => {
      it('should handle unknown errors', () => {
        const unknownError = 'string error';
        const result = handleError(unknownError, { component: 'test' });
        
        expect(isArcadiaError(result)).toBe(true);
        expect(result.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
        expect(result.severity).toBe(ErrorSeverity.CRITICAL);
      });

      it('should preserve ArcadiaError instances', () => {
        const originalError = ErrorFactory.validation('Test validation');
        const result = handleError(originalError);
        
        expect(result).toBe(originalError);
      });

      it('should convert generic errors', () => {
        const genericError = new TypeError('Cannot read property');
        const result = handleError(genericError, { feature: 'auth' });
        
        expect(result.code).toBe(ErrorCode.CLIENT_ERROR);
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
        expect(result.cause).toBe(genericError);
      });
    });
  });

  describe('Circuit Breaker Pattern', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit', {
        failureThreshold: 3,
        failureWindow: 60000,
        recoveryTime: 30000,
      });
    });

    describe('Circuit States', () => {
      it('should start in CLOSED state', () => {
        expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should open after threshold failures', async () => {
        const failingOperation = async () => {
          throw new Error('Operation failed');
        };

        // Fail 3 times to reach threshold
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(failingOperation);
          } catch {
            // Expected failures
          }
        }

        expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      });

      it('should execute successfully when closed', async () => {
        const successOperation = async () => 'success';
        
        const result = await circuitBreaker.execute(successOperation);
        expect(result).toBe('success');
        expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should reset on successful execution', async () => {
        const failingOperation = async () => {
          throw new Error('Fail');
        };
        const successOperation = async () => 'success';

        // Fail once
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {
          // Expected
        }

        // Then succeed - should reset failure count
        await circuitBreaker.execute(successOperation);
        
        expect(circuitBreaker.getMetrics().failures).toBe(0);
      });
    });

    describe('Circuit Breaker Metrics', () => {
      it('should provide circuit metrics', () => {
        const metrics = circuitBreaker.getMetrics();
        
        expect(metrics).toHaveProperty('state');
        expect(metrics).toHaveProperty('failures');
        expect(metrics).toHaveProperty('lastFailureTime');
        expect(metrics).toHaveProperty('isHealthy');
        expect(metrics.isHealthy).toBe(true);
      });

      it('should track failure count', async () => {
        const failingOperation = async () => {
          throw new Error('Fail');
        };

        try {
          await circuitBreaker.execute(failingOperation);
        } catch {
          // Expected
        }

        expect(circuitBreaker.getMetrics().failures).toBe(1);
      });
    });

    describe('Fallback Handling', () => {
      it('should execute fallback when circuit is open', async () => {
        const failingOperation = async () => {
          throw new Error('Always fails');
        };
        const fallback = () => 'fallback result';

        // Trigger failures to open circuit
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(failingOperation, fallback);
          } catch {
            // Expected for first few attempts
          }
        }

        // Circuit should be open, should return fallback
        const result = await circuitBreaker.execute(failingOperation, fallback);
        expect(result).toBe('fallback result');
      });
    });
  });

  describe('Cache System', () => {
    describe('Cache Key Generation', () => {
      it('should generate consistent cache keys', () => {
        const userProfileKey = CACHE_KEYS.USER_PROFILE('user-123');
        const boardDataKey = CACHE_KEYS.BOARD_DATA('board-456');
        const sessionKey = CACHE_KEYS.SESSION_DATA('session-789');
        
        expect(userProfileKey).toMatch(/@arcadia\/cache:user-profile:user-123$/);
        expect(boardDataKey).toMatch(/@arcadia\/cache:bingo-board:board-456$/);
        expect(sessionKey).toMatch(/@arcadia\/cache:session:session-789$/);
      });

      it('should create structured keys with multiple parts', () => {
        const userBoardsKey = CACHE_KEYS.USER_BOARDS('user-123', 'active');
        const leaderboardKey = CACHE_KEYS.LEADERBOARD('speedrun');
        
        expect(userBoardsKey).toMatch(/@arcadia\/cache:user-boards:user-123:active$/);
        expect(leaderboardKey).toMatch(/@arcadia\/cache:leaderboard:speedrun$/);
      });
    });

    describe('TTL Configuration', () => {
      it('should have appropriate TTL values', () => {
        expect(CACHE_TTL.SESSION).toBe(15 * 60); // 15 minutes
        expect(CACHE_TTL.USER_PROFILE).toBe(30 * 60); // 30 minutes
        expect(CACHE_TTL.BOARD_DATA).toBe(60 * 60); // 1 hour
        expect(CACHE_TTL.PUBLIC_BOARDS).toBe(4 * 60 * 60); // 4 hours
        expect(CACHE_TTL.USER_STATS).toBe(24 * 60 * 60); // 24 hours
      });

      it('should categorize by data freshness needs', () => {
        // Short-lived: session data, rate limits
        expect(CACHE_TTL.SESSION).toBeLessThan(CACHE_TTL.USER_PROFILE);
        expect(CACHE_TTL.RATE_LIMIT).toBeLessThan(CACHE_TTL.SESSION);
        
        // Long-lived: statistics, public data
        expect(CACHE_TTL.USER_STATS).toBeGreaterThan(CACHE_TTL.BOARD_DATA);
        expect(CACHE_TTL.PUBLIC_BOARDS).toBeGreaterThan(CACHE_TTL.QUERY_RESULT);
      });
    });

    describe('Cache Operations (Mocked)', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should handle cache set operations', async () => {
        const testData = { id: 'test', name: 'Test Data' };
        const result = await cache.set('test-key', testData, 300);
        
        expect(result.success).toBe(true);
      });

      it('should handle cache get operations with schema', async () => {
        const mockSchema = { parse: jest.fn(data => data) };
        const result = await cache.get('test-key', mockSchema);
        
        expect(result.success).toBe(true);
      });

      it('should return null when no schema provided', async () => {
        const result = await cache.get('test-key');
        
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });
  });

  describe('Rate Limiting System', () => {
    describe('Rate Limiting Service', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should check API rate limits', async () => {
        const result = await rateLimitingService.checkApiLimit('test-user');
        
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('allowed');
        expect(result.data).toHaveProperty('limit');
        expect(result.data).toHaveProperty('remaining');
        expect(result.data).toHaveProperty('resetTime');
      });

      it('should check auth rate limits with stricter rules', async () => {
        const result = await rateLimitingService.checkAuthLimit('test-user');
        
        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(5); // Auth has stricter limit
      });

      it('should check upload rate limits', async () => {
        const result = await rateLimitingService.checkUploadLimit('test-user');
        
        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(10); // Upload limit
      });

      it('should check game session limits', async () => {
        const result = await rateLimitingService.checkGameSessionLimit('test-user');
        
        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(10); // Game session limit
      });

      it('should check game action limits', async () => {
        const result = await rateLimitingService.checkGameActionLimit('test-user');
        
        expect(result.success).toBe(true);
        expect(result.data?.limit).toBe(30); // Game action limit
      });
    });

    describe('Identifier Generation', () => {
      it('should use user ID when available', () => {
        const mockRequest = new Request('https://example.com');
        const identifier = rateLimitingService.getIdentifier(mockRequest, 'user-123');
        
        expect(identifier).toBe('user:user-123');
      });

      it('should extract IP from headers', () => {
        const mockRequest = new Request('https://example.com', {
          headers: {
            'x-forwarded-for': '192.168.1.1, 10.0.0.1',
            'x-real-ip': '192.168.1.2',
          },
        });
        
        const identifier = rateLimitingService.getIdentifier(mockRequest);
        expect(identifier).toBe('ip:192.168.1.1');
      });

      it('should handle missing headers gracefully', () => {
        const mockRequest = new Request('https://example.com');
        const identifier = rateLimitingService.getIdentifier(mockRequest);
        
        expect(identifier).toBe('ip:unknown');
      });
    });

    describe('Rate Limiting Middleware', () => {
      it('should allow requests when rate limit is not exceeded', async () => {
        const mockRequest = new Request('https://example.com');
        const mockHandler = jest.fn().mockResolvedValue('success');
        
        const result = await withRateLimit(mockRequest, mockHandler, 'api');
        
        expect(result.success).toBe(true);
        expect(result.data).toBe('success');
        expect(mockHandler).toHaveBeenCalled();
      });

      it('should handle different rate limit types', async () => {
        const mockRequest = new Request('https://example.com');
        const mockHandler = jest.fn().mockResolvedValue('success');
        
        const authResult = await withRateLimit(mockRequest, mockHandler, 'auth');
        const uploadResult = await withRateLimit(mockRequest, mockHandler, 'upload');
        const gameResult = await withRateLimit(mockRequest, mockHandler, 'gameAction');
        
        expect(authResult.success).toBe(true);
        expect(uploadResult.success).toBe(true);
        expect(gameResult.success).toBe(true);
      });

      it('should handle handler errors gracefully', async () => {
        const mockRequest = new Request('https://example.com');
        const mockHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
        
        const result = await withRateLimit(mockRequest, mockHandler, 'api');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Request processing failed');
      });
    });

    describe('Service Response Types', () => {
      it('should create successful service responses', () => {
        const response = createServiceSuccess({ test: 'data' });
        
        expect(response.success).toBe(true);
        expect(response.data).toEqual({ test: 'data' });
        expect(response.error).toBeNull();
      });

      it('should create error service responses', () => {
        const response = createServiceError('Test error');
        
        expect(response.success).toBe(false);
        expect(response.data).toBeNull();
        expect(response.error).toBe('Test error');
      });

      it('should handle Error objects in service responses', () => {
        const error = new Error('Test error object');
        const response = createServiceError(error);
        
        expect(response.success).toBe(false);
        expect(response.data).toBeNull();
        expect(response.error).toBe('Test error object');
      });
    });
  });
});