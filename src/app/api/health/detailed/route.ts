import { NextResponse } from 'next/server';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';
import { loadavg } from 'os';

interface DetailedHealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  latency?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
  last_checked: string;
}

interface SystemMetrics {
  memory: {
    heap_used: number;
    heap_total: number;
    heap_percentage: number;
    rss: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  load_average?: number[];
}

interface DetailedHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  deployment: {
    url?: string;
    region?: string;
    deployment_id?: string;
  };
  system: SystemMetrics;
  checks: DetailedHealthCheck[];
  summary: {
    total_checks: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    average_latency: number;
  };
}

/**
 * Detailed health check endpoint
 * Comprehensive system status including metrics and detailed checks
 * Primarily for monitoring dashboards and troubleshooting
 */
export async function GET(): Promise<NextResponse<DetailedHealthResponse>> {
  const checks: DetailedHealthCheck[] = [];

  // Database detailed check
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Test both read and connection pool
    const [profilesResult, authResult] = await Promise.allSettled([
      supabase.from('profiles').select('count').limit(1),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    const dbLatency = Date.now() - dbStart;
    const profilesOk =
      profilesResult.status === 'fulfilled' && !profilesResult.value.error;
    const authOk = authResult.status === 'fulfilled' && !authResult.value.error;

    checks.push({
      service: 'database',
      status: profilesOk && authOk ? 'healthy' : 'unhealthy',
      message:
        profilesOk && authOk
          ? 'Database and auth services OK'
          : 'Database or auth service degraded',
      latency: dbLatency,
      metadata: {
        profiles_check: profilesOk,
        auth_check: authOk,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      timestamp: new Date().toISOString(),
      last_checked: new Date().toISOString(),
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
      last_checked: new Date().toISOString(),
    });
  }

  // Redis detailed check
  if (isRedisConfigured()) {
    try {
      const redisStart = Date.now();
      const redis = getRedisClient();

      // Test multiple Redis operations
      const [pingResult, setResult, getResult] = await Promise.allSettled([
        redis.ping(),
        redis.set('health:test', 'ok', { ex: 10 }),
        redis.get('health:test'),
      ]);

      const redisLatency = Date.now() - redisStart;
      const allOk = [pingResult, setResult, getResult].every(
        result => result.status === 'fulfilled'
      );

      checks.push({
        service: 'redis',
        status: allOk ? 'healthy' : 'unhealthy',
        message: allOk ? 'Redis operations OK' : 'Redis operations degraded',
        latency: redisLatency,
        metadata: {
          ping_ok: pingResult.status === 'fulfilled',
          set_ok: setResult.status === 'fulfilled',
          get_ok: getResult.status === 'fulfilled',
          redis_url: process.env.UPSTASH_REDIS_REST_URL,
        },
        timestamp: new Date().toISOString(),
        last_checked: new Date().toISOString(),
      });
    } catch (error) {
      checks.push({
        service: 'redis',
        status: 'unhealthy',
        message: `Redis operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
        last_checked: new Date().toISOString(),
      });
    }
  } else {
    checks.push({
      service: 'redis',
      status: 'degraded',
      message: 'Redis not configured - running in degraded mode',
      metadata: {
        configured: false,
        impact: 'Caching and rate limiting disabled',
      },
      timestamp: new Date().toISOString(),
      last_checked: new Date().toISOString(),
    });
  }

  // External services check
  try {
    const extStart = Date.now();
    const [supabaseApi, sentryCheck] = await Promise.allSettled([
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      }),
      process.env.NEXT_PUBLIC_SENTRY_DSN
        ? fetch(
            process.env.NEXT_PUBLIC_SENTRY_DSN.split('@')[1]?.split('/')[0]
              ? `https://${process.env.NEXT_PUBLIC_SENTRY_DSN.split('@')[1]?.split('/')[0]}/api/0/`
              : 'https://sentry.io/api/0/'
          )
        : Promise.resolve({ ok: false, status: 0 }),
    ]);

    const extLatency = Date.now() - extStart;
    const supabaseOk =
      supabaseApi.status === 'fulfilled' && supabaseApi.value.ok;
    const sentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
    const sentryOk =
      !sentryConfigured ||
      (sentryCheck.status === 'fulfilled' && sentryCheck.value.ok);

    checks.push({
      service: 'external_services',
      status: supabaseOk && sentryOk ? 'healthy' : 'degraded',
      message:
        supabaseOk && sentryOk
          ? 'External services OK'
          : 'Some external services degraded',
      latency: extLatency,
      metadata: {
        supabase_api: supabaseOk,
        sentry_configured: sentryConfigured,
        sentry_reachable: sentryOk,
      },
      timestamp: new Date().toISOString(),
      last_checked: new Date().toISOString(),
    });
  } catch (error) {
    checks.push({
      service: 'external_services',
      status: 'degraded',
      message: `External services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
      last_checked: new Date().toISOString(),
    });
  }

  // System metrics
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const system: SystemMetrics = {
    memory: {
      heap_used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heap_total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heap_percentage: Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      ),
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000), // Convert microseconds to milliseconds
      system: Math.round(cpuUsage.system / 1000),
    },
    uptime: Math.floor(process.uptime()),
  };

  // Add load average if available (Unix systems)
  try {
    system.load_average = loadavg();
  } catch {
    // Load average not available on all systems
  }

  // Calculate summary
  const healthyCount = checks.filter(
    check => check.status === 'healthy'
  ).length;
  const unhealthyCount = checks.filter(
    check => check.status === 'unhealthy'
  ).length;
  const degradedCount = checks.filter(
    check => check.status === 'degraded'
  ).length;
  const avgLatency =
    checks
      .filter(check => check.latency !== undefined)
      .reduce((sum, check) => sum + (check.latency || 0), 0) /
      checks.filter(check => check.latency !== undefined).length || 0;

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const response: DetailedHealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      url: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL,
      region: process.env.VERCEL_REGION,
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID,
    },
    system,
    checks,
    summary: {
      total_checks: checks.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      degraded: degradedCount,
      average_latency: Math.round(avgLatency),
    },
  };

  return NextResponse.json(response, {
    status: overallStatus === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
