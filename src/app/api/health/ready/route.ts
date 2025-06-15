import { NextResponse } from 'next/server';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

interface ReadinessResponse {
  ready: boolean;
  timestamp: string;
  dependencies: {
    database: boolean;
    redis: boolean;
    supabase_api: boolean;
  };
  message: string;
}

/**
 * Readiness probe endpoint
 * Checks if the application is ready to serve traffic
 * All critical dependencies must be available
 */
export async function GET(): Promise<NextResponse<ReadinessResponse>> {
  const dependencies = {
    database: false,
    redis: false,
    supabase_api: false,
  };

  // Check database readiness
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    dependencies.database = !error;
  } catch {
    dependencies.database = false;
  }

  // Check Redis readiness (if configured)
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      const result = await redis.ping();
      dependencies.redis = result === 'PONG';
    } catch {
      dependencies.redis = false;
    }
  } else {
    // If Redis is not configured, mark as ready (degraded mode)
    dependencies.redis = true;
  }

  // Check Supabase API readiness
  try {
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
    dependencies.supabase_api = response.ok;
  } catch {
    dependencies.supabase_api = false;
  }

  // Application is ready if all critical dependencies are available
  const isReady =
    dependencies.database && dependencies.redis && dependencies.supabase_api;

  const response: ReadinessResponse = {
    ready: isReady,
    timestamp: new Date().toISOString(),
    dependencies,
    message: isReady
      ? 'Application is ready to serve traffic'
      : 'Application is not ready - some dependencies are unavailable',
  };

  return NextResponse.json(response, {
    status: isReady ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
