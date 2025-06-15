/**
 * Cache Metrics Tracking
 *
 * Tracks cache hit/miss rates and performance metrics
 * for monitoring and optimization purposes.
 */

import { log } from '@/lib/logger';

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  sets: number;
  deletes: number;
  totalLatency: number;
  operationCount: number;
  startTime: number;
}

export interface CacheMetricsSummary {
  hitRate: number;
  missRate: number;
  errorRate: number;
  avgLatency: number;
  totalOperations: number;
  uptime: number;
}

class CacheMetricsTracker {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    sets: 0,
    deletes: 0,
    totalLatency: 0,
    operationCount: 0,
    startTime: Date.now(),
  };

  /**
   * Record a cache hit
   */
  recordHit(latency: number): void {
    this.metrics.hits++;
    this.metrics.totalLatency += latency;
    this.metrics.operationCount++;
  }

  /**
   * Record a cache miss
   */
  recordMiss(latency: number): void {
    this.metrics.misses++;
    this.metrics.totalLatency += latency;
    this.metrics.operationCount++;
  }

  /**
   * Record a cache error
   */
  recordError(latency: number): void {
    this.metrics.errors++;
    this.metrics.totalLatency += latency;
    this.metrics.operationCount++;
  }

  /**
   * Record a cache set operation
   */
  recordSet(latency: number): void {
    this.metrics.sets++;
    this.metrics.totalLatency += latency;
    this.metrics.operationCount++;
  }

  /**
   * Record a cache delete operation
   */
  recordDelete(latency: number): void {
    this.metrics.deletes++;
    this.metrics.totalLatency += latency;
    this.metrics.operationCount++;
  }

  /**
   * Get current metrics summary
   */
  getSummary(): CacheMetricsSummary {
    const totalCacheOperations = this.metrics.hits + this.metrics.misses;
    const hitRate =
      totalCacheOperations > 0
        ? (this.metrics.hits / totalCacheOperations) * 100
        : 0;
    const missRate =
      totalCacheOperations > 0
        ? (this.metrics.misses / totalCacheOperations) * 100
        : 0;
    const errorRate =
      this.metrics.operationCount > 0
        ? (this.metrics.errors / this.metrics.operationCount) * 100
        : 0;
    const avgLatency =
      this.metrics.operationCount > 0
        ? this.metrics.totalLatency / this.metrics.operationCount
        : 0;
    const uptime = Date.now() - this.metrics.startTime;

    return {
      hitRate,
      missRate,
      errorRate,
      avgLatency,
      totalOperations: this.metrics.operationCount,
      uptime,
    };
  }

  /**
   * Get raw metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
      totalLatency: 0,
      operationCount: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Log metrics summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    log.info('Cache metrics summary', {
      metadata: {
        hitRate: `${summary.hitRate.toFixed(2)}%`,
        missRate: `${summary.missRate.toFixed(2)}%`,
        errorRate: `${summary.errorRate.toFixed(2)}%`,
        avgLatency: `${summary.avgLatency.toFixed(2)}ms`,
        totalOperations: summary.totalOperations,
        uptimeMinutes: Math.floor(summary.uptime / 60000),
      },
    });
  }

  /**
   * Report metrics to monitoring service (e.g., Sentry)
   */
  async reportMetrics(): Promise<void> {
    const summary = this.getSummary();

    // Report to Sentry if available
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        const { setContext, addBreadcrumb } = await import('@sentry/nextjs');

        // Set cache metrics as context
        const rawMetrics = this.getMetrics();
        setContext('cache_metrics', {
          hitRate: summary.hitRate,
          avgLatency: summary.avgLatency,
          totalOperations: summary.totalOperations,
          hits: rawMetrics.hits,
          misses: rawMetrics.misses,
          errors: rawMetrics.errors,
          cacheType: 'redis',
        });

        // Add breadcrumb for tracking
        addBreadcrumb({
          message: 'Cache metrics reported',
          category: 'cache',
          level: 'info',
          data: {
            hitRate: `${summary.hitRate.toFixed(2)}%`,
            avgLatency: `${summary.avgLatency.toFixed(2)}ms`,
            totalOperations: summary.totalOperations,
          },
        });
      } catch (error) {
        log.debug('Failed to report cache metrics to Sentry', {
          metadata: { error },
        });
      }
    }
  }
}

/**
 * Global cache metrics instance
 */
export const cacheMetrics = new CacheMetricsTracker();

/**
 * Scheduled metrics reporting (every 5 minutes)
 */
if (typeof window === 'undefined') {
  setInterval(
    () => {
      cacheMetrics.logSummary();
      cacheMetrics.reportMetrics().catch(() => {
        // Ignore reporting errors
      });
    },
    5 * 60 * 1000
  ); // 5 minutes
}

/**
 * Helper to measure operation latency
 */
export function measureLatency(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
