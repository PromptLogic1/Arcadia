/**
 * Redis Distributed Locks Service
 *
 * Provides distributed locking capabilities using Redis for coordination across
 * multiple instances and processes. Includes lock management, automatic expiration,
 * and lease extension functionality.
 */

import {
  getRedisClient,
  createRedisKey,
  REDIS_PREFIXES,
  isRedisConfigured,
} from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { z } from 'zod';

// Validation schemas
const lockConfigSchema = z.object({
  id: z.string().min(1),
  leaseDuration: z.number().min(1000).max(300000).default(30000), // 30 seconds default, max 5 minutes
  retryAttempts: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(100).max(5000).default(500), // 500ms default
});

const _lockResultSchema = z.object({
  acquired: z.boolean(),
  lockId: z.string(),
  expiresAt: z.number().optional(),
  holder: z.string().optional(),
});

export type LockConfig = z.infer<typeof lockConfigSchema>;
export type LockResult = z.infer<typeof _lockResultSchema>;

// Constants
export const LOCK_CONSTANTS = {
  DEFAULT_LEASE: 30000, // 30 seconds
  MAX_LEASE: 300000, // 5 minutes
  MIN_LEASE: 1000, // 1 second
  EXTEND_THRESHOLD: 0.8, // Extend when 80% of lease has elapsed
  CLEANUP_INTERVAL: 60000, // 1 minute
} as const;

export interface DistributedLockOptions {
  id: string;
  leaseDuration?: number;
  retryAttempts?: number;
  retryDelay?: number;
  holder?: string; // Instance identifier
}

export interface LockExtensionOptions {
  additionalTime?: number;
  newLeaseDuration?: number;
}

