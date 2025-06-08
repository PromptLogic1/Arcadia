import { get } from '@vercel/edge-config';
import { z } from 'zod';

// Edge config runtime getter
export const getRuntimeConfig = async (key: string) => {
  return process.env.NODE_ENV === 'production'
    ? await get(key)
    : process.env[key];
};

// Runtime config for API routes
interface RuntimeApiConfig {
  revalidateToken: string;
  allowedPaths: string[];
  environment: string;
}

export function getApiRuntimeConfig(): RuntimeApiConfig {
  const revalidateToken = process.env.REVALIDATE_TOKEN;
  if (!revalidateToken) {
    throw new Error('REVALIDATE_TOKEN environment variable is required');
  }

  return {
    revalidateToken,
    allowedPaths: ['/', '/challenges', '/challenges/bingo-board'],
    environment: process.env.NODE_ENV || 'development',
  };
}

// Server environment validation
const ServerEnvSchema = z.object({
  // Required: Supabase (handles both database and auth)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Optional: Upstash Redis (for rate limiting and caching)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Optional: Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

  // Optional: Revalidation token
  REVALIDATE_TOKEN: z.string().min(1).optional(),
});

export const validateServerEnv = () => {
  try {
    const result = ServerEnvSchema.parse(process.env);

    // Warn if Redis is not configured
    if (!result.UPSTASH_REDIS_REST_URL || !result.UPSTASH_REDIS_REST_TOKEN) {
      console.warn(
        '⚠️  Redis (Upstash) is not configured. Rate limiting and caching will be disabled.'
      );
    }

    // Warn if Sentry is not configured
    if (!result.NEXT_PUBLIC_SENTRY_DSN) {
      console.warn(
        '⚠️  Sentry is not configured. Error tracking will be disabled.'
      );
    }

    return result;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
};
