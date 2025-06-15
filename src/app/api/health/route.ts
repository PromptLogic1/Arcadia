import { NextResponse } from 'next/server';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  latency?: number;
  timestamp: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: HealthCheck[];
  overall: {
    healthy: number;
    unhealthy: number;
    total: number;
  };
}

/**
 * Health check endpoint - Basic service availability
 * Used by load balancers and monitoring systems
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: HealthCheck[] = [];

  // Database health check
  try {
    const dbStart = Date.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simple query to check database connectivity
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    const dbLatency = Date.now() - dbStart;

    checks.push({
      service: 'database',
      status: error ? 'unhealthy' : 'healthy',
      message: error
        ? `Database error: ${error.message}`
        : 'Database connection OK',
      latency: dbLatency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Redis health check (if configured)
  if (isRedisConfigured()) {
    try {
      const redisStart = Date.now();
      const redis = getRedisClient();
      const result = await redis.ping();
      const redisLatency = Date.now() - redisStart;

      checks.push({
        service: 'redis',
        status: result === 'PONG' ? 'healthy' : 'unhealthy',
        message:
          result === 'PONG' ? 'Redis connection OK' : 'Redis ping failed',
        latency: redisLatency,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      checks.push({
        service: 'redis',
        status: 'unhealthy',
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    checks.push({
      service: 'redis',
      status: 'degraded',
      message: 'Redis not configured - caching disabled',
      timestamp: new Date().toISOString(),
    });
  }

  // Supabase API health check
  try {
    const apiStart = Date.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
      },
    });
    const apiLatency = Date.now() - apiStart;

    checks.push({
      service: 'supabase_api',
      status: response.ok ? 'healthy' : 'unhealthy',
      message: response.ok
        ? 'Supabase API OK'
        : `Supabase API error: ${response.status}`,
      latency: apiLatency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    checks.push({
      service: 'supabase_api',
      status: 'unhealthy',
      message: `Supabase API failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Calculate overall health
  const healthyCount = checks.filter(
    check => check.status === 'healthy'
  ).length;
  const unhealthyCount = checks.filter(
    check => check.status === 'unhealthy'
  ).length;
  const degradedCount = checks.filter(
    check => check.status === 'degraded'
  ).length;

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    checks,
    overall: {
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      total: checks.length,
    },
  };

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
