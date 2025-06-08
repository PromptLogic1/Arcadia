/**
 * Redis Queue Service
 *
 * Provides distributed queue functionality using Redis for background job processing,
 * task scheduling, and event-driven workflows. Includes priority queues, delayed jobs,
 * and dead letter handling.
 */

import { getRedisClient, createRedisKey, REDIS_PREFIXES } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { z } from 'zod';

// Job schemas
const jobDataSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.record(z.unknown()),
  priority: z.number().min(0).max(10).default(5),
  attempts: z.number().min(0).default(0),
  maxAttempts: z.number().min(1).default(3),
  delay: z.number().min(0).default(0), // milliseconds
  createdAt: z.number(),
  scheduledFor: z.number().optional(),
  processingStartedAt: z.number().optional(),
  lastError: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const jobResultSchema = z.object({
  jobId: z.string(),
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  processingTime: z.number().optional(),
  completedAt: z.number(),
});

export type JobData = z.infer<typeof jobDataSchema>;
export type JobResult = z.infer<typeof jobResultSchema>;

// Constants
export const QUEUE_CONSTANTS = {
  PRIORITIES: {
    CRITICAL: 10,
    HIGH: 8,
    NORMAL: 5,
    LOW: 3,
    BACKGROUND: 1,
  },
  TTL: {
    PROCESSING: 300, // 5 minutes max processing time
    COMPLETED: 3600, // 1 hour to keep completed job data
    FAILED: 86400, // 24 hours to keep failed job data
  },
  POLLING: {
    INTERVAL: 1000, // 1 second
    BATCH_SIZE: 10,
  },
  RETRY: {
    BASE_DELAY: 1000, // 1 second
    MAX_DELAY: 300000, // 5 minutes
    EXPONENTIAL_BASE: 2,
  },
} as const;

export interface QueueOptions {
  name: string;
  maxConcurrency?: number;
  pollInterval?: number;
  retryDelay?: number;
  defaultPriority?: number;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  maxAttempts?: number;
  metadata?: Record<string, unknown>;
}

export interface JobProcessor {
  (job: JobData): Promise<unknown>;
}

class RedisQueueService {
  private processors = new Map<string, JobProcessor>();
  private activePolling = new Map<string, boolean>();

