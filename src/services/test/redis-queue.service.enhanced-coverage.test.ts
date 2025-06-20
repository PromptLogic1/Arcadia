/**
 * @jest-environment node
 * 
 * Redis Queue Service - Enhanced Branch Coverage Tests
 * 
 * Targeting specific uncovered branches and edge cases to improve coverage 
 * from 74.46% branches to >90%. Focused on specific scenarios that are 
 * missing from existing tests.
 */

import { redisQueueService } from '../redis-queue.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { JobProcessor } from '../redis-queue.service';

// Mock dependencies
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConfigured: jest.fn(),
  createRedisKey: jest.fn(
    (prefix: string, ...parts: string[]) => `${prefix}:${parts.join(':')}`
  ),
  REDIS_PREFIXES: {
    QUEUE: '@arcadia/queue',
    CACHE: '@arcadia/cache',
    SESSION: '@arcadia/session',
    PRESENCE: '@arcadia/presence',
    RATE_LIMIT: '@arcadia/rate-limit',
  },
}));
jest.mock('@/lib/logger');

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

describe('RedisQueueService - Enhanced Branch Coverage', () => {
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

    // Ensure we're in server environment by default
    delete (global as any).window;
  });

  describe('moveDelayedJobsToQueue - Detailed Coverage', () => {
    it('should handle empty delayed jobs range (line 695-698)', async () => {
      jest.restoreAllMocks();
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      // Mock empty delayed jobs
      mockRedis.zrange
        .mockResolvedValueOnce([]) // No delayed jobs
        .mockResolvedValueOnce([]); // No pending jobs

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      
      // Should not attempt to process any jobs
      expect(mockRedis.zadd).not.toHaveBeenCalled();
      expect(mockRedis.zrem).not.toHaveBeenCalled();
    });

    it('should process valid delayed jobs ready for execution', async () => {
      jest.restoreAllMocks();
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      const readyJob = {
        id: 'ready-job',
        type: jobType,
        payload,
        priority: 7,
        attempts: 0,
        maxAttempts: 3,
        delay: 1000,
        createdAt: Date.now() - 2000,
        scheduledFor: Date.now() - 500, // Ready to run
      };

      // Mock delayed jobs that are ready to run
      mockRedis.zrange
        .mockResolvedValueOnce([JSON.stringify(readyJob), (Date.now() - 500).toString()]) // Ready delayed job
        .mockResolvedValueOnce([JSON.stringify(readyJob)]); // Job now in pending

      mockRedis.eval.mockResolvedValueOnce(1);
      
      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('ready-job');
      
      // Verify job was moved from delayed to pending queue
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        expect.objectContaining({
          score: -7,
          member: JSON.stringify(readyJob),
        })
      );
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        expect.stringContaining('delayed'),
        JSON.stringify(readyJob)
      );
    });

    it('should skip delayed jobs not yet ready', async () => {
      jest.restoreAllMocks();
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      const _futureJob = {
        id: 'future-job',
        type: jobType,
        payload,
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 10000,
        createdAt: Date.now(),
        scheduledFor: Date.now() + 5000, // Not ready yet
      };

      // Mock delayed jobs that are not yet ready
      mockRedis.zrange
        .mockResolvedValueOnce([]) // No ready delayed jobs (filtered by score range)
        .mockResolvedValueOnce([]); // No pending jobs

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('cleanupExpiredJobs - Edge Cases', () => {
    it('should handle job data with null content', async () => {
      mockRedis.keys.mockResolvedValueOnce(['@arcadia/queue:processing:null-job']);
      mockRedis.ttl.mockResolvedValueOnce(-1); // Expired
      mockRedis.get.mockResolvedValueOnce(null); // No data

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0); // No jobs cleaned because no data to process

      // Should not attempt to process null job data
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle active jobs that should not be cleaned', async () => {
      mockRedis.keys.mockResolvedValueOnce([
        '@arcadia/queue:processing:active-1',
        '@arcadia/queue:processing:active-2',
      ]);
      
      mockRedis.ttl
        .mockResolvedValueOnce(300) // Active job
        .mockResolvedValueOnce(150); // Active job

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0); // No cleanup needed

      // Should not touch active jobs
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle mixed expired and active jobs', async () => {
      mockRedis.keys.mockResolvedValueOnce([
        '@arcadia/queue:processing:expired-1',
        '@arcadia/queue:processing:active-1',
        '@arcadia/queue:processing:expired-2',
      ]);
      
      mockRedis.ttl
        .mockResolvedValueOnce(-1) // Expired
        .mockResolvedValueOnce(200) // Active
        .mockResolvedValueOnce(0); // Expired

      const validJobData = {
        id: 'expired-1',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(validJobData)) // Valid expired job
        .mockResolvedValueOnce(null); // No data for second expired job

      // Mock failJob for the valid expired job
      jest.spyOn(redisQueueService, 'failJob').mockResolvedValueOnce({
        success: true,
        data: undefined,
        error: null,
      });

      const result = await redisQueueService.cleanupExpiredJobs();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // One job cleaned

      // Should only process expired jobs
      expect(mockRedis.get).toHaveBeenCalledTimes(2); // Only for expired jobs
      expect(redisQueueService.failJob).toHaveBeenCalledWith(
        validJobData,
        'Job processing timeout'
      );
    });
  });

  describe('startProcessingLoop - Advanced Scenarios', () => {
    it('should handle missing processor gracefully', async () => {
      // Don't set a processor
      (redisQueueService as any).activePolling.set(queueName, true);

      // This should return early without processing
      const startProcessingLoop = (redisQueueService as any).startProcessingLoop.bind(
        redisQueueService
      );
      
      const result = await startProcessingLoop(queueName, { name: queueName });

      expect(result).toBeUndefined(); // Should return early
    });

    it('should handle successful job processing with timing', async () => {
      const processor: JobProcessor = jest.fn().mockResolvedValue('success-result');
      
      (redisQueueService as any).processors.set(queueName, processor);
      (redisQueueService as any).activePolling.set(queueName, true);

      const jobData = {
        id: 'timing-job',
        type: jobType,
        payload,
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: Date.now(),
      };

      // Mock getNextJob to return job then stop
      const mockGetNextJob = jest
        .spyOn(redisQueueService, 'getNextJob')
        .mockResolvedValueOnce({
          success: true,
          data: jobData,
          error: null,
        })
        .mockImplementation(async () => {
          // Stop polling after first job
          (redisQueueService as any).activePolling.set(queueName, false);
          return { success: true, data: null, error: null };
        });

      const mockCompleteJob = jest
        .spyOn(redisQueueService, 'completeJob')
        .mockResolvedValue({
          success: true,
          data: undefined,
          error: null,
        });

      await (redisQueueService as any).startProcessingLoop(queueName, {
        name: queueName,
        pollInterval: 10,
      });

      expect(processor).toHaveBeenCalledWith(jobData);
      expect(mockCompleteJob).toHaveBeenCalledWith('timing-job', 'success-result');
      
      // Should log processing time
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Job processed successfully',
        expect.objectContaining({
          metadata: expect.objectContaining({
            jobId: 'timing-job',
            processingTime: expect.any(Number),
          }),
        })
      );

      mockGetNextJob.mockRestore();
      mockCompleteJob.mockRestore();
    });

    it('should handle poll interval when no jobs available', async () => {
      const processor: JobProcessor = jest.fn();
      
      (redisQueueService as any).processors.set(queueName, processor);
      (redisQueueService as any).activePolling.set(queueName, true);

      let callCount = 0;
      const mockGetNextJob = jest
        .spyOn(redisQueueService, 'getNextJob')
        .mockImplementation(async () => {
          callCount++;
          if (callCount >= 2) {
            // Stop after a couple of iterations
            (redisQueueService as any).activePolling.set(queueName, false);
          }
          return { success: true, data: null, error: null };
        });

      const startTime = Date.now();
      await (redisQueueService as any).startProcessingLoop(queueName, {
        name: queueName,
        pollInterval: 50, // Short poll interval for testing
      });
      const endTime = Date.now();

      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(endTime - startTime).toBeGreaterThanOrEqual(50); // Should have waited

      mockGetNextJob.mockRestore();
    });
  });

  describe('addJob - Boundary Conditions', () => {
    it('should handle job with exactly maximum priority', async () => {
      const options = {
        priority: 10, // Maximum allowed priority
        maxAttempts: 1,
      };

      const result = await redisQueueService.addJob(queueName, jobType, payload, options);

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        expect.objectContaining({
          score: -10, // Should use maximum priority
        })
      );
    });

    it('should handle job with minimum delay greater than zero', async () => {
      const options = {
        delay: 1, // Minimal delay to trigger delayed queue
        priority: 3,
      };

      const result = await redisQueueService.addJob(queueName, jobType, payload, options);

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('delayed'),
        expect.objectContaining({
          score: expect.any(Number), // Should be scheduled time
        })
      );
    });
  });

  describe('Error Path Coverage', () => {
    it('should handle non-Error exceptions as strings', async () => {
      const nonErrorException = 'This is a string error';
      
      mockRedis.zadd.mockImplementation(() => {
        throw nonErrorException;
      });

      const result = await redisQueueService.addJob(queueName, jobType, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add job to queue');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to add job to queue',
        expect.any(Error), // Should be wrapped in Error
        expect.any(Object)
      );
    });

    it('should handle object exceptions', async () => {
      const objectException = { 
        message: 'Complex error object',
        code: 'CUSTOM_ERROR',
        details: { context: 'test' }
      };
      
      mockRedis.del.mockImplementation(() => {
        throw objectException;
      });

      const result = await redisQueueService.completeJob('job-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to complete job');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to complete job',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle null/undefined exceptions', async () => {
      // Test null exception
      mockRedis.zcard.mockImplementation(() => {
        throw null;
      });

      let result = await redisQueueService.getQueueStats(queueName);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get queue stats');

      // Reset and test undefined exception
      jest.clearAllMocks();
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue(mockRedis as any);
      
      mockRedis.zcard.mockImplementation(() => {
        throw undefined;
      });

      result = await redisQueueService.getQueueStats(queueName);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get queue stats');
    });
  });

  describe('JSON Parsing Edge Cases', () => {
    it('should handle partially valid JSON that fails schema validation', async () => {
      jest.restoreAllMocks();
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      jest
        .spyOn(redisQueueService as any, 'moveDelayedJobsToQueue')
        .mockResolvedValue(undefined);

      // Mock job data that is valid JSON but invalid JobData schema
      const invalidSchemaData = {
        id: 'job-123',
        type: jobType,
        // Missing required fields like priority, attempts, etc.
        payload,
      };

      mockRedis.zrange.mockResolvedValueOnce([JSON.stringify(invalidSchemaData)]);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Required'); // Zod validation error
    });

    it('should handle malformed JSON with special characters', async () => {
      jest.restoreAllMocks();
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      jest
        .spyOn(redisQueueService as any, 'moveDelayedJobsToQueue')
        .mockResolvedValue(undefined);

      // Mock malformed JSON with special characters
      const malformedJson = '{"id": "job\n\t\\"123", "type": unquoted_value}';

      mockRedis.zrange.mockResolvedValueOnce([malformedJson]);

      const result = await redisQueueService.getNextJob(queueName);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in queue, skipping job',
        expect.any(Object)
      );
      expect(mockRedis.lpop).toHaveBeenCalled();
    });
  });
});