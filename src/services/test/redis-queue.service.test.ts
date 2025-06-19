/**
 * @jest-environment node
 */

import { redisQueueService } from '../redis-queue.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { JobData, JobOptions, QueueOptions, JobProcessor } from '../redis-queue.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockRedis = {
  zadd: jest.fn(),
  zrange: jest.fn(),
  zcard: jest.fn(),
  zrem: jest.fn(),
  zremrangebyrank: jest.fn(),
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  eval: jest.fn(),
  keys: jest.fn(),
  ttl: jest.fn(),
  lpop: jest.fn(),
};

const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<typeof isRedisConfigured>;
const mockLog = log as jest.Mocked<typeof log>;

describe('RedisQueueService', () => {
  const queueName = 'test-queue';
  const jobType = 'process-data';
  const payload = { data: 'test', value: 123 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as any);
    
    // Clear processors and active polling
    (redisQueueService as any).processors.clear();
    (redisQueueService as any).activePolling.clear();
  });

  describe('server-only guard', () => {
    it('should reject client-side operations', async () => {
      // Mock window to simulate client-side
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      const result = await redisQueueService.addJob(queueName, jobType, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue operations are only available on the server');
      
      // Clean up
      delete (global as any).window;
    });
  });

  describe('Redis configuration check', () => {
    it('should handle Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await redisQueueService.addJob(queueName, jobType, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue service unavailable');
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Redis not configured - queue operations unavailable'
      );
    });
  });

  describe('addJob', () => {
    it('should add job to pending queue successfully', async () => {
      const options: JobOptions = {
        priority: 8,
        maxAttempts: 5,
        metadata: { source: 'test' },
      };

      const result = await redisQueueService.addJob(queueName, jobType, payload, options);

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toMatch(new RegExp(`^${queueName}-${jobType}-\\d+-[a-z0-9]+$`));

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(`queue:pending:${queueName}`),
        expect.objectContaining({
          score: -8, // Negative for descending order
          member: expect.stringContaining('"priority":8'),
        })
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('queue:jobs:'),
        600, // TTL for job lifecycle
        expect.stringContaining('"maxAttempts":5')
      );

      expect(mockLog.debug).toHaveBeenCalledWith(
        'Job added to queue',
        expect.objectContaining({
          metadata: expect.objectContaining({
            queueName,
            jobType,
            priority: 8,
          }),
        })
      );
    });

    it('should add delayed job to delayed queue', async () => {
      const options: JobOptions = {
        delay: 30000, // 30 seconds
        priority: 5,
      };

      const result = await redisQueueService.addJob(queueName, jobType, payload, options);

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(`queue:delayed:${queueName}`),
        expect.objectContaining({
          score: expect.any(Number), // Scheduled time
          member: expect.stringContaining('"delay":30000'),
        })
      );

      expect(mockLog.debug).toHaveBeenCalledWith(
        'Job scheduled for delayed execution',
        expect.objectContaining({
          metadata: expect.objectContaining({
            queueName,
            jobType,
            delay: 30000,
          }),
        })
      );
    });

    it('should use default values for missing options', async () => {
      const result = await redisQueueService.addJob(queueName, jobType, payload);

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          score: -5, // Default priority
          member: expect.stringContaining('"maxAttempts":3'),
        })
      );
    });

    it('should handle Redis errors during job addition', async () => {
      mockRedis.zadd.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisQueueService.addJob(queueName, jobType, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to add job to queue',
        expect.any(Error),
        expect.objectContaining({
          metadata: { queueName, jobType },
        })
      );
    });

    it('should validate job data with Zod', async () => {
      const invalidPayload = { circular: {} } as any;
      invalidPayload.circular.self = invalidPayload;

      // This should still work as payload is Record<string, unknown>
      const result = await redisQueueService.addJob(queueName, jobType, invalidPayload);

      // The validation happens when adding to Redis, not before
      expect(result.success).toBe(true);
    });
  });

  describe('getNextJob', () => {
    it('should get next job from pending queue', async () => {
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

      mockRedis.zrange.mockResolvedValueOnce([JSON.stringify(jobData)]);
      mockRedis.eval.mockResolvedValueOnce(1); // Successful atomic operation

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'job-123',
        type: jobType,
        priority: 5,
        processingStartedAt: expect.any(Number),
      });

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('ZREM'),
        expect.arrayContaining([
          expect.stringContaining(`queue:pending:${queueName}`),
          expect.stringContaining('queue:processing:job-123'),
        ]),
        expect.arrayContaining([
          JSON.stringify(jobData),
          '300', // Processing TTL
        ])
      );
    });

    it('should return null when no jobs available', async () => {
      mockRedis.zrange.mockResolvedValueOnce([]);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle invalid JSON job data gracefully', async () => {
      mockRedis.zrange.mockResolvedValueOnce(['invalid-json-data']);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockRedis.lpop).toHaveBeenCalledWith(
        expect.stringContaining(`queue:pending:${queueName}`)
      );
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in queue, skipping job',
        expect.any(Object)
      );
    });

    it('should move delayed jobs to pending queue before getting next job', async () => {
      const delayedJobData = {
        id: 'delayed-job-123',
        type: jobType,
        payload,
        priority: 7,
        attempts: 0,
        maxAttempts: 3,
        delay: 1000,
        createdAt: Date.now() - 2000,
        scheduledFor: Date.now() - 1000, // Ready to run
      };

      // Mock delayed jobs that are ready
      mockRedis.zrange
        .mockResolvedValueOnce([JSON.stringify(delayedJobData)]) // delayed jobs
        .mockResolvedValueOnce([JSON.stringify(delayedJobData)]); // pending jobs

      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      // Should have moved delayed job to pending and then retrieved it
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(`queue:pending:${queueName}`),
        expect.objectContaining({
          score: -7, // Priority
          member: JSON.stringify(delayedJobData),
        })
      );
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        expect.stringContaining(`queue:delayed:${queueName}`),
        JSON.stringify(delayedJobData)
      );
    });

    it('should handle atomic operation failure', async () => {
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

      mockRedis.zrange.mockResolvedValueOnce([JSON.stringify(jobData)]);
      mockRedis.eval.mockResolvedValueOnce(0); // Atomic operation failed

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle Redis errors during job retrieval', async () => {
      mockRedis.zrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get next job',
        expect.any(Error),
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });
  });

  describe('completeJob', () => {
    it('should complete job successfully', async () => {
      const jobId = 'job-123';
      const result = { processed: true, output: 'success' };

      const completeResult = await redisQueueService.completeJob(jobId, result);

      expect(completeResult.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('queue:processing:job-123')
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('queue:completed:job-123'),
        3600, // Completed TTL
        expect.stringContaining('"success":true')
      );
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Job completed successfully',
        expect.objectContaining({
          metadata: { jobId },
        })
      );
    });

    it('should handle Redis errors during completion', async () => {
      const jobId = 'job-123';
      mockRedis.del.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisQueueService.completeJob(jobId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to complete job',
        expect.any(Error),
        expect.objectContaining({
          metadata: { jobId },
        })
      );
    });
  });

  describe('failJob', () => {
    it('should retry job when attempts remaining', async () => {
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
      const error = 'Processing failed';

      const result = await redisQueueService.failJob(jobData, error);

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('queue:processing:job-123')
      );
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('queue:delayed:test'), // Extracted from job type
        expect.objectContaining({
          score: expect.any(Number), // Retry time
          member: expect.stringContaining('"attempts":2'),
        })
      );
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Job failed, scheduling retry',
        expect.objectContaining({
          metadata: expect.objectContaining({
            jobId: 'job-123',
            attempt: 2,
            maxAttempts: 3,
          }),
        })
      );
    });

    it('should move to failed queue when max attempts reached', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 3,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };
      const error = 'Final failure';

      const result = await redisQueueService.failJob(jobData, error);

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('queue:failed:job-123'),
        86400, // Failed TTL
        expect.stringContaining('"success":false')
      );
      expect(mockLog.error).toHaveBeenCalledWith(
        'Job failed permanently after max attempts',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            jobId: 'job-123',
            attempts: 3,
            maxAttempts: 3,
          }),
        })
      );
    });

    it('should calculate exponential backoff for retries', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 2, // Third attempt
        maxAttempts: 5,
        delay: 0,
        createdAt: Date.now(),
      };

      await redisQueueService.failJob(jobData, 'Error');

      // Should calculate retry delay: 1000 * 2^(3-1) = 4000ms
      const addCall = mockRedis.zadd.mock.calls.find(call =>
        call[0].includes('queue:delayed:')
      );
      expect(addCall).toBeDefined();

      const jobStr = addCall![1].member;
      const updatedJob = JSON.parse(jobStr);
      const retryDelay = updatedJob.scheduledFor - Date.now();
      expect(retryDelay).toBeGreaterThanOrEqual(3900); // Allow for small timing differences
      expect(retryDelay).toBeLessThanOrEqual(4100);
    });

    it('should handle Redis errors during job failure', async () => {
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

      mockRedis.del.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisQueueService.failJob(jobData, 'Original error');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to handle job failure',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            jobId: 'job-123',
            originalError: 'Original error',
          }),
        })
      );
    });
  });

  describe('processJobs', () => {
    it('should start processing jobs successfully', async () => {
      const processor: JobProcessor = jest.fn();
      const options: QueueOptions = {
        name: queueName,
        maxConcurrency: 2,
        pollInterval: 2000,
      };

      const result = await redisQueueService.processJobs(queueName, processor, options);

      expect(result.success).toBe(true);
      expect((redisQueueService as any).processors.get(queueName)).toBe(processor);
      expect((redisQueueService as any).activePolling.get(queueName)).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith(
        'Started processing queue',
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });

    it('should prevent duplicate processing for same queue', async () => {
      const processor: JobProcessor = jest.fn();

      // Set queue as already processing
      (redisQueueService as any).activePolling.set(queueName, true);

      const result = await redisQueueService.processJobs(queueName, processor);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue is already being processed');
    });

    it('should handle processor initialization errors', async () => {
      const processor: JobProcessor = jest.fn();
      
      // Force an error during setup
      jest.spyOn(redisQueueService as any, 'startProcessingLoop').mockImplementationOnce(() => {
        throw new Error('Setup error');
      });

      const result = await redisQueueService.processJobs(queueName, processor);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Setup error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to start queue processing',
        expect.any(Error),
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });
  });

  describe('stopProcessing', () => {
    it('should stop processing queue', async () => {
      const processor: JobProcessor = jest.fn();
      
      // Set up active processing
      (redisQueueService as any).processors.set(queueName, processor);
      (redisQueueService as any).activePolling.set(queueName, true);

      const result = await redisQueueService.stopProcessing(queueName);

      expect(result.success).toBe(true);
      expect((redisQueueService as any).activePolling.get(queueName)).toBe(false);
      expect((redisQueueService as any).processors.has(queueName)).toBe(false);
      expect(mockLog.info).toHaveBeenCalledWith(
        'Stopped processing queue',
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });

    it('should handle stop processing errors', async () => {
      // Force an error during stop
      jest.spyOn(redisQueueService as any, 'activePolling', 'get').mockImplementationOnce(() => {
        throw new Error('Stop error');
      });

      const result = await redisQueueService.stopProcessing(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to stop queue processing',
        expect.any(Error),
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockRedis.zcard
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(15); // delayed

      mockRedis.keys
        .mockResolvedValueOnce(['proc1', 'proc2']) // processing
        .mockResolvedValueOnce(['comp1', 'comp2', 'comp3']) // completed
        .mockResolvedValueOnce(['fail1']); // failed

      const result = await redisQueueService.getQueueStats(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        pending: 10,
        processing: 2,
        delayed: 15,
        completed: 3,
        failed: 1,
      });
    });

    it('should handle Redis errors during stats collection', async () => {
      mockRedis.zcard.mockRejectedValueOnce(new Error('Stats error'));

      const result = await redisQueueService.getQueueStats(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stats error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get queue stats',
        expect.any(Error),
        expect.objectContaining({
          metadata: { queueName },
        })
      );
    });
  });

  describe('cleanupExpiredJobs', () => {
    it('should clean up stale processing jobs', async () => {
      const staleJobData = {
        id: 'stale-job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      mockRedis.keys.mockResolvedValueOnce([
        'queue:processing:stale-job-123',
        'queue:processing:active-job-456',
      ]);

      mockRedis.ttl
        .mockResolvedValueOnce(-1) // stale job (expired)
        .mockResolvedValueOnce(120); // active job

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(staleJobData));

      // Mock failJob method
      jest.spyOn(redisQueueService, 'failJob').mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // One job cleaned up
      expect(redisQueueService.failJob).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'stale-job-123' }),
        'Job processing timeout'
      );
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Cleaned up expired jobs',
        expect.objectContaining({
          metadata: { cleanedCount: 1 },
        })
      );
    });

    it('should handle invalid job data during cleanup', async () => {
      mockRedis.keys.mockResolvedValueOnce(['queue:processing:invalid-job']);
      mockRedis.ttl.mockResolvedValueOnce(-1);
      mockRedis.get.mockResolvedValueOnce('invalid-json');

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('queue:processing:invalid-job');
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in processing cleanup, removing job',
        expect.any(Object)
      );
    });

    it('should handle cleanup errors', async () => {
      mockRedis.keys.mockRejectedValueOnce(new Error('Cleanup error'));

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to cleanup expired jobs',
        expect.any(Error)
      );
    });
  });

  describe('integration tests', () => {
    it('should handle complete job lifecycle', async () => {
      const processor: JobProcessor = jest.fn().mockResolvedValue('success');
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

      // Add job
      const addResult = await redisQueueService.addJob(queueName, jobType, payload);
      expect(addResult.success).toBe(true);

      // Get next job
      mockRedis.zrange.mockResolvedValueOnce([JSON.stringify(jobData)]);
      mockRedis.eval.mockResolvedValueOnce(1);

      const getResult = await redisQueueService.getNextJob(queueName);
      expect(getResult.success).toBe(true);

      // Complete job
      const completeResult = await redisQueueService.completeJob('job-123', 'success');
      expect(completeResult.success).toBe(true);
    });

    it('should handle job retry flow', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      // Fail job (should retry)
      const failResult = await redisQueueService.failJob(jobData, 'Temporary error');
      expect(failResult.success).toBe(true);

      // Verify job was moved to delayed queue with updated attempt count
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('queue:delayed:'),
        expect.objectContaining({
          member: expect.stringContaining('"attempts":1'),
        })
      );
    });

    it('should handle delayed job processing', async () => {
      const delayedJobData = {
        id: 'delayed-job-123',
        type: jobType,
        payload,
        priority: 7,
        attempts: 0,
        maxAttempts: 3,
        delay: 1000,
        createdAt: Date.now() - 2000,
        scheduledFor: Date.now() - 1000, // Ready to run
      };

      // Mock delayed jobs ready for processing
      mockRedis.zrange
        .mockResolvedValueOnce([JSON.stringify(delayedJobData)]) // delayed jobs
        .mockResolvedValueOnce([JSON.stringify(delayedJobData)]); // pending jobs after move

      mockRedis.eval.mockResolvedValueOnce(1);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'delayed-job-123',
        type: jobType,
      });

      // Verify job was moved from delayed to pending
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('queue:pending:'),
        expect.objectContaining({
          score: -7,
          member: JSON.stringify(delayedJobData),
        })
      );
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        expect.stringContaining('queue:delayed:'),
        JSON.stringify(delayedJobData)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing scheduled time for delayed jobs', async () => {
      const options: JobOptions = {
        delay: 5000,
      };

      // Force scheduledFor to be undefined by mocking the job creation
      const originalAddJob = redisQueueService.addJob.bind(redisQueueService);
      jest.spyOn(redisQueueService, 'addJob').mockImplementationOnce(async () => {
        // Simulate the error that would occur if scheduledFor is undefined
        throw new Error('scheduledFor is required for delayed jobs');
      });

      const result = await redisQueueService.addJob(queueName, jobType, payload, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('scheduledFor is required for delayed jobs');
    });

    it('should handle queue name extraction from job type', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'special-queue-process-data', // Queue name should be extracted as 'special'
        payload: { data: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      await redisQueueService.failJob(jobData, 'Error');

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('queue:delayed:special'),
        expect.any(Object)
      );
    });

    it('should handle job types without queue prefix', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'simple-job', // No queue prefix
        payload: { data: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      await redisQueueService.failJob(jobData, 'Error');

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('queue:delayed:default'), // Should default to 'default'
        expect.any(Object)
      );
    });

    it('should cap retry delays at maximum', async () => {
      const jobData: JobData = {
        id: 'job-123',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 10, // High attempt count
        maxAttempts: 15,
        delay: 0,
        createdAt: Date.now(),
      };

      await redisQueueService.failJob(jobData, 'Error');

      const addCall = mockRedis.zadd.mock.calls.find(call =>
        call[0].includes('queue:delayed:')
      );
      const jobStr = addCall![1].member;
      const updatedJob = JSON.parse(jobStr);
      const retryDelay = updatedJob.scheduledFor - Date.now();
      
      // Should be capped at max delay (300000ms = 5 minutes)
      expect(retryDelay).toBeLessThanOrEqual(300000);
    });
  });
});