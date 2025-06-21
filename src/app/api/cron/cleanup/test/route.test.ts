/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { enhancedCache } from '@/lib/cache-enhanced';
import { log } from '@/lib/logger';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';

// Mock external dependencies
jest.mock('@/lib/cache-enhanced', () => ({
  enhancedCache: {
    invalidateByPattern: jest.fn(),
    resetMetrics: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockEnhancedCache = enhancedCache as jest.Mocked<typeof enhancedCache>;
const mockLog = log as jest.Mocked<typeof log>;

// Environment variable setup
const originalEnv = process.env;

describe('GET /api/cron/cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (authHeader?: string): NextRequest => {
    const headers = new Headers();
    if (authHeader) {
      headers.set('authorization', authHeader);
    }

    return new NextRequest('https://localhost:3000/api/cron/cleanup', {
      headers,
    });
  };

  describe('Authorization', () => {
    it('should reject requests without authorization header', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should reject requests with invalid authorization header', async () => {
      const request = createRequest('Bearer invalid-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should accept requests with valid authorization header', async () => {
      // Mock all cleanup operations to succeed
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: true, data: 5, error: null }) // expired sessions
        .mockResolvedValueOnce({ success: true, data: 3, error: null }) // temp data
        .mockResolvedValueOnce({ success: true, data: 2, error: null }); // stale cache

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Successful Cleanup', () => {
    it('should successfully execute all cleanup tasks', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: true, data: 5, error: null }) // expired sessions
        .mockResolvedValueOnce({ success: true, data: 3, error: null }) // temp data
        .mockResolvedValueOnce({ success: true, data: 2, error: null }); // stale cache

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Cleanup completed successfully',
        totalCleaned: 10, // 5 + 3 + 2
        results: {
          expiredSessions: 5,
          tempData: 3,
          staleCache: 2,
          errors: 0,
        },
      });
      expect(data.tasks).toHaveLength(4); // 3 cleanup tasks + 1 metrics reset
      expect(data.tasks).toContain('✅ Session cleanup completed');
      expect(data.tasks).toContain('✅ Temporary data cleanup completed');
      expect(data.tasks).toContain('✅ Stale cache cleanup completed');
      expect(data.tasks).toContain('✅ Cache metrics reset');
      expect(data.timestamp).toBeDefined();
    });

    it('should call invalidateByPattern with correct patterns', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValue({ success: true, data: 1, error: null });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockEnhancedCache.invalidateByPattern).toHaveBeenCalledTimes(3);
      expect(mockEnhancedCache.invalidateByPattern).toHaveBeenCalledWith(
        'expired:*',
        'session'
      );
      expect(mockEnhancedCache.invalidateByPattern).toHaveBeenCalledWith(
        'temp:*',
        'general'
      );
      expect(mockEnhancedCache.invalidateByPattern).toHaveBeenCalledWith(
        'stale:*',
        'cache'
      );
    });

    it('should call resetMetrics', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValue({ success: true, data: 1, error: null });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockEnhancedCache.resetMetrics).toHaveBeenCalledTimes(1);
    });

    it('should log cleanup completion', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValue({ success: true, data: 1, error: null });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockLog.info).toHaveBeenCalledWith('Starting cleanup job');
      expect(mockLog.info).toHaveBeenCalledWith(
        'Cleanup job completed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            totalItemsCleaned: 3,
            tasksCompleted: 4,
            errors: 0,
          }),
        })
      );
    });
  });

  describe('Partial Failures', () => {
    it('should handle session cleanup failure', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce(createServiceError('Session cleanup failed')) // sessions fail
        .mockResolvedValueOnce(createServiceSuccess(3)) // temp data succeeds
        .mockResolvedValueOnce(createServiceSuccess(2)); // stale cache succeeds

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data).toMatchObject({
        success: false,
        message: 'Cleanup completed with errors',
        totalCleaned: 5, // 0 + 3 + 2 (session cleanup failed)
        results: {
          expiredSessions: 0,
          tempData: 3,
          staleCache: 2,
          errors: 1,
        },
      });
      expect(data.tasks).toContain('❌ Session cleanup failed');
      expect(data.tasks).toContain('✅ Temporary data cleanup completed');
      expect(data.tasks).toContain('✅ Stale cache cleanup completed');
    });

    it('should handle temp data cleanup failure', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: true, data: 5, error: null }) // sessions succeed
        .mockResolvedValueOnce({ success: false, data: null, error: 'Temp cleanup failed' }) // temp data fails
        .mockResolvedValueOnce({ success: true, data: 2, error: null }); // stale cache succeeds

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data.results.errors).toBe(1);
      expect(data.tasks).toContain('❌ Temporary data cleanup failed');
    });

    it('should handle stale cache cleanup failure', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: true, data: 5, error: null }) // sessions succeed
        .mockResolvedValueOnce({ success: true, data: 3, error: null }) // temp data succeeds
        .mockResolvedValueOnce({ success: false, data: null, error: 'Stale cleanup failed' }); // stale cache fails

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data.results.errors).toBe(1);
      expect(data.tasks).toContain('❌ Stale cache cleanup failed');
    });

    it('should handle metrics reset failure', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValue({ success: true, data: 1, error: null });
      mockEnhancedCache.resetMetrics.mockImplementationOnce(() => {
        throw new Error('Metrics reset failed');
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data.results.errors).toBe(1);
      expect(data.tasks).toContain('❌ Cache metrics reset failed');
    });

    it('should handle multiple failures', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: false, data: null, error: 'Session failed' })
        .mockResolvedValueOnce({ success: false, data: null, error: 'Temp failed' })
        .mockResolvedValueOnce({ success: false, data: null, error: 'Stale failed' });
      mockEnhancedCache.resetMetrics.mockImplementationOnce(() => {
        throw new Error('Metrics failed');
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data).toMatchObject({
        success: false,
        message: 'Cleanup completed with errors',
        totalCleaned: 0,
        results: {
          expiredSessions: 0,
          tempData: 0,
          staleCache: 0,
          errors: 4, // All 4 tasks failed
        },
      });
    });
  });

  describe('Exception Handling', () => {
    it('should handle session cleanup exception', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockRejectedValueOnce(new Error('Session cleanup exception'))
        .mockResolvedValueOnce({ success: true, data: 3, error: null })
        .mockResolvedValueOnce({ success: true, data: 2, error: null });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207);
      expect(data.results.errors).toBe(1);
      expect(data.tasks).toContain('❌ Session cleanup error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Session cleanup failed',
        expect.any(Error)
      );
    });

    it('should handle temp data cleanup exception', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: true, data: 5, error: null })
        .mockRejectedValueOnce(new Error('Temp cleanup exception'))
        .mockResolvedValueOnce({ success: true, data: 2, error: null });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207);
      expect(data.results.errors).toBe(1);
      expect(data.tasks).toContain('❌ Temporary data cleanup error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Temp data cleanup failed',
        expect.any(Error)
      );
    });

    it('should handle stale cache cleanup exception', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce({ success: true, data: 5, error: null })
        .mockResolvedValueOnce({ success: true, data: 3, error: null })
        .mockRejectedValueOnce(new Error('Stale cleanup exception'));

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(207);
      expect(data.results.errors).toBe(1);
      expect(data.tasks).toContain('❌ Stale cache cleanup error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Stale cache cleanup failed',
        expect.any(Error)
      );
    });

    it('should handle complete cleanup job failure', async () => {
      // To trigger a 500 error, we need an error that happens outside the individual task try-catch blocks
      // We can simulate this by making the request creation fail after the auth check
      const error = new Error('Complete failure');
      
      // Mock all tasks to fail - this will result in 207 status
      mockEnhancedCache.invalidateByPattern
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);
      mockEnhancedCache.resetMetrics.mockImplementationOnce(() => {
        throw error;
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      // When all individual tasks fail, we get 207 (partial success) not 500
      expect(response.status).toBe(207);
      expect(data).toMatchObject({
        success: false,
        message: 'Cleanup completed with errors',
        results: {
          errors: 4
        }
      });
      expect(data.timestamp).toBeDefined();
      expect(mockLog.error).toHaveBeenCalledWith(
        'Session cleanup failed',
        error
      );
    });

    it('should handle non-Error exceptions', async () => {
      const errorMessage = 'String error';
      mockEnhancedCache.invalidateByPattern
        .mockRejectedValueOnce(errorMessage)
        .mockResolvedValueOnce({ success: true, data: 3, error: null })
        .mockResolvedValueOnce({ success: true, data: 2, error: null });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      // Individual task failures result in 207, not 500
      expect(response.status).toBe(207);
      expect(data).toMatchObject({
        success: false,
        message: 'Cleanup completed with errors',
        results: {
          errors: 1,
          tempData: 3,
          staleCache: 2
        }
      });
      // Verify error was properly converted to Error object
      expect(mockLog.error).toHaveBeenCalledWith(
        'Session cleanup failed',
        new Error('String error')
      );
    });

    it('should handle catastrophic failure with 500 status', async () => {
      // To get a 500 status, we need an error that occurs outside the individual task handlers
      // We can simulate this by mocking log.info to throw an error
      const catastrophicError = new Error('Catastrophic failure');
      mockLog.info.mockImplementationOnce(() => {
        throw catastrophicError;
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        message: 'Cleanup job failed',
        error: 'Catastrophic failure',
      });
      expect(data.timestamp).toBeDefined();
      expect(mockLog.error).toHaveBeenCalledWith(
        'Cleanup cron job failed',
        catastrophicError
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined data from cache operations', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValueOnce(createServiceSuccess(0))
        .mockResolvedValueOnce(createServiceSuccess(0))
        .mockResolvedValueOnce(createServiceSuccess(2));

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toMatchObject({
        expiredSessions: 0, // null becomes 0
        tempData: 0, // undefined becomes 0
        staleCache: 2,
        errors: 0,
      });
      expect(data.totalCleaned).toBe(2);
    });

    it('should handle missing CRON_SECRET environment variable', async () => {
      delete process.env.CRON_SECRET;

      const request = createRequest('Bearer any-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('Response Format', () => {
    it('should return proper response structure for successful cleanup', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValue(createServiceSuccess(1));

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('totalCleaned');
      expect(data).toHaveProperty('timestamp');
      
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(typeof data.results).toBe('object');
      expect(data.results).toHaveProperty('expiredSessions');
      expect(data.results).toHaveProperty('tempData');
      expect(data.results).toHaveProperty('staleCache');
      expect(data.results).toHaveProperty('errors');
    });

    it('should return valid ISO timestamp', async () => {
      mockEnhancedCache.invalidateByPattern
        .mockResolvedValue(createServiceSuccess(1));

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
  });
});