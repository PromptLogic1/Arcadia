import { z } from 'zod';
import { log } from '@/lib/logger';

/**
 * Environment variable validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'Supabase service role key is required'),

  // Redis/Upstash (Required for production)
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url('Invalid Upstash Redis URL')
    .optional(),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, 'Upstash Redis token is required')
    .optional(),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Arcadia'),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),

  // Security
  REVALIDATE_TOKEN: z
    .string()
    .min(32, 'Revalidate token must be at least 32 characters'),
  SESSION_SECRET: z
    .string()
    .min(32, 'Session secret must be at least 32 characters'),

  // Sentry (Optional but recommended for production)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),

  // Deployment
  NEXT_PUBLIC_DEPLOYMENT_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Feature flags
  NEXT_PUBLIC_ENABLE_REALTIME: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup
 * Throws an error if required variables are missing or invalid
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);

    // Additional production-specific validations
    if (
      env.NODE_ENV === 'production' ||
      env.NEXT_PUBLIC_APP_ENV === 'production'
    ) {
      if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error('Redis configuration is required in production');
      }

      if (!env.NEXT_PUBLIC_SENTRY_DSN) {
        log.warn(
          'Sentry DSN not configured for production - error tracking will be disabled'
        );
      }

      if (!env.SENTRY_AUTH_TOKEN) {
        log.warn(
          'Sentry auth token not configured - source maps will not be uploaded'
        );
      }
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment validation failed:\n${missingVars}\n\n` +
          'Please check your .env.local file and ensure all required variables are set.'
      );
    }
    throw error;
  }
}

/**
 * Type-safe environment variable access
 * Use this instead of process.env to ensure type safety
 */
export const env = validateEnv();

/**
 * Helper to check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Helper to check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Helper to get the deployment URL
 */
export function getDeploymentUrl(): string {
  return (
    env.NEXT_PUBLIC_DEPLOYMENT_URL ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : env.NEXT_PUBLIC_APP_URL)
  );
}

/**
 * Helper to check if we're in production
 */
export function isProduction(): boolean {
  return (
    env.NODE_ENV === 'production' || env.NEXT_PUBLIC_APP_ENV === 'production'
  );
}

/**
 * Helper to check if we're in development
 */
export function isDevelopment(): boolean {
  return (
    env.NODE_ENV === 'development' && env.NEXT_PUBLIC_APP_ENV === 'development'
  );
}
