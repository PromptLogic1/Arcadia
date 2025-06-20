/**
 * @jest-environment node
 */

// Enhanced Redis Locks Service Tests - Targeting specific uncovered lines

import { redisLocksService } from '../redis-locks.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { DistributedLockOptions } from '../redis-locks.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  eval: jest.fn(),
};

describe('redisLocksService - Enhanced Coverage', () => {
  // Mock window existence tracking
  const originalWindow = (global as any).window;

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    (isRedisConfigured as jest.Mock).mockReturnValue(true);

    // Clear any active locks
    (redisLocksService as any).activeLocks.clear();

    // Forcefully remove window for server-side tests by using defineProperty
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore window state after each test
    if (originalWindow !== undefined) {
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global as any).window;
    }
  });

  describe('client-side environment detection (line 79)', () => {
    it('should reject all operations in browser environment', async () => {
      // Mock window to simulate client-side
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });

      const lockOptions: DistributedLockOptions = {
        id: 'test-lock',
        leaseDuration: 30000,
      };

      // Test acquireLock
      const acquireResult = await redisLocksService.acquireLock(lockOptions);
      expect(acquireResult.success).toBe(false);
      expect(acquireResult.error).toBe(
        'Lock operations are only available on the server'
      );

      // Test releaseLock (line 211)
      const releaseResult = await redisLocksService.releaseLock('test-lock');
      expect(releaseResult.success).toBe(false);
      expect(releaseResult.error).toBe(
        'Lock operations are only available on the server'
      );

      // Test extendLock (line 305)
      const extendResult = await redisLocksService.extendLock(
        'test-lock',
        'holder'
      );
      expect(extendResult.success).toBe(false);
      expect(extendResult.error).toBe(
        'Lock operations are only available on the server'
      );

      // Test getLockStatus (line 401)
      const statusResult = await redisLocksService.getLockStatus('test-lock');
      expect(statusResult.success).toBe(false);
      expect(statusResult.error).toBe(
        'Lock operations are only available on the server'
      );

      // Clean up
      delete (global as any).window;
    });
  });

  describe('Redis not configured scenarios (lines 217-218, 311-312, 407-408)', () => {
    beforeEach(() => {
      (isRedisConfigured as jest.Mock).mockReturnValue(false);
    });

    it('should handle Redis not configured for all operations', async () => {
      // Test releaseLock (lines 217-218)
      const releaseResult = await redisLocksService.releaseLock('test-lock');
      expect(releaseResult.success).toBe(false);
      expect(releaseResult.error).toBe('Lock service unavailable');
      expect(log.warn).toHaveBeenCalledWith(
        'Redis not configured - distributed locks unavailable'
      );

      // Test extendLock (lines 311-312)
      const extendResult = await redisLocksService.extendLock(
        'test-lock',
        'holder'
      );
      expect(extendResult.success).toBe(false);
      expect(extendResult.error).toBe('Lock service unavailable');

      // Test getLockStatus (lines 407-408)
      const statusResult = await redisLocksService.getLockStatus('test-lock');
      expect(statusResult.success).toBe(false);
      expect(statusResult.error).toBe('Lock service unavailable');
    });
  });

  describe('error handling in catch blocks (lines 281-288, 374-381)', () => {
    beforeEach(() => {
      (isRedisConfigured as jest.Mock).mockReturnValue(true);
    });

    it('should handle Redis errors in releaseLock (lines 281-288)', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedis.eval.mockRejectedValueOnce(redisError);

      // Add lock to activeLocks to bypass holder check
      const activeLocks = (redisLocksService as any).activeLocks;
      activeLocks.set('test-lock', {
        holder: 'test-holder',
        expiresAt: Date.now() + 30000,
      });

      const result = await redisLocksService.releaseLock(
        'test-lock',
        'test-holder'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Lock release error',
        redisError,
        expect.objectContaining({
          metadata: { lockId: 'test-lock', holder: 'test-holder' },
        })
      );
    });

    it('should handle non-Error objects in releaseLock (lines 281-288)', async () => {
      mockRedis.eval.mockRejectedValueOnce('String error');

      const activeLocks = (redisLocksService as any).activeLocks;
      activeLocks.set('test-lock', {
        holder: 'test-holder',
        expiresAt: Date.now() + 30000,
      });

      const result = await redisLocksService.releaseLock(
        'test-lock',
        'test-holder'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to release lock');
      expect(log.error).toHaveBeenCalledWith(
        'Lock release error',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle Redis errors in extendLock (lines 374-381)', async () => {
      const redisError = new Error('Redis timeout');
      mockRedis.eval.mockRejectedValueOnce(redisError);

      const result = await redisLocksService.extendLock('test-lock', 'holder');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Lock extension error',
        redisError,
        expect.objectContaining({
          metadata: { lockId: 'test-lock', holder: 'holder' },
        })
      );
    });

    it('should handle non-Error objects in extendLock (lines 374-381)', async () => {
      mockRedis.eval.mockRejectedValueOnce({ message: 'Complex error object' });

      const result = await redisLocksService.extendLock('test-lock', 'holder');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to extend lock');
      expect(log.error).toHaveBeenCalledWith(
        'Lock extension error',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('withLock edge cases (lines 461, 473, 483)', () => {
    it('should handle lock acquisition returning null data (line 461)', async () => {
      mockRedis.set.mockResolvedValueOnce(null);

      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await redisLocksService.withLock('test-lock', mockFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not acquire lock');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should handle lock release failure after successful function execution (line 473)', async () => {
      // Mock successful lock acquisition
      mockRedis.set.mockResolvedValueOnce('OK');

      // Mock lock release failure
      mockRedis.eval.mockRejectedValueOnce(new Error('Release failed'));

      const mockFn = jest.fn().mockResolvedValue('function result');
      const result = await redisLocksService.withLock('test-lock', mockFn);

      expect(result.success).toBe(true);
      expect(result.data).toBe('function result');
      expect(mockFn).toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to release lock after successful execution',
        expect.objectContaining({
          metadata: expect.objectContaining({
            lockId: 'test-lock',
            error: expect.any(String),
          }),
        })
      );
    });

    it('should handle lock release failure after function error (line 483)', async () => {
      // Mock successful lock acquisition
      mockRedis.set.mockResolvedValueOnce('OK');

      // Mock lock release failure
      mockRedis.eval.mockRejectedValueOnce(new Error('Release failed'));

      const functionError = new Error('Function failed');
      const mockFn = jest.fn().mockRejectedValue(functionError);

      const result = await redisLocksService.withLock('test-lock', mockFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Function failed');
      expect(mockFn).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(
        'Failed to release lock after function error',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            lockId: 'test-lock',
          }),
        })
      );
    });
  });

  describe('enableAutoExtend edge cases (lines 514-561)', () => {
    it('should handle lock not found in activeLocks', async () => {
      const result = await redisLocksService.enableAutoExtend(
        'nonexistent-lock',
        'holder'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lock not found or holder mismatch');
    });

    it('should handle holder mismatch', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;
      activeLocks.set('test-lock', {
        holder: 'correct-holder',
        expiresAt: Date.now() + 30000,
      });

      const result = await redisLocksService.enableAutoExtend(
        'test-lock',
        'wrong-holder'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lock not found or holder mismatch');
    });

    it('should clear existing auto-extend before setting new one', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;
      const existingTimeout = setTimeout(() => {}, 1000);

      activeLocks.set('test-lock', {
        holder: 'test-holder',
        expiresAt: Date.now() + 30000,
        autoExtend: existingTimeout,
      });

      jest.spyOn(global, 'clearTimeout');

      const result = await redisLocksService.enableAutoExtend(
        'test-lock',
        'test-holder'
      );

      expect(result.success).toBe(true);
      expect(clearTimeout).toHaveBeenCalledWith(existingTimeout);
    });

    it('should handle auto-extension failure and cleanup lock', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;
      const now = Date.now();

      activeLocks.set('test-lock', {
        holder: 'test-holder',
        expiresAt: now + 100, // Very short expiry for quick test
      });

      // Mock extension failure
      mockRedis.eval.mockResolvedValueOnce(0); // Extension failed

      await redisLocksService.enableAutoExtend(
        'test-lock',
        'test-holder',
        10000
      );

      // Wait for auto-extension to trigger
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(activeLocks.has('test-lock')).toBe(false);
      expect(log.warn).toHaveBeenCalledWith(
        'Auto-extension failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            lockId: 'test-lock',
            holder: 'test-holder',
          }),
        })
      );
    });

    it('should handle errors in auto-extend setup (lines 554-561)', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;

      // Create a lock that will cause an error in timeToExtension calculation
      const mockLock = {
        holder: 'test-holder',
        get expiresAt() {
          throw new Error('Property access error');
        },
      };

      activeLocks.set('test-lock', mockLock);

      const result = await redisLocksService.enableAutoExtend(
        'test-lock',
        'test-holder'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property access error');
      expect(log.error).toHaveBeenCalledWith(
        'Auto-extend setup error',
        expect.any(Error),
        expect.objectContaining({
          metadata: { lockId: 'test-lock', holder: 'test-holder' },
        })
      );
    });

    it('should handle non-Error objects in auto-extend setup', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;

      // Create a lock that will cause a non-Error to be thrown
      const mockLock = {
        holder: 'test-holder',
        get expiresAt() {
          throw 'String error in property access';
        },
      };

      activeLocks.set('test-lock', mockLock);

      const result = await redisLocksService.enableAutoExtend(
        'test-lock',
        'test-holder'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to enable auto-extend');
      expect(log.error).toHaveBeenCalledWith(
        'Auto-extend setup error',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('cleanupExpiredLocks error handling (lines 592-596)', () => {
    it('should handle errors during cleanup', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;

      // Create a corrupted lock entry that will cause an error
      Object.defineProperty(activeLocks, 'entries', {
        value: () => {
          throw new Error('Iterator error');
        },
        configurable: true,
      });

      const result = await redisLocksService.cleanupExpiredLocks();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Iterator error');
      expect(log.error).toHaveBeenCalledWith(
        'Lock cleanup error',
        expect.any(Error)
      );
    });

    it('should handle non-Error objects during cleanup', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;

      // Create a corrupted lock entry that will throw a non-Error
      Object.defineProperty(activeLocks, 'entries', {
        value: () => {
          throw 'String error in iterator';
        },
        configurable: true,
      });

      const result = await redisLocksService.cleanupExpiredLocks();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to cleanup expired locks');
      expect(log.error).toHaveBeenCalledWith(
        'Lock cleanup error',
        expect.any(Error)
      );
    });
  });

  describe('edge cases in successful paths', () => {
    it('should handle successful auto-extension and schedule next extension', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;
      const now = Date.now();

      activeLocks.set('test-lock', {
        holder: 'test-holder',
        expiresAt: now + 200, // Short expiry for quick test
      });

      // Mock successful extension
      mockRedis.eval.mockResolvedValue(1); // Extension succeeded

      await redisLocksService.enableAutoExtend(
        'test-lock',
        'test-holder',
        30000
      );

      // Wait for auto-extension to trigger
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(log.debug).toHaveBeenCalledWith(
        'Auto-extended lock',
        expect.objectContaining({
          metadata: expect.objectContaining({
            lockId: 'test-lock',
            holder: 'test-holder',
            extensionTime: 30000,
          }),
        })
      );
    });

    it('should handle zero or negative timeToExtension in auto-extend', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;
      const now = Date.now();

      activeLocks.set('test-lock', {
        holder: 'test-holder',
        expiresAt: now - 1000, // Already expired
      });

      const result = await redisLocksService.enableAutoExtend(
        'test-lock',
        'test-holder'
      );

      expect(result.success).toBe(true);
      // No timeout should be set for expired locks
    });
  });
});