  /**
   * Add a job to the queue
   */
  async addJob(
    queueName: string,
    jobType: string,
    payload: Record<string, unknown>,
    options: JobOptions = {}
  ): Promise<ServiceResponse<string>> {
    try {
      const redis = getRedisClient();
      const jobId = `${queueName}-${jobType}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const job: JobData = {
        id: jobId,
        type: jobType,
        payload,
        priority: options.priority || QUEUE_CONSTANTS.PRIORITIES.NORMAL,
        attempts: 0,
        maxAttempts: options.maxAttempts || 3,
        delay: options.delay || 0,
        createdAt: Date.now(),
        scheduledFor: options.delay ? Date.now() + options.delay : undefined,
        metadata: options.metadata,
      };

      const validatedJob = jobDataSchema.parse(job);

      if (options.delay && options.delay > 0) {
        // Add to delayed jobs (sorted set with scheduled time as score)
        const delayedKey = createRedisKey(
          REDIS_PREFIXES.QUEUE,
          'delayed',
          queueName
        );

        const scheduledFor = job.scheduledFor;
        if (scheduledFor === undefined) {
          throw new Error('scheduledFor is required for delayed jobs');
        }

        await redis.zadd(delayedKey, {
          score: scheduledFor,
          member: JSON.stringify(validatedJob),
        });

        log.debug('Job scheduled for delayed execution', {
          metadata: { jobId, queueName, jobType, delay: options.delay },
        });
      } else {
        // Add to priority queue (sorted set with priority as score)
        const queueKey = createRedisKey(
          REDIS_PREFIXES.QUEUE,
          'pending',
          queueName
        );

        await redis.zadd(
          queueKey,
          { score: -job.priority, member: JSON.stringify(validatedJob) } // Negative for descending order (highest priority first)
        );

        log.debug('Job added to queue', {
          metadata: { jobId, queueName, jobType, priority: job.priority },
        });
      }

      // Store job details for tracking
      const jobKey = createRedisKey(REDIS_PREFIXES.QUEUE, 'jobs', jobId);

      await redis.setex(
        jobKey,
        QUEUE_CONSTANTS.TTL.PROCESSING * 2, // Give extra time for job lifecycle
        JSON.stringify(validatedJob)
      );

      return createServiceSuccess(jobId);
    } catch (error) {
      log.error(
        'Failed to add job to queue',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { queueName, jobType },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to add job to queue'
      );
    }
  }

  /**
   * Process jobs from a queue
   */
  async processJobs(
    queueName: string,
    processor: JobProcessor,
    options: QueueOptions = { name: queueName }
  ): Promise<ServiceResponse<void>> {
    try {
      this.processors.set(queueName, processor);

      if (this.activePolling.get(queueName)) {
        return createServiceError('Queue is already being processed');
      }

      this.activePolling.set(queueName, true);

      // Start processing loop
      this.startProcessingLoop(queueName, options);

      log.info('Started processing queue', {
        metadata: { queueName },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to start queue processing',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { queueName },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to start queue processing'
      );
    }
  }

  /**
   * Stop processing a queue
   */
  async stopProcessing(queueName: string): Promise<ServiceResponse<void>> {
    try {
      this.activePolling.set(queueName, false);
      this.processors.delete(queueName);

      log.info('Stopped processing queue', {
        metadata: { queueName },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to stop queue processing',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { queueName },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to stop queue processing'
      );
    }
  }

  /**
   * Get the next job from queue (atomic operation)
   */
  async getNextJob(
    queueName: string
  ): Promise<ServiceResponse<JobData | null>> {
    try {
      const redis = getRedisClient();

      // First, move any delayed jobs that are ready
      await this.moveDelayedJobsToQueue(queueName);

      // Get highest priority job from pending queue
      const queueKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'pending',
        queueName
      );

      const jobs = await redis.zrange(queueKey, 0, 0);

      if (jobs.length === 0) {
        return createServiceSuccess(null);
      }

      // Atomically remove and move to processing
      const jobData = jobs[0] as string;

      // Handle invalid JSON data gracefully
      let parsedData;
      try {
        parsedData = JSON.parse(jobData);
      } catch (parseError) {
        log.warn('Invalid JSON data in queue, skipping job', {
          metadata: {
            queueName,
            jobData: jobData.substring(0, 100), // Log first 100 chars only
            parseError:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          },
        });
        // Remove the invalid job and continue
        await redis.lpop(queueKey);
        return createServiceSuccess(null);
      }

      const job = jobDataSchema.parse(parsedData);

      // Use Lua script for atomic pop and move to processing
      const processScript = `
        local queueKey = KEYS[1]
        local processingKey = KEYS[2]
        local jobData = ARGV[1]
        local processingTtl = ARGV[2]
        
        -- Remove from pending queue
        local removed = redis.call('ZREM', queueKey, jobData)
        if removed == 1 then
          -- Add to processing set with TTL
          redis.call('SETEX', processingKey, processingTtl, jobData)
          return 1
        else
          return 0
        end
      `;

      const processingKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'processing',
        job.id
      );

      const result = await redis.eval(
        processScript,
        [queueKey, processingKey],
        [jobData, QUEUE_CONSTANTS.TTL.PROCESSING.toString()]
      );

      if (result === 1) {
        // Update job with processing start time
        job.processingStartedAt = Date.now();

        const jobKey = createRedisKey(REDIS_PREFIXES.QUEUE, 'jobs', job.id);

        await redis.setex(
          jobKey,
          QUEUE_CONSTANTS.TTL.PROCESSING * 2,
          JSON.stringify(job)
        );

        return createServiceSuccess(job);
      } else {
        return createServiceSuccess(null);
      }
    } catch (error) {
      log.error(
        'Failed to get next job',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { queueName },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get next job'
      );
    }
  }

  /**
   * Complete a job successfully
   */
  async completeJob(
    jobId: string,
    result?: unknown
  ): Promise<ServiceResponse<void>> {
    try {
      const redis = getRedisClient();

      const processingKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'processing',
        jobId
      );

      // Remove from processing
      await redis.del(processingKey);

      // Store completion result
      const jobResult: JobResult = {
        jobId,
        success: true,
        result,
        completedAt: Date.now(),
      };

      const completedKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'completed',
        jobId
      );

      await redis.setex(
        completedKey,
        QUEUE_CONSTANTS.TTL.COMPLETED,
        JSON.stringify(jobResult)
      );

      log.debug('Job completed successfully', {
        metadata: { jobId },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to complete job',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { jobId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to complete job'
      );
    }
  }

  /**
   * Fail a job and handle retry logic
   */
  async failJob(job: JobData, error: string): Promise<ServiceResponse<void>> {
    try {
      const redis = getRedisClient();

      const processingKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'processing',
        job.id
      );

      // Remove from processing
      await redis.del(processingKey);

      job.attempts += 1;
      job.lastError = error;

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const retryDelay = Math.min(
          QUEUE_CONSTANTS.RETRY.BASE_DELAY *
            Math.pow(QUEUE_CONSTANTS.RETRY.EXPONENTIAL_BASE, job.attempts - 1),
          QUEUE_CONSTANTS.RETRY.MAX_DELAY
        );

        job.scheduledFor = Date.now() + retryDelay;

        // Add back to delayed queue for retry
        const queueNameFromType = job.type.split('-')[0] || 'default';
        const delayedKey = createRedisKey(
          REDIS_PREFIXES.QUEUE,
          'delayed',
          queueNameFromType
        );

        const retryScheduledFor = job.scheduledFor;
        if (retryScheduledFor === undefined) {
          throw new Error('scheduledFor is required for retry jobs');
        }

        await redis.zadd(delayedKey, {
          score: retryScheduledFor,
          member: JSON.stringify(job),
        });

        log.warn('Job failed, scheduling retry', {
          metadata: {
            jobId: job.id,
            attempt: job.attempts,
            maxAttempts: job.maxAttempts,
            retryDelay,
          },
        });
      } else {
        // Max attempts reached, move to dead letter queue
        const failedKey = createRedisKey(
          REDIS_PREFIXES.QUEUE,
          'failed',
          job.id
        );

        const jobResult: JobResult = {
          jobId: job.id,
          success: false,
          error,
          completedAt: Date.now(),
        };

        await redis.setex(
          failedKey,
          QUEUE_CONSTANTS.TTL.FAILED,
          JSON.stringify(jobResult)
        );

        log.error(
          'Job failed permanently after max attempts',
          new Error(error),
          {
            metadata: {
              jobId: job.id,
              attempts: job.attempts,
              maxAttempts: job.maxAttempts,
            },
          }
        );
      }

      // Update job record
      const jobKey = createRedisKey(REDIS_PREFIXES.QUEUE, 'jobs', job.id);

      await redis.setex(
        jobKey,
        QUEUE_CONSTANTS.TTL.PROCESSING * 2,
        JSON.stringify(job)
      );

      return createServiceSuccess(undefined);
    } catch (retryError) {
      log.error(
        'Failed to handle job failure',
        retryError instanceof Error
          ? retryError
          : new Error(String(retryError)),
        {
          metadata: { jobId: job.id, originalError: error },
        }
      );
      return createServiceError(
        retryError instanceof Error
          ? retryError.message
          : 'Failed to handle job failure'
      );
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<
    ServiceResponse<{
      pending: number;
      processing: number;
      delayed: number;
      completed: number;
      failed: number;
    }>
  > {
    try {
      const redis = getRedisClient();

      const [pending, processing, delayed, completed, failed] =
        await Promise.all([
          redis.zcard(
            createRedisKey(REDIS_PREFIXES.QUEUE, 'pending', queueName)
          ),
          redis
            .keys(createRedisKey(REDIS_PREFIXES.QUEUE, 'processing', '*'))
            .then(keys => keys.length),
          redis.zcard(
            createRedisKey(REDIS_PREFIXES.QUEUE, 'delayed', queueName)
          ),
          redis
            .keys(createRedisKey(REDIS_PREFIXES.QUEUE, 'completed', '*'))
            .then(keys => keys.length),
          redis
            .keys(createRedisKey(REDIS_PREFIXES.QUEUE, 'failed', '*'))
            .then(keys => keys.length),
        ]);

      return createServiceSuccess({
        pending,
        processing,
        delayed,
        completed,
        failed,
      });
    } catch (error) {
      log.error(
        'Failed to get queue stats',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { queueName },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get queue stats'
      );
    }
  }

  /**
   * Move delayed jobs to pending queue if their time has come
   */
  private async moveDelayedJobsToQueue(queueName: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const now = Date.now();

      const delayedKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'delayed',
        queueName
      );

      const queueKey = createRedisKey(
        REDIS_PREFIXES.QUEUE,
        'pending',
        queueName
      );

      // Get jobs that are ready to run
      const readyJobs = await redis.zrange(delayedKey, '-inf', now, {
        byScore: true,
        withScores: true,
      });

      for (let i = 0; i < readyJobs.length; i += 2) {
        const jobData = readyJobs[i] as string;

        // Handle invalid JSON data gracefully
        let parsedData;
        try {
          parsedData = JSON.parse(jobData);
        } catch (parseError) {
          log.warn('Invalid JSON data in delayed queue, skipping job', {
            metadata: {
              queueName,
              jobData: jobData.substring(0, 100), // Log first 100 chars only
              parseError:
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError),
            },
          });
          // Remove the invalid job and continue
          await redis.zrem(delayedKey, jobData);
          continue;
        }

        const job = jobDataSchema.parse(parsedData);

        // Move to pending queue with priority
        await redis.zadd(queueKey, { score: -job.priority, member: jobData });

        // Remove from delayed queue
        await redis.zrem(delayedKey, jobData);

        log.debug('Moved delayed job to pending queue', {
          metadata: { jobId: job.id, queueName },
        });
      }
    } catch (error) {
      log.error(
        'Failed to move delayed jobs',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { queueName },
        }
      );
      // Don't throw - this is background maintenance
    }
  }

  /**
   * Start the job processing loop for a queue
   */
  private async startProcessingLoop(
    queueName: string,
    options: QueueOptions
  ): Promise<void> {
    const processor = this.processors.get(queueName);
    if (!processor) {
      return;
    }

    while (this.activePolling.get(queueName)) {
      try {
        const nextJobResult = await this.getNextJob(queueName);

        if (nextJobResult.success && nextJobResult.data) {
          const job = nextJobResult.data;

          try {
            const startTime = Date.now();
            const result = await processor(job);
            const processingTime = Date.now() - startTime;

            await this.completeJob(job.id, result);

            log.debug('Job processed successfully', {
              metadata: {
                jobId: job.id,
                jobType: job.type,
                processingTime,
              },
            });
          } catch (processingError) {
            const errorMessage =
              processingError instanceof Error
                ? processingError.message
                : String(processingError);

            await this.failJob(job, errorMessage);

            log.error(
              'Job processing failed',
              processingError instanceof Error
                ? processingError
                : new Error(errorMessage),
              {
                metadata: { jobId: job.id, jobType: job.type },
              }
            );
          }
        } else {
          // No jobs available, wait before polling again
          await new Promise(resolve =>
            setTimeout(
              resolve,
              options.pollInterval || QUEUE_CONSTANTS.POLLING.INTERVAL
            )
          );
        }
      } catch (error) {
        log.error(
          'Error in processing loop',
          error instanceof Error ? error : new Error(String(error)),
          {
            metadata: { queueName },
          }
        );

        // Wait before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    log.info('Processing loop stopped', {
      metadata: { queueName },
    });
  }

  /**
   * Clean up expired jobs and stale processing entries
   */
  async cleanupExpiredJobs(): Promise<ServiceResponse<number>> {
    try {
      const redis = getRedisClient();
      let cleanedCount = 0;

      // Clean up stale processing jobs
      const processingKeys = await redis.keys(
        createRedisKey(REDIS_PREFIXES.QUEUE, 'processing', '*')
      );

      for (const key of processingKeys) {
        const ttl = await redis.ttl(key);
        if (ttl <= 0) {
          // Job has been processing too long, move back to pending or failed
          const jobData = await redis.get(key);
          if (jobData) {
            try {
              // Handle invalid JSON data gracefully
              let parsedData;
              try {
                parsedData = JSON.parse(jobData as string);
              } catch (parseError) {
                log.warn(
                  'Invalid JSON data in processing cleanup, removing job',
                  {
                    metadata: {
                      key,
                      jobData: (jobData as string).substring(0, 100), // Log first 100 chars only
                      parseError:
                        parseError instanceof Error
                          ? parseError.message
                          : String(parseError),
                    },
                  }
                );
                // Remove the invalid job
                await redis.del(key);
                cleanedCount++;
                continue;
              }

              const job = jobDataSchema.parse(parsedData);
              await this.failJob(job, 'Job processing timeout');
              cleanedCount++;
            } catch (parseError) {
              // Invalid job data, just delete the key
              await redis.del(key);
              cleanedCount++;
            }
          }
        }
      }

      log.debug('Cleaned up expired jobs', {
        metadata: { cleanedCount },
      });

      return createServiceSuccess(cleanedCount);
    } catch (error) {
      log.error(
        'Failed to cleanup expired jobs',
        error instanceof Error ? error : new Error(String(error))
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to cleanup expired jobs'
      );
    }
  }
}

// Export singleton instance
export const redisQueueService = new RedisQueueService();