class RedisLocksService {
  private activeLocks = new Map<
    string,
    {
      holder: string;
      expiresAt: number;
      autoExtend?: NodeJS.Timeout;
    }
  >();

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    options: DistributedLockOptions
  ): Promise<ServiceResponse<LockResult>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'Lock operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - distributed locks unavailable');
        return createServiceError('Lock service unavailable');
      }

      const config = lockConfigSchema.parse(options);
      const redis = getRedisClient();

      const lockKey = createRedisKey(
        REDIS_PREFIXES.QUEUE, // Reusing queue prefix for locks
        'lock',
        config.id
      );

      const holder =
        options.holder ||
        `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = Date.now() + config.leaseDuration;

      for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
        try {
          // Try to acquire lock with SET NX EX (atomic operation)
          const result = await redis.set(
            lockKey,
            JSON.stringify({
              holder,
              acquiredAt: Date.now(),
              expiresAt,
            }),
            {
              ex: Math.ceil(config.leaseDuration / 1000),
              nx: true,
            }
          );

          if (result === 'OK') {
            // Lock acquired successfully
            this.activeLocks.set(config.id, {
              holder,
              expiresAt,
            });

            log.info('Distributed lock acquired', {
              metadata: {
                lockId: config.id,
                holder,
                leaseDuration: config.leaseDuration,
                attempt: attempt + 1,
              },
            });

            return createServiceSuccess({
              acquired: true,
              lockId: config.id,
              expiresAt,
              holder,
            });
          }

          // Lock is already held, check if we should retry
          if (attempt < config.retryAttempts) {
            log.debug('Lock acquisition failed, retrying', {
              metadata: {
                lockId: config.id,
                attempt: attempt + 1,
                maxAttempts: config.retryAttempts + 1,
              },
            });

            // Wait before retrying with exponential backoff
            const delay = config.retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (redisError) {
          log.debug('Redis error during lock acquisition', {
            metadata: {
              lockId: config.id,
              attempt: attempt + 1,
              error:
                redisError instanceof Error
                  ? redisError.message
                  : String(redisError),
            },
          });

          if (attempt === config.retryAttempts) {
            throw redisError;
          }
        }
      }

      // All retry attempts exhausted
      log.warn('Failed to acquire lock after all retries', {
        metadata: {
          lockId: config.id,
          attempts: config.retryAttempts + 1,
          holder,
        },
      });

      return createServiceSuccess({
        acquired: false,
        lockId: config.id,
      });
    } catch (error) {
      log.debug('Lock acquisition error', {
        metadata: {
          lockId: options.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to acquire lock'
      );
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(
    lockId: string,
    holder?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'Lock operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - distributed locks unavailable');
        return createServiceError('Lock service unavailable');
      }

      const redis = getRedisClient();
      const lockKey = createRedisKey(REDIS_PREFIXES.QUEUE, 'lock', lockId);

      // Lua script for atomic lock release with holder verification
      const releaseScript = `
        local lockKey = KEYS[1]
        local expectedHolder = ARGV[1]
        
        local lockValue = redis.call('GET', lockKey)
        if not lockValue then
          return 0  -- Lock doesn't exist
        end
        
        local lockData = cjson.decode(lockValue)
        if lockData.holder == expectedHolder then
          redis.call('DEL', lockKey)
          return 1  -- Successfully released
        else
          return -1  -- Wrong holder
        end
      `;

      const activeLock = this.activeLocks.get(lockId);
      const expectedHolder = holder || activeLock?.holder;

      if (!expectedHolder) {
        return createServiceError(
          'Lock holder not specified and not found in active locks'
        );
      }

      const result = (await redis.eval(
        releaseScript,
        [lockKey],
        [expectedHolder]
      )) as number;

      // Clean up auto-extend timer if exists
      if (activeLock?.autoExtend) {
        clearTimeout(activeLock.autoExtend);
      }
      this.activeLocks.delete(lockId);

      if (result === 1) {
        log.info('Distributed lock released', {
          metadata: { lockId, holder: expectedHolder },
        });
        return createServiceSuccess(true);
      } else if (result === 0) {
        log.warn('Attempted to release non-existent lock', {
          metadata: { lockId, holder: expectedHolder },
        });
        return createServiceSuccess(false);
      } else {
        log.warn('Attempted to release lock held by different holder', {
          metadata: { lockId, expectedHolder },
        });
        return createServiceError('Lock is held by a different holder');
      }
    } catch (error) {
      log.error(
        'Lock release error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { lockId, holder },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to release lock'
      );
    }
  }

  /**
   * Extend a lock's lease duration
   */
  async extendLock(
    lockId: string,
    holder: string,
    options: LockExtensionOptions = {}
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'Lock operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - distributed locks unavailable');
        return createServiceError('Lock service unavailable');
      }

      const redis = getRedisClient();
      const lockKey = createRedisKey(REDIS_PREFIXES.QUEUE, 'lock', lockId);

      const extensionTime =
        options.additionalTime ||
        options.newLeaseDuration ||
        LOCK_CONSTANTS.DEFAULT_LEASE;

      // Lua script for atomic lock extension with holder verification
      const extendScript = `
        local lockKey = KEYS[1]
        local expectedHolder = ARGV[1]
        local newTtl = tonumber(ARGV[2])
        
        local lockValue = redis.call('GET', lockKey)
        if not lockValue then
          return 0  -- Lock doesn't exist
        end
        
        local lockData = cjson.decode(lockValue)
        if lockData.holder == expectedHolder then
          local newExpiresAt = redis.call('TIME')[1] * 1000 + newTtl
          lockData.expiresAt = newExpiresAt
          redis.call('SET', lockKey, cjson.encode(lockData), 'EX', math.ceil(newTtl / 1000))
          return 1  -- Successfully extended
        else
          return -1  -- Wrong holder
        end
      `;

      const result = (await redis.eval(
        extendScript,
        [lockKey],
        [holder, extensionTime.toString()]
      )) as number;

      if (result === 1) {
        // Update local tracking
        const activeLock = this.activeLocks.get(lockId);
        if (activeLock) {
          activeLock.expiresAt = Date.now() + extensionTime;
        }

        log.debug('Lock extended successfully', {
          metadata: { lockId, holder, extensionTime },
        });
        return createServiceSuccess(true);
      } else if (result === 0) {
        log.warn('Attempted to extend non-existent lock', {
          metadata: { lockId, holder },
        });
        return createServiceSuccess(false);
      } else {
        log.warn('Attempted to extend lock held by different holder', {
          metadata: { lockId, holder },
        });
        return createServiceError('Lock is held by a different holder');
      }
    } catch (error) {
      log.error(
        'Lock extension error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { lockId, holder },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to extend lock'
      );
    }
  }

  /**
   * Check if a lock exists and get its status
   */
  async getLockStatus(lockId: string): Promise<
    ServiceResponse<{
      exists: boolean;
      holder?: string;
      expiresAt?: number;
      timeRemaining?: number;
    }>
  > {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'Lock operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - distributed locks unavailable');
        return createServiceError('Lock service unavailable');
      }

      const redis = getRedisClient();
      const lockKey = createRedisKey(REDIS_PREFIXES.QUEUE, 'lock', lockId);

      const lockValue = await redis.get(lockKey);

      if (!lockValue) {
        return createServiceSuccess({
          exists: false,
        });
      }

      const lockData = JSON.parse(lockValue as string);
      const timeRemaining = Math.max(0, lockData.expiresAt - Date.now());

      return createServiceSuccess({
        exists: true,
        holder: lockData.holder,
        expiresAt: lockData.expiresAt,
        timeRemaining,
      });
    } catch (error) {
      log.error(
        'Lock status check error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { lockId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to check lock status'
      );
    }
  }

  /**
   * Execute a function with automatic lock management
   */
  async withLock<T>(
    lockId: string,
    fn: () => Promise<T>,
    options: DistributedLockOptions = { id: lockId }
  ): Promise<ServiceResponse<T>> {
    const lockOptions = { ...options, id: lockId };
    const lockResult = await this.acquireLock(lockOptions);

    if (!lockResult.success) {
      return createServiceError(lockResult.error || 'Failed to acquire lock');
    }

    if (!lockResult.data || !lockResult.data.acquired) {
      return createServiceError('Could not acquire lock');
    }

    const holder = lockResult.data.holder;

    try {
      // Execute the function
      const result = await fn();

      // Release the lock
      const releaseResult = await this.releaseLock(lockId, holder);
      if (!releaseResult.success) {
        log.warn('Failed to release lock after successful execution', {
          metadata: { lockId, holder, error: releaseResult.error },
        });
      }

      return createServiceSuccess(result);
    } catch (error) {
      // Ensure lock is released even if function fails
      const releaseResult = await this.releaseLock(lockId, holder);
      if (!releaseResult.success) {
        log.error(
          'Failed to release lock after function error',
          new Error(releaseResult.error || 'Release failed'),
          {
            metadata: { lockId, holder },
          }
        );
      }

      log.error(
        'Function execution failed in withLock',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { lockId },
        }
      );

      return createServiceError(
        error instanceof Error ? error.message : 'Function execution failed'
      );
    }
  }

  /**
   * Enable automatic lock extension for a lock
   */
  async enableAutoExtend(
    lockId: string,
    holder: string,
    extensionTime: number = LOCK_CONSTANTS.DEFAULT_LEASE
  ): Promise<ServiceResponse<void>> {
    try {
      const activeLock = this.activeLocks.get(lockId);
      if (!activeLock || activeLock.holder !== holder) {
        return createServiceError('Lock not found or holder mismatch');
      }

      // Clear existing auto-extend if any
      if (activeLock.autoExtend) {
        clearTimeout(activeLock.autoExtend);
      }

      const scheduleExtension = () => {
        const timeToExtension =
          (activeLock.expiresAt - Date.now()) * LOCK_CONSTANTS.EXTEND_THRESHOLD;

        if (timeToExtension > 0) {
          activeLock.autoExtend = setTimeout(async () => {
            const extendResult = await this.extendLock(lockId, holder, {
              additionalTime: extensionTime,
            });

            if (extendResult.success && extendResult.data) {
              log.debug('Auto-extended lock', {
                metadata: { lockId, holder, extensionTime },
              });
              scheduleExtension(); // Schedule next extension
            } else {
              log.warn('Auto-extension failed', {
                metadata: { lockId, holder, error: extendResult.error },
              });
              this.activeLocks.delete(lockId);
            }
          }, timeToExtension);
        }
      };

      scheduleExtension();

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Auto-extend setup error',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { lockId, holder },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to enable auto-extend'
      );
    }
  }

  /**
   * Clean up expired locks and local tracking
   */
  async cleanupExpiredLocks(): Promise<ServiceResponse<number>> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean up local tracking
      for (const [lockId, lock] of this.activeLocks.entries()) {
        if (lock.expiresAt <= now) {
          if (lock.autoExtend) {
            clearTimeout(lock.autoExtend);
          }
          this.activeLocks.delete(lockId);
          cleanedCount++;
        }
      }

      log.debug('Cleaned up expired locks from local tracking', {
        metadata: { cleanedCount },
      });

      return createServiceSuccess(cleanedCount);
    } catch (error) {
      log.error(
        'Lock cleanup error',
        error instanceof Error ? error : new Error(String(error))
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to cleanup expired locks'
      );
    }
  }

  /**
   * Get all active locks managed by this instance
   */
  getActiveLocks(): Record<string, { holder: string; expiresAt: number }> {
    const result: Record<string, { holder: string; expiresAt: number }> = {};

    for (const [lockId, lock] of this.activeLocks.entries()) {
      result[lockId] = {
        holder: lock.holder,
        expiresAt: lock.expiresAt,
      };
    }

    return result;
  }
}

// Export singleton instance
export const redisLocksService = new RedisLocksService();
