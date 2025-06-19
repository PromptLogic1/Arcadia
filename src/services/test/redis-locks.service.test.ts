/**
 * @jest-environment node
 */

import { redisLocksService } from '../redis-locks.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type {
  DistributedLockOptions,
  LockExtensionOptions,
} from '../redis-locks.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  eval: jest.fn(),
};

describe('redisLocksService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    (isRedisConfigured as jest.Mock).mockReturnValue(true);

    // Clear any active locks
    (redisLocksService as any).activeLocks.clear();
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully on first attempt', async () => {
      const options: DistributedLockOptions = {
        id: 'test-lock-1',
        leaseDuration: 30000,
        retryAttempts: 3,
        retryDelay: 500,
        holder: 'test-holder',
      };

      mockRedis.set.mockResolvedValueOnce('OK');

      const result = await redisLocksService.acquireLock(options);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        acquired: true,
        lockId: 'test-lock-1',
        holder: 'test-holder',
        expiresAt: expect.any(Number),
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('test-lock-1'),
        expect.stringContaining('test-holder'),
        expect.objectContaining({
          ex: 30,
          nx: true,
        })
      );
      expect(log.info).toHaveBeenCalledWith(
        'Distributed lock acquired',
        expect.objectContaining({
          metadata: expect.objectContaining({
            lockId: 'test-lock-1',
            holder: 'test-holder',
          }),
        })
      );
    });

    it('should retry lock acquisition on failure', async () => {
      const options: DistributedLockOptions = {
        id: 'test-lock-2',
        leaseDuration: 30000,
        retryAttempts: 2,
        retryDelay: 100,
      };

      // First two attempts fail, third succeeds
      mockRedis.set
        .mockResolvedValueOnce(null) // First attempt fails
        .mockResolvedValueOnce(null) // Second attempt fails
        .mockResolvedValueOnce('OK'); // Third attempt succeeds

      const result = await redisLocksService.acquireLock(options);

      expect(result.success).toBe(true);
      expect(result.data?.acquired).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledTimes(3);
      expect(log.debug).toHaveBeenCalledWith(
        'Lock acquisition failed, retrying',
        expect.any(Object)
      );
    });

    it('should fail after all retry attempts exhausted', async () => {
      const options: DistributedLockOptions = {
        id: 'test-lock-3',
        leaseDuration: 30000,
        retryAttempts: 1,
        retryDelay: 100,
      };

      mockRedis.set.mockResolvedValue(null); // All attempts fail

      const result = await redisLocksService.acquireLock(options);

      expect(result.success).toBe(true);
      expect(result.data?.acquired).toBe(false);
      expect(mockRedis.set).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to acquire lock after all retries',
        expect.any(Object)
      );
    });

    it('should handle Redis configuration not available', async () => {
      (isRedisConfigured as jest.Mock).mockReturnValue(false);

      const result = await redisLocksService.acquireLock({
        id: 'test-lock-4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lock service unavailable');
      expect(log.warn).toHaveBeenCalledWith(
        'Redis not configured - distributed locks unavailable'
      );
    });

    it('should handle Redis errors', async () => {
      const options: DistributedLockOptions = {
        id: 'test-lock-5',
        retryAttempts: 0,
      };

      mockRedis.set.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await redisLocksService.acquireLock(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis connection failed');
      expect(log.debug).toHaveBeenCalledWith(
        'Lock acquisition error',
        expect.any(Object)
      );
    });

    it('should generate holder if not provided', async () => {
      const options: DistributedLockOptions = {
        id: 'test-lock-6',
      };

      mockRedis.set.mockResolvedValueOnce('OK');

      const result = await redisLocksService.acquireLock(options);

      expect(result.success).toBe(true);
      expect(result.data?.holder).toMatch(/^instance-\d+-[a-z0-9]{9}$/);
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      const lockId = 'test-lock-1';
      const holder = 'test-holder';

      // Mock successful release (lua script returns 1)
      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisLocksService.releaseLock(lockId, holder);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('lockData.holder == expectedHolder'),
        expect.arrayContaining([expect.stringContaining(lockId)]),
        expect.arrayContaining([holder])
      );
      expect(log.info).toHaveBeenCalledWith(
        'Distributed lock released',
        expect.objectContaining({
          metadata: { lockId, holder },
        })
      );
    });

    it('should handle non-existent lock', async () => {
      const lockId = 'nonexistent-lock';
      const holder = 'test-holder';

      // Mock lock doesn't exist (lua script returns 0)
      mockRedis.eval.mockResolvedValueOnce(0);

      const result = await redisLocksService.releaseLock(lockId, holder);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(log.warn).toHaveBeenCalledWith(
        'Attempted to release non-existent lock',
        expect.objectContaining({
          metadata: { lockId, holder },
        })
      );
    });

    it('should handle wrong holder', async () => {
      const lockId = 'test-lock-1';
      const holder = 'wrong-holder';

      // Mock wrong holder (lua script returns -1)
      mockRedis.eval.mockResolvedValueOnce(-1);

      const result = await redisLocksService.releaseLock(lockId, holder);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lock is held by a different holder');
      expect(log.warn).toHaveBeenCalledWith(
        'Attempted to release lock held by different holder',
        expect.any(Object)
      );
    });

    it('should use active lock holder if not provided', async () => {
      const lockId = 'test-lock-1';

      // Set up an active lock
      const activeLocks = (redisLocksService as any).activeLocks;
      activeLocks.set(lockId, {
        holder: 'active-holder',
        expiresAt: Date.now() + 30000,
      });

      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisLocksService.releaseLock(lockId);

      expect(result.success).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.arrayContaining(['active-holder'])
      );
    });

    it('should handle missing holder', async () => {
      const lockId = 'test-lock-1';

      const result = await redisLocksService.releaseLock(lockId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Lock holder not specified and not found in active locks'
      );
    });

    it('should clean up auto-extend timer', async () => {
      const lockId = 'test-lock-1';
      const holder = 'test-holder';

      // Set up an active lock with auto-extend timer
      const mockTimeout = setTimeout(() => {}, 1000);
      const activeLocks = (redisLocksService as any).activeLocks;
      activeLocks.set(lockId, {
        holder,
        expiresAt: Date.now() + 30000,
        autoExtend: mockTimeout,
      });

      jest.spyOn(global, 'clearTimeout');
      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisLocksService.releaseLock(lockId, holder);

      expect(result.success).toBe(true);
      expect(clearTimeout).toHaveBeenCalledWith(mockTimeout);
      expect(activeLocks.has(lockId)).toBe(false);
    });
  });

  describe('extendLock', () => {
    it('should extend lock successfully', async () => {
      const lockId = 'test-lock-1';
      const holder = 'test-holder';
      const options: LockExtensionOptions = {
        additionalTime: 30000,
      };

      // Mock successful extension (lua script returns 1)
      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisLocksService.extendLock(
        lockId,
        holder,
        options
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('lockData.holder == expectedHolder'),
        expect.arrayContaining([expect.stringContaining(lockId)]),
        expect.arrayContaining([holder, '30000'])
      );
      expect(log.debug).toHaveBeenCalledWith(
        'Lock extended successfully',
        expect.objectContaining({
          metadata: { lockId, holder, extensionTime: 30000 },
        })
      );
    });

    it('should handle non-existent lock during extension', async () => {
      const lockId = 'nonexistent-lock';
      const holder = 'test-holder';

      // Mock lock doesn't exist (lua script returns 0)
      mockRedis.eval.mockResolvedValueOnce(0);

      const result = await redisLocksService.extendLock(lockId, holder);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(log.warn).toHaveBeenCalledWith(
        'Attempted to extend non-existent lock',
        expect.objectContaining({
          metadata: { lockId, holder },
        })
      );
    });

    it('should handle wrong holder during extension', async () => {
      const lockId = 'test-lock-1';
      const holder = 'wrong-holder';

      // Mock wrong holder (lua script returns -1)
      mockRedis.eval.mockResolvedValueOnce(-1);

      const result = await redisLocksService.extendLock(lockId, holder);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lock is held by a different holder');
    });

    it('should update active lock tracking on successful extension', async () => {
      const lockId = 'test-lock-1';
      const holder = 'test-holder';

      // Set up an active lock
      const activeLocks = (redisLocksService as any).activeLocks;
      const originalExpiresAt = Date.now() + 10000;
      activeLocks.set(lockId, {
        holder,
        expiresAt: originalExpiresAt,
      });

      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisLocksService.extendLock(lockId, holder, {
        additionalTime: 30000,
      });

      expect(result.success).toBe(true);
      const updatedLock = activeLocks.get(lockId);
      expect(updatedLock?.expiresAt).toBeGreaterThan(originalExpiresAt);
    });
  });

  describe('getLockStatus', () => {
    it('should return lock status when lock exists', async () => {
      const lockId = 'test-lock-1';
      const lockData = {
        holder: 'test-holder',
        acquiredAt: Date.now() - 10000,
        expiresAt: Date.now() + 20000,
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(lockData));

      const result = await redisLocksService.getLockStatus(lockId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        exists: true,
        holder: 'test-holder',
        expiresAt: lockData.expiresAt,
        timeRemaining: expect.any(Number),
      });
      expect(result.data?.timeRemaining).toBeGreaterThan(0);
    });

    it('should return false when lock does not exist', async () => {
      const lockId = 'nonexistent-lock';

      mockRedis.get.mockResolvedValueOnce(null);

      const result = await redisLocksService.getLockStatus(lockId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        exists: false,
      });
    });

    it('should handle Redis errors during status check', async () => {
      const lockId = 'test-lock-1';

      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisLocksService.getLockStatus(lockId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(log.error).toHaveBeenCalledWith(
        'Lock status check error',
        expect.any(Error),
        expect.objectContaining({
          metadata: { lockId },
        })
      );
    });
  });

  describe('withLock', () => {
    it('should execute function with automatic lock management', async () => {
      const lockId = 'test-lock-1';
      const testFunction = jest.fn().mockResolvedValue('success result');

      // Mock successful lock acquisition
      jest.spyOn(redisLocksService, 'acquireLock').mockResolvedValueOnce({
        success: true,
        data: {
          acquired: true,
          lockId,
          holder: 'test-holder',
          expiresAt: Date.now() + 30000,
        },
        error: null,
      });

      // Mock successful lock release
      jest.spyOn(redisLocksService, 'releaseLock').mockResolvedValueOnce({
        success: true,
        data: true,
        error: null,
      });

      const result = await redisLocksService.withLock(lockId, testFunction);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success result');
      expect(testFunction).toHaveBeenCalledTimes(1);
      expect(redisLocksService.acquireLock).toHaveBeenCalledWith({
        id: lockId,
      });
      expect(redisLocksService.releaseLock).toHaveBeenCalledWith(
        lockId,
        'test-holder'
      );
    });

    it('should handle lock acquisition failure', async () => {
      const lockId = 'test-lock-1';
      const testFunction = jest.fn();

      jest.spyOn(redisLocksService, 'acquireLock').mockResolvedValueOnce({
        success: false,
        error: 'Lock acquisition failed',
        data: null,
      });

      const result = await redisLocksService.withLock(lockId, testFunction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lock acquisition failed');
      expect(testFunction).not.toHaveBeenCalled();
    });

    it('should handle function execution failure and still release lock', async () => {
      const lockId = 'test-lock-1';
      const testFunction = jest
        .fn()
        .mockRejectedValue(new Error('Function failed'));

      jest.spyOn(redisLocksService, 'acquireLock').mockResolvedValueOnce({
        success: true,
        data: {
          acquired: true,
          lockId,
          holder: 'test-holder',
          expiresAt: Date.now() + 30000,
        },
        error: null,
      });

      jest.spyOn(redisLocksService, 'releaseLock').mockResolvedValueOnce({
        success: true,
        data: true,
        error: null,
      });

      const result = await redisLocksService.withLock(lockId, testFunction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Function failed');
      expect(testFunction).toHaveBeenCalledTimes(1);
      expect(redisLocksService.releaseLock).toHaveBeenCalledWith(
        lockId,
        'test-holder'
      );
      expect(log.error).toHaveBeenCalledWith(
        'Function execution failed in withLock',
        expect.any(Error),
        expect.objectContaining({
          metadata: { lockId },
        })
      );
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should clean up expired locks from local tracking', async () => {
      const activeLocks = (redisLocksService as any).activeLocks;
      const now = Date.now();

      // Add some locks - some expired, some active
      activeLocks.set('expired-1', {
        holder: 'holder-1',
        expiresAt: now - 10000, // Expired
        autoExtend: setTimeout(() => {}, 1000),
      });
      activeLocks.set('expired-2', {
        holder: 'holder-2',
        expiresAt: now - 5000, // Expired
      });
      activeLocks.set('active-1', {
        holder: 'holder-3',
        expiresAt: now + 30000, // Active
      });

      jest.spyOn(global, 'clearTimeout');

      const result = await redisLocksService.cleanupExpiredLocks();

      expect(result.success).toBe(true);
      expect(result.data).toBe(2); // 2 expired locks cleaned up
      expect(activeLocks.size).toBe(1); // Only active lock remains
      expect(activeLocks.has('active-1')).toBe(true);
      expect(clearTimeout).toHaveBeenCalledTimes(1); // Clear auto-extend timer
      expect(log.debug).toHaveBeenCalledWith(
        'Cleaned up expired locks from local tracking',
        expect.objectContaining({
          metadata: { cleanedCount: 2 },
        })
      );
    });
  });

  describe('getActiveLocks', () => {
    it('should return all active locks', () => {
      const activeLocks = (redisLocksService as any).activeLocks;

      activeLocks.set('lock-1', {
        holder: 'holder-1',
        expiresAt: Date.now() + 30000,
        autoExtend: setTimeout(() => {}, 1000),
      });
      activeLocks.set('lock-2', {
        holder: 'holder-2',
        expiresAt: Date.now() + 60000,
      });

      const result = redisLocksService.getActiveLocks();

      expect(result).toEqual({
        'lock-1': {
          holder: 'holder-1',
          expiresAt: expect.any(Number),
        },
        'lock-2': {
          holder: 'holder-2',
          expiresAt: expect.any(Number),
        },
      });
    });

    it('should return empty object when no active locks', () => {
      const result = redisLocksService.getActiveLocks();

      expect(result).toEqual({});
    });
  });
});
