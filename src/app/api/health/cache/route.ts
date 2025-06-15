import { NextResponse } from 'next/server';
import { cacheMetrics } from '@/lib/cache-metrics';
import { redisCircuitBreaker } from '@/lib/circuit-breaker';
import { isRedisConfigured } from '@/lib/redis';

/**
 * Cache health and metrics endpoint
 * Provides detailed cache performance metrics and circuit breaker status
 */
export async function GET(): Promise<NextResponse> {
  // Get cache metrics
  const metrics = cacheMetrics.getSummary();
  const rawMetrics = cacheMetrics.getMetrics();

  // Get circuit breaker status
  const circuitBreakerMetrics = redisCircuitBreaker.getMetrics();

  const response = {
    status: circuitBreakerMetrics.isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    redis: {
      configured: isRedisConfigured(),
      circuitBreaker: {
        state: circuitBreakerMetrics.state,
        failures: circuitBreakerMetrics.failures,
        isHealthy: circuitBreakerMetrics.isHealthy,
        lastFailureTime: circuitBreakerMetrics.lastFailureTime
          ? new Date(circuitBreakerMetrics.lastFailureTime).toISOString()
          : null,
      },
    },
    metrics: {
      hitRate: `${metrics.hitRate.toFixed(2)}%`,
      missRate: `${metrics.missRate.toFixed(2)}%`,
      errorRate: `${metrics.errorRate.toFixed(2)}%`,
      avgLatency: `${metrics.avgLatency.toFixed(2)}ms`,
      totalOperations: metrics.totalOperations,
      uptimeMinutes: Math.floor(metrics.uptime / 60000),
      raw: {
        hits: rawMetrics.hits,
        misses: rawMetrics.misses,
        errors: rawMetrics.errors,
        sets: rawMetrics.sets,
        deletes: rawMetrics.deletes,
      },
    },
  };

  return NextResponse.json(response, {
    status: circuitBreakerMetrics.isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
