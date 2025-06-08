/**
 * Redis Test API Route
 *
 * Simple endpoint to test Redis connection and basic rate limiting.
 * This demonstrates the minimal Redis setup in action.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { testRedisConnection } from '@/lib/redis';
import {
  rateLimitingService,
  withRateLimit,
} from '@/services/rate-limiting.service';
import { redisService, cacheService } from '@/services/redis.service';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/redis-test
 *
 * Tests Redis connection, basic operations, and rate limiting
 */
export async function GET(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      interface TestResult {
        success: boolean;
        message?: string;
        error?: string;
        duration?: number;
        data?: unknown;
      }

      const testResults = {
        timestamp: new Date().toISOString(),
        connection: null as TestResult | null,
        basicOperations: null as TestResult | null,
        caching: null as TestResult | null,
        rateLimit: null as TestResult | null,
      };

      try {
        // Test 1: Redis connection
        log.info('Testing Redis connection');
        const connectionTest = await testRedisConnection();
        testResults.connection = {
          success: connectionTest.success,
          message: connectionTest.data,
          error: connectionTest.error?.message,
        };

        // Test 2: Basic Redis operations
        log.info('Testing basic Redis operations');
        const testKey = `test:${Date.now()}`;

        // Zod schema for validation (project's preferred pattern)
        const TestDataSchema = z.object({
          message: z.string(),
          timestamp: z.number(),
        });

        type TestData = z.infer<typeof TestDataSchema>;

        const testData: TestData = {
          message: 'Hello Redis!',
          timestamp: Date.now(),
        };

        // Set data
        const setResult = await redisService.set(testKey, testData, 30);

        // Get data with Zod schema validation
        const getResult = await redisService.getWithSchema(
          testKey,
          TestDataSchema
        );

        // Check if exists
        const existsResult = await redisService.exists(testKey);

        // Delete data
        const deleteResult = await redisService.delete(testKey);

        testResults.basicOperations = {
          success:
            setResult.success &&
            getResult.success &&
            getResult.data?.message === testData.message &&
            existsResult.success &&
            existsResult.data === true &&
            deleteResult.success &&
            deleteResult.data === 1,
          data: {
            set: setResult.success,
            get:
              getResult.success && getResult.data?.message === testData.message,
            exists: existsResult.success && existsResult.data === true,
            delete: deleteResult.success && deleteResult.data === 1,
          },
        };

        // Test 3: Caching service
        log.info('Testing caching service');
        const cacheKey = cacheService.createKey('test', 'demo');

        const cached = await cacheService.getOrSet(
          cacheKey,
          async () => {
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow operation
            return { cached: true, fetchedAt: Date.now() };
          },
          60
        );

        testResults.caching = {
          success: cached.success,
          data: cached.data,
        };

        // Clean up cache test
        await cacheService.invalidate(cacheKey);

        // Test 4: Rate limiting info (current status)
        log.info('Testing rate limiting status');
        const identifier = rateLimitingService.getIdentifier(request);
        const rateLimitStatus =
          await rateLimitingService.checkApiLimit(identifier);

        testResults.rateLimit = {
          success: rateLimitStatus.success,
          data: rateLimitStatus.data,
        };

        log.info('Redis tests completed successfully', {
          metadata: { testResults },
        });

        return NextResponse.json({
          success: true,
          message: 'Redis is working correctly!',
          tests: testResults,
        });
      } catch (error) {
        log.error(
          'Redis test failed',
          error instanceof Error ? error : new Error(String(error))
        );

        return NextResponse.json(
          {
            success: false,
            error: 'Redis test failed',
            tests: testResults,
          },
          { status: 500 }
        );
      }
    },
    'api' // Use API rate limiting
  ).then(result => {
    if (!result.success) {
      const error = result.error;
      if (typeof error === 'string' && error.includes('RATE_LIMIT_EXCEEDED')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: typeof error === 'string' ? error : 'Request failed',
        },
        { status: 500 }
      );
    }

    return result.data;
  });
}

/**
 * POST /api/redis-test
 *
 * Tests Redis counter operations and auth rate limiting
 */
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      const counterKey = 'test:counter';

      // Increment counter
      const incrementResult = await redisService.increment(counterKey);

      // Set expiration if this is the first increment
      if (incrementResult.success && incrementResult.data === 1) {
        await redisService.expire(counterKey, 300); // 5 minutes
      }

      log.info('Counter incremented', {
        metadata: {
          counter: incrementResult.data,
          success: incrementResult.success,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Counter incremented',
        counter: incrementResult.data,
      });
    },
    'auth' // Use auth rate limiting (stricter)
  ).then(result => {
    if (!result.success) {
      const error = result.error;
      if (typeof error === 'string' && error.includes('RATE_LIMIT_EXCEEDED')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: typeof error === 'string' ? error : 'Request failed',
        },
        { status: 500 }
      );
    }

    return result.data;
  });
}
