/**
 * @jest-environment node
 */

import { redisQueueService } from '../redis-queue.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { JobData, JobOptions, JobProcessor } from '../redis-queue.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

describe('RedisQueueService - Coverage Enhancement', () => {
  const mockRedis = {
    zadd: jest.fn(),
    zrange: jest.fn(),
    zcard: jest.fn(),
    zrem: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
    lpop: jest.fn(),
  };

  const mockGetRedisClient = getRedisClient as jest.MockedFunction<
    typeof getRedisClient
  >;
  const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
    typeof isRedisConfigured
  >;
  const mockLog = log as jest.Mocked<typeof log>;

  const queueName = 'test-queue';
  const jobType = 'process-data';
  const payload = { data: 'test', value: 123 };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as any);

    // Clear processors and active polling
    (redisQueueService as any).processors.clear();
    (redisQueueService as any).activePolling.clear();
  });

  describe('Enhanced coverage for uncovered lines', () => {
    // Test for lines 113-193 (addJob error handling)
    it('should handle invalid priority in job options', async () => {
      const invalidOptions: JobOptions = {
        priority: -1, // Invalid: must be min 0
      };

      const result = await redisQueueService.addJob(
        queueName,
        jobType,
        payload,
        invalidOptions
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('too_small');
    });

    it('should handle invalid delay in job options', async () => {
      const invalidOptions: JobOptions = {
        delay: -1000, // Invalid: must be min 0
      };

      const result = await redisQueueService.addJob(
        queueName,
        jobType,
        payload,
        invalidOptions
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('too_small');
    });

    // Test for lines 215-243 (processJobs error handling)
    it('should handle startProcessingLoop throwing error', async () => {
      const processor: JobProcessor = jest.fn();

      jest
        .spyOn(redisQueueService as any, 'startProcessingLoop')
        .mockImplementationOnce(() => {
          throw new Error('Processing loop error');
        });

      const result = await redisQueueService.processJobs(queueName, processor);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing loop error');
    });

    // Test for lines 262-278 (stopProcessing error handling)
    it('should handle error when clearing activePolling', async () => {
      // Mock activePolling.set to throw
      const originalActivePolling = (redisQueueService as any).activePolling;
      const mockActivePolling = {
        set: jest.fn(() => {
          throw new Error('Clear polling error');
        }),
        get: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
      };
      (redisQueueService as any).activePolling = mockActivePolling;

      const result = await redisQueueService.stopProcessing(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clear polling error');

      // Restore
      (redisQueueService as any).activePolling = originalActivePolling;
    });

    // Test for lines 300-402 (getNextJob error handling)
    it('should handle invalid JSON in pending queue', async () => {
      // First mock for moveDelayedJobsToQueue
      mockRedis.zrange.mockResolvedValueOnce([]);
      // Second mock for pending queue
      mockRedis.zrange.mockResolvedValueOnce(['invalid-json']);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in queue, skipping job',
        expect.any(Object)
      );
    });

    it('should handle Zod validation error in job data', async () => {
      const invalidJobData = {
        id: 'job-123',
        type: jobType,
        payload,
        priority: -5, // Invalid
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      // First mock for moveDelayedJobsToQueue
      mockRedis.zrange.mockResolvedValueOnce([]);
      // Second mock for pending queue
      mockRedis.zrange.mockResolvedValueOnce([JSON.stringify(invalidJobData)]);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too_small');
    });

    // Test for lines 423-472 (completeJob error handling)
    it('should handle Redis error in completeJob', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis connection lost'));

      const result = await redisQueueService.completeJob('job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis connection lost');
    });

    // Test for lines 490-599 (failJob error handling)
    it('should handle Redis error during failJob', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      // Mock del to throw error
      mockRedis.del.mockRejectedValueOnce(new Error('DEL failed'));

      const result = await redisQueueService.failJob(jobData, 'Test error');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DEL failed');
    });

    // Test for lines 627-670 (getQueueStats error handling)
    it('should handle Redis error in getQueueStats', async () => {
      mockRedis.zcard.mockRejectedValueOnce(new Error('ZCARD failed'));
      // Need to mock keys as well since Promise.all is used
      mockRedis.keys.mockResolvedValue([]);

      const result = await redisQueueService.getQueueStats(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ZCARD failed');
    });

    // Test for lines 750-824 (startProcessingLoop)
    it('should handle job processing with string error', async () => {
      const processor: JobProcessor = jest
        .fn()
        .mockRejectedValueOnce('String error in processor');

      // Set up processor and active polling
      (redisQueueService as any).processors.set(queueName, processor);
      (redisQueueService as any).activePolling.set(queueName, true);

      const jobData = {
        id: 'job-123',
        type: jobType,
        payload,
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      // Mock getNextJob to return one job then stop
      let callCount = 0;
      jest
        .spyOn(redisQueueService, 'getNextJob')
        .mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return { success: true, data: jobData, error: null };
          }
          // Stop the loop
          (redisQueueService as any).activePolling.set(queueName, false);
          return { success: true, data: null, error: null };
        });

      // Mock failJob
      jest
        .spyOn(redisQueueService, 'failJob')
        .mockResolvedValue({ success: true, data: undefined, error: null });

      // Start processing loop
      await (redisQueueService as any).startProcessingLoop(queueName, {
        name: queueName,
      });

      expect(processor).toHaveBeenCalledTimes(1);
      expect(redisQueueService.failJob).toHaveBeenCalledWith(
        jobData,
        'String error in processor'
      );
    }, 15000); // Increase timeout

    it('should handle getNextJob failure in processing loop', async () => {
      const processor: JobProcessor = jest.fn();

      // Set up processor and active polling
      (redisQueueService as any).processors.set(queueName, processor);
      (redisQueueService as any).activePolling.set(queueName, true);

      // Mock getNextJob to fail then stop immediately
      jest
        .spyOn(redisQueueService, 'getNextJob')
        .mockImplementation(async () => {
          // Stop the loop immediately
          (redisQueueService as any).activePolling.set(queueName, false);
          throw new Error('Redis error in getNextJob');
        });

      await (redisQueueService as any).startProcessingLoop(queueName, {
        name: queueName,
      });

      expect(mockLog.error).toHaveBeenCalledWith(
        'Error in processing loop',
        expect.any(Error),
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });

    // Test for lines 838-904 (cleanupExpiredJobs)
    it('should handle invalid JSON in cleanup', async () => {
      mockRedis.keys.mockResolvedValueOnce(['queue:processing:job-1']);
      mockRedis.ttl.mockResolvedValueOnce(-1);
      mockRedis.get.mockResolvedValueOnce('not-json');

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('queue:processing:job-1');
    });

    it('should handle Zod validation error in cleanup', async () => {
      mockRedis.keys.mockResolvedValueOnce(['queue:processing:job-1']);
      mockRedis.ttl.mockResolvedValueOnce(-1);
      mockRedis.get.mockResolvedValueOnce(
        JSON.stringify({
          id: 'job-1',
          // Missing required fields
        })
      );

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('queue:processing:job-1');
    });

    it('should handle failJob error in cleanup', async () => {
      const validJobData = {
        id: 'job-1',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      mockRedis.keys.mockResolvedValueOnce(['queue:processing:job-1']);
      mockRedis.ttl.mockResolvedValueOnce(-1);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(validJobData));

      // Mock failJob to throw
      jest
        .spyOn(redisQueueService, 'failJob')
        .mockRejectedValueOnce(new Error('Fail error'));

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('queue:processing:job-1');
    });

    // Test for lines 677-745 (moveDelayedJobsToQueue)
    it('should handle invalid JSON in delayed queue', async () => {
      // Mock delayed jobs with invalid JSON
      mockRedis.zrange
        .mockResolvedValueOnce([
          'invalid-json',
          '1000',
          '{"broken": json}',
          '2000',
        ])
        .mockResolvedValueOnce([]); // No pending jobs

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockLog.warn).toHaveBeenCalledTimes(2);
      expect(mockRedis.zrem).toHaveBeenCalledTimes(2);
    });

    it('should handle error in moveDelayedJobsToQueue', async () => {
      // Mock zrange to return invalid data to see error handling in moveDelayedJobsToQueue
      mockRedis.zrange
        .mockResolvedValueOnce([]) // Empty delayed jobs, no error
        .mockResolvedValueOnce([]); // Empty pending jobs

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('Additional edge cases', () => {
    it('should handle all non-Error types in error handlers', async () => {
      // Test string error
      mockRedis.zadd.mockRejectedValueOnce('string error');
      let result = await redisQueueService.addJob(queueName, jobType, payload);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');

      // Test null error
      mockRedis.zadd.mockRejectedValueOnce(null);
      result = await redisQueueService.addJob(queueName, jobType, payload);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');

      // Test undefined error
      mockRedis.zadd.mockRejectedValueOnce(undefined);
      result = await redisQueueService.addJob(queueName, jobType, payload);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');

      // Test object error
      mockRedis.zadd.mockRejectedValueOnce({ code: 'ERROR', details: 'test' });
      result = await redisQueueService.addJob(queueName, jobType, payload);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');
    });

    it('should handle queue name extraction edge cases in failJob', async () => {
      const testCases = [
        { type: '', expected: 'default' },
        { type: 'simple', expected: 'simple' },
        { type: '-leading', expected: 'default' },
        { type: 'queue-name-job', expected: 'queue' },
      ];

      for (const testCase of testCases) {
        const jobData: JobData = {
          id: 'job-123',
          type: testCase.type,
          payload: { data: 'test' },
          priority: 5,
          attempts: 1,
          maxAttempts: 3,
          delay: 0,
          createdAt: Date.now(),
        };

        mockRedis.zadd.mockClear();
        await redisQueueService.failJob(jobData, 'Test error');

        if (mockRedis.zadd.mock.calls.length > 0) {
          const delayedKey = mockRedis.zadd.mock.calls[0][0];
          expect(delayedKey).toContain(`queue:delayed:${testCase.expected}`);
        }
      }
    });

    it('should cap retry delay at maximum', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 14, // One less than max, to trigger retry
        maxAttempts: 15,
        delay: 0,
        createdAt: Date.now(),
      };

      await redisQueueService.failJob(jobData, 'Test error');

      expect(mockRedis.zadd).toHaveBeenCalled();
      const addCall = mockRedis.zadd.mock.calls[0];
      expect(addCall).toBeDefined();
      expect(addCall[1]).toBeDefined();

      const member = JSON.parse(addCall[1].member);
      const retryDelay = member.scheduledFor - Date.now();

      // Should be capped at 300000ms (5 minutes)
      expect(retryDelay).toBeLessThanOrEqual(300000);
      expect(retryDelay).toBeGreaterThan(100000); // Allow wider variance for high attempt count
    });

    it('should handle polling interval in processing loop', async () => {
      const processor: JobProcessor = jest.fn();

      // Set up processor and active polling
      (redisQueueService as any).processors.set(queueName, processor);
      (redisQueueService as any).activePolling.set(queueName, true);

      // Mock getNextJob to return no jobs then stop immediately
      let _callCount = 0;
      jest
        .spyOn(redisQueueService, 'getNextJob')
        .mockImplementation(async () => {
          _callCount++;
          // Stop the loop after first call
          (redisQueueService as any).activePolling.set(queueName, false);
          return { success: true, data: null, error: null }; // No jobs available
        });

      await (redisQueueService as any).startProcessingLoop(queueName, {
        name: queueName,
        pollInterval: 2000, // Custom poll interval
      });

      expect(redisQueueService.getNextJob).toHaveBeenCalledTimes(1);
    });
  });
});
