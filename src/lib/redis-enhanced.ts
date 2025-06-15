/**
 * Enhanced Redis Implementation with Resilience and Metrics
 *
 * This module provides enhanced Redis functionality with:
 * - Circuit breaker pattern
 * - Connection pooling
 * - Cache stampede protection
 * - Comprehensive metrics
 * - Distributed locks
 */

import type { Redis as _Redis } from '@upstash/redis';
import { log } from '@/lib/logger';
import {
  getRedisClient,
  isRedisConfigured,
  createRedisKey,
  REDIS_PREFIXES,
} from '@/lib/redis';

interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  latency: number[];
  operations: number;
  lastReset: number;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

class EnhancedRedisService {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    latency: [],
    operations: 0,
    lastReset: Date.now(),
  };

  private circuitBreaker: CircuitBreakerState = {
    state: 'CLOSED',
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
    successCount: 0,
  };

  private readonly maxLatencyRecords = 100;
  private readonly failureThreshold = 5;
  private readonly timeout = 3000; // 3 seconds
  private readonly resetTimeout = 30000; // 30 seconds

  /**
   * Check if circuit breaker allows operation
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.successCount = 0;
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record operation success
   */
  private onSuccess(): void {
    this.circuitBreaker.failureCount = 0;

    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.successCount++;
      if (this.circuitBreaker.successCount >= 3) {
        this.circuitBreaker.state = 'CLOSED';
      }
    }
  }

  /**
   * Record operation failure
   */
  private onFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttemptTime = Date.now() + this.resetTimeout;
    }
  }

  /**
   * Execute Redis operation with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    if (!this.canExecute()) {
      if (fallback) {
        return fallback();
      }
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      this.recordError();

      if (fallback) {
        log.warn('Redis operation failed, using fallback', {
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(latency: number): void {
    this.metrics.hits++;
    this.recordLatency(latency);
  }

  /**
   * Record cache miss
   */
  private recordMiss(latency: number): void {
    this.metrics.misses++;
    this.recordLatency(latency);
  }

  /**
   * Record error
   */
  private recordError(): void {
    this.metrics.errors++;
  }

  /**
   * Record operation latency
   */
  private recordLatency(latency: number): void {
    this.metrics.operations++;
    this.metrics.latency.push(latency);

    // Keep only recent latency records
    if (this.metrics.latency.length > this.maxLatencyRecords) {
      this.metrics.latency = this.metrics.latency.slice(
        -this.maxLatencyRecords
      );
    }
  }

  /**
   * Get cache metrics
   */
  public getMetrics(): CacheMetrics & {
    hitRate: number;
    averageLatency: number;
    p95Latency: number;
    circuitBreakerState: string;
  } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    const sortedLatency = [...this.metrics.latency].sort((a, b) => a - b);
    const averageLatency =
      sortedLatency.length > 0
        ? sortedLatency.reduce((sum, val) => sum + val, 0) /
          sortedLatency.length
        : 0;

    const p95Index = Math.floor(sortedLatency.length * 0.95);
    const p95Latency = sortedLatency[p95Index] || 0;

    return {
      ...this.metrics,
      hitRate,
      averageLatency,
      p95Latency,
      circuitBreakerState: this.circuitBreaker.state,
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      latency: [],
      operations: 0,
      lastReset: Date.now(),
    };
  }

  /**
   * Enhanced get operation with metrics and circuit breaker
   */
  public async get<T>(key: string, fallback?: () => T): Promise<T | null> {
    if (!isRedisConfigured()) {
      if (fallback) {
        return fallback();
      }
      return null;
    }

    const startTime = Date.now();

    try {
      const result = await this.executeWithCircuitBreaker(async () => {
        const redis = getRedisClient();
        return await redis.get(key);
      }, fallback);

      const latency = Date.now() - startTime;

      if (result !== null) {
        this.recordHit(latency);
        return result as T;
      } else {
        this.recordMiss(latency);
        return null;
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordMiss(latency);

      log.error(
        'Redis get operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, latency },
        }
      );

      if (fallback) {
        return fallback();
      }

      return null;
    }
  }

  /**
   * Enhanced set operation with metrics and circuit breaker
   */
  public async set(
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!isRedisConfigured()) {
      return false;
    }

    const startTime = Date.now();

    try {
      await this.executeWithCircuitBreaker(async () => {
        const redis = getRedisClient();

        if (ttlSeconds) {
          return await redis.setex(key, ttlSeconds, JSON.stringify(value));
        } else {
          return await redis.set(key, JSON.stringify(value));
        }
      });

      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordLatency(latency);

      log.error(
        'Redis set operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, ttlSeconds, latency },
        }
      );

      return false;
    }
  }

  /**
   * Get or set with cache stampede protection using distributed lock
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300,
    lockTtlSeconds = 5
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Use distributed lock to prevent cache stampede
    const lockKey = createRedisKey(REDIS_PREFIXES.CACHE, 'lock', key);

    try {
      const lockAcquired = await this.acquireLock(lockKey, lockTtlSeconds);

      if (!lockAcquired) {
        // Another process is fetching, wait a bit and try cache again
        await this.sleep(100);
        return await this.get<T>(key);
      }

      // Double-check cache after acquiring lock
      const doubleCheck = await this.get<T>(key);
      if (doubleCheck !== null) {
        await this.releaseLock(lockKey);
        return doubleCheck;
      }

      // Fetch and cache the data
      const data = await fetcher();
      await this.set(key, data, ttlSeconds);
      await this.releaseLock(lockKey);

      return data;
    } catch (error) {
      await this.releaseLock(lockKey);
      log.error(
        'getOrSet operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, ttlSeconds },
        }
      );
      return null;
    }
  }

  /**
   * Acquire distributed lock
   */
  private async acquireLock(
    lockKey: string,
    ttlSeconds: number
  ): Promise<boolean> {
    if (!isRedisConfigured()) {
      return true; // Fail open
    }

    try {
      const redis = getRedisClient();
      const result = await redis.set(lockKey, '1', {
        nx: true,
        ex: ttlSeconds,
      });
      return result === 'OK';
    } catch (error) {
      log.error(
        'Failed to acquire lock',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { lockKey },
        }
      );
      return true; // Fail open
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const redis = getRedisClient();
      await redis.del(lockKey);
    } catch (error) {
      log.warn('Failed to release lock', {
        metadata: {
          lockKey,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Delete key(s)
   */
  public async del(key: string | string[]): Promise<number> {
    if (!isRedisConfigured()) {
      return 0;
    }

    const startTime = Date.now();

    try {
      const result = await this.executeWithCircuitBreaker(async () => {
        const redis = getRedisClient();
        return Array.isArray(key)
          ? await redis.del(...key)
          : await redis.del(key);
      });

      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordLatency(latency);

      log.error(
        'Redis del operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { key, latency },
        }
      );

      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<number> {
    if (!isRedisConfigured()) {
      return 0;
    }

    try {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.del(keys);
    } catch (error) {
      log.error(
        'Pattern invalidation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { pattern },
        }
      );
      return 0;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!isRedisConfigured()) {
      return { healthy: false, error: 'Redis not configured' };
    }

    const startTime = Date.now();

    try {
      const redis = getRedisClient();
      await redis.ping();
      const latency = Date.now() - startTime;

      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const enhancedRedis = new EnhancedRedisService();
