/**
 * Redis Configuration - Minimal Setup
 *
 * This file provides the basic Redis client configuration for Upstash.
 * Uses environment variables for configuration and follows the service layer pattern.
 */

import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';

// Redis client instance - initialized once
let redisClient: Redis | null = null;

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return !!(url && token);
}

/**
 * Get Redis client instance with production-ready configuration
 * Uses singleton pattern to ensure single connection
 *
 * IMPORTANT: Always call isRedisConfigured() before calling this function!
 */
export function getRedisClient(): Redis {
  // Check if running in browser environment
  if (typeof window !== 'undefined') {
    const error = new Error(
      'Redis client cannot be initialized in browser environment. Redis operations are server-side only.'
    );
    log.error('Attempted to initialize Redis client in browser', error, {
      metadata: {
        environment: 'browser',
        stack: new Error().stack,
      },
    });
    throw error;
  }

  // Always check configuration first - this should never be called without checking
  if (!isRedisConfigured()) {
    const error = new Error(
      'Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
    );
    log.warn(
      'getRedisClient() called without checking isRedisConfigured() first',
      {
        metadata: {
          error: error.message,
          warning: 'This should be checked before calling getRedisClient()',
        },
      }
    );
    throw error;
  }

  if (!redisClient) {
    // Enhanced configuration with retry logic and performance optimizations
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Double-check since we already verified in isRedisConfigured()
    if (!url || !token) {
      const error = new Error(
        'Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
      );
      log.warn(
        'Redis configuration missing - cache operations will be skipped',
        {
          metadata: {
            hasUrl: !!url,
            hasToken: !!token,
            error: error.message,
          },
        }
      );
      throw error;
    }

    try {
      redisClient = new Redis({
        url,
        token,
        retry: {
          retries: 3,
          backoff: retryCount => Math.min(Math.pow(2, retryCount) * 50, 1000),
        },
        automaticDeserialization: false, // Better performance for our use case
      });

      log.info('Redis client initialized successfully');
    } catch (error) {
      log.error(
        'Failed to initialize Redis client',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { error },
        }
      );
      const configError = new Error(
        'Redis configuration failed. Check environment variables.'
      );
      throw configError;
    }
  }

  return redisClient;
}

/**
 * Key naming constants for consistent prefixing
 */
export const REDIS_PREFIXES = {
  RATE_LIMIT: '@arcadia/rate-limit',
  CACHE: '@arcadia/cache',
  SESSION: '@arcadia/session',
  PRESENCE: '@arcadia/presence',
  QUEUE: '@arcadia/queue',
} as const;

/**
 * Helper function to create consistent Redis keys
 */
export function createRedisKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

/**
 * Redis operation response type
 */
export interface RedisOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Redis connection health check and recovery
 */
export async function ensureRedisConnection(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return true;
  } catch (error) {
    log.error(
      'Redis health check failed',
      error instanceof Error ? error : new Error(String(error))
    );
    // Reset client to force reconnection
    redisClient = null;
    return false;
  }
}

/**
 * Test Redis connection with comprehensive validation
 */
export async function testRedisConnection(): Promise<
  RedisOperationResult<string>
> {
  try {
    // First check basic connectivity
    const isHealthy = await ensureRedisConnection();
    if (!isHealthy) {
      throw new Error('Redis health check failed');
    }

    const redis = getRedisClient();
    const testKey = createRedisKey(
      '@arcadia/test',
      'connection',
      Date.now().toString()
    );
    const testValue = 'connection-test';

    // Set and get test value
    await redis.setex(testKey, 10, testValue);
    const result = await redis.get(testKey);

    // Clean up test key
    await redis.del(testKey);

    if (result === testValue) {
      log.info('Redis connection test successful');
      return { success: true, data: 'Redis connection working' };
    } else {
      throw new Error('Redis test value mismatch');
    }
  } catch (error) {
    log.error(
      'Redis connection test failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        metadata: { error },
      }
    );
    return {
      success: false,
      error: {
        code: 'REDIS_CONNECTION_FAILED',
        message: 'Unable to connect to Redis',
      },
    };
  }
}
