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

  // Required: Application Config
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Arcadia'),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Optional: Upstash Redis (required in production)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Optional: Sentry (highly recommended in production)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),

  // Security tokens
  REVALIDATE_TOKEN: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),

  // Deployment
  NEXT_PUBLIC_DEPLOYMENT_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
});

export const validateServerEnv = () => {
  try {
    const result = ServerEnvSchema.parse(process.env);

    const isProduction =
      result.NODE_ENV === 'production' ||
      result.NEXT_PUBLIC_APP_ENV === 'production';

    // Production-specific requirements
    if (isProduction) {
      // Redis is required in production
      if (!result.UPSTASH_REDIS_REST_URL || !result.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error(
          'Redis configuration is REQUIRED in production. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
        );
      }

      // Security tokens are required in production
      if (!result.REVALIDATE_TOKEN || !result.SESSION_SECRET) {
        throw new Error(
          'Security tokens are REQUIRED in production. Please set REVALIDATE_TOKEN and SESSION_SECRET (minimum 32 characters each).'
        );
      }

      // Sentry is highly recommended in production
      if (!result.NEXT_PUBLIC_SENTRY_DSN) {
        console.warn(
          '⚠️  WARNING: Sentry is not configured for production. Error tracking will be disabled.'
        );
      }

      if (result.NEXT_PUBLIC_SENTRY_DSN && !result.SENTRY_AUTH_TOKEN) {
        console.warn(
          '⚠️  WARNING: Sentry auth token not configured. Source maps will not be uploaded.'
        );
      }
    } else {
      // Development warnings
      if (!result.UPSTASH_REDIS_REST_URL || !result.UPSTASH_REDIS_REST_TOKEN) {
        console.warn(
          '⚠️  Redis (Upstash) is not configured. Rate limiting and caching will be disabled.'
        );
      }

      if (!result.NEXT_PUBLIC_SENTRY_DSN) {
        console.warn(
          '⚠️  Sentry is not configured. Error tracking will be disabled.'
        );
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw error;
  }
};
