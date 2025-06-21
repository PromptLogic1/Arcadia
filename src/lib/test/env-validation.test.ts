/**
 * @jest-environment node
 */


// Mock the logger before importing the module
jest.mock('@/lib/logger', () => ({
  log: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { log } from '@/lib/logger';

// We need to test the functions that don't rely on the global env object
// since validateEnv() is called at module load time
describe('Environment Validation', () => {
  const originalEnv = process.env;
  const mockLog = log as jest.Mocked<typeof log>;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Reset process.env to a clean state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should validate required environment variables successfully', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'test', // Use test env instead of development
      };

      const { validateEnv } = await import('@/lib/env-validation');
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
      expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
      expect(result.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key');
      expect(result.NEXT_PUBLIC_APP_URL).toBe('https://test-app.com');
      expect(result.REVALIDATE_TOKEN).toBe('a'.repeat(32));
      expect(result.SESSION_SECRET).toBe('b'.repeat(32));
    });

    it('should apply default values for optional fields', async () => {
      // Explicitly remove all optional variables to test defaults
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'test',
        // Don't set optional fields to test defaults
      };
      
      // Explicitly unset optional fields
      delete process.env.NEXT_PUBLIC_APP_NAME;
      delete process.env.NEXT_PUBLIC_APP_ENV;
      delete process.env.NEXT_PUBLIC_ENABLE_REALTIME;
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { validateEnv } = await import('@/lib/env-validation');
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_APP_NAME).toBe('Arcadia');
      expect(result.NEXT_PUBLIC_APP_ENV).toBe('development');
      expect(result.NODE_ENV).toBe('test'); // Will be 'test' in Jest environment
      expect(result.NEXT_PUBLIC_ENABLE_REALTIME).toBe(true);
      expect(result.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true);
    });

    it('should throw error for missing required variables', async () => {
      // Set a minimal env then remove required variables
      process.env = {
        NODE_ENV: 'test',
      };

      // The import itself should throw because validateEnv() is called at module level
      await expect(import('@/lib/env-validation')).rejects.toThrow();
    });

    it('should throw error for invalid URL format', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'invalid-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'test',
      };

      // The import itself should throw because validateEnv() is called at module level
      await expect(import('@/lib/env-validation')).rejects.toThrow();
    });

    it('should throw error for short secrets', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'short',
        SESSION_SECRET: 'short',
        NODE_ENV: 'test',
      };

      // The import itself should throw because validateEnv() is called at module level
      await expect(import('@/lib/env-validation')).rejects.toThrow();
    });

    it('should require Redis configuration in production', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'production',
      };

      // The import itself should throw because validateEnv() is called at module level
      await expect(import('@/lib/env-validation')).rejects.toThrow();
    });

    it.skip('should warn about missing Sentry DSN in production', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
      };
      
      // Explicitly remove Sentry DSN
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      // Clear mocks and reset modules
      jest.clearAllMocks();
      jest.resetModules();
      
      // Import should trigger the warning during validateEnv() call at line 123
      await import('@/lib/env-validation');

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Sentry DSN not configured for production - error tracking will be disabled'
      );
    });

    it.skip('should warn about missing Sentry auth token in production', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NEXT_PUBLIC_SENTRY_DSN: 'https://sentry-dsn.sentry.io',
      };
      
      // Explicitly remove Sentry auth token
      delete process.env.SENTRY_AUTH_TOKEN;

      // Clear mocks and reset modules
      jest.clearAllMocks();
      jest.resetModules();
      
      // Import should trigger the warning during validateEnv() call at line 123
      await import('@/lib/env-validation');

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Sentry auth token not configured - source maps will not be uploaded'
      );
    });

    it('should transform string booleans correctly', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_ENABLE_REALTIME: 'false',
        NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      };

      const { validateEnv } = await import('@/lib/env-validation');
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_ENABLE_REALTIME).toBe(false);
      expect(result.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true);
    });

    it('should handle NEXT_PUBLIC_APP_ENV production check', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'production',
      };

      // The import itself should throw because validateEnv() is called at module level
      await expect(import('@/lib/env-validation')).rejects.toThrow();
    });
  });

  describe('isRedisConfigured', () => {
    it('should return true when both Redis URL and token are configured', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
      };

      const { validateEnv, isRedisConfigured } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isRedisConfigured(env)).toBe(true);
    });

    it('should return false when Redis URL is missing', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NODE_ENV: 'test',
      };
      
      // Explicitly delete Redis URL
      delete process.env.UPSTASH_REDIS_REST_URL;

      const { validateEnv, isRedisConfigured } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isRedisConfigured(env)).toBe(false);
    });

    it('should return false when Redis token is missing', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        NODE_ENV: 'test',
      };
      
      // Explicitly delete Redis token
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { validateEnv, isRedisConfigured } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isRedisConfigured(env)).toBe(false);
    });
  });

  describe('isSentryConfigured', () => {
    it('should return true when Sentry DSN is configured', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_SENTRY_DSN: 'https://sentry-dsn.sentry.io',
      };

      const { validateEnv, isSentryConfigured } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isSentryConfigured(env)).toBe(true);
    });

    it('should return false when Sentry DSN is missing', async () => {
      process.env = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'test',
      };
      
      // Explicitly delete Sentry DSN
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      const { validateEnv, isSentryConfigured } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isSentryConfigured(env)).toBe(false);
    });
  });

  describe('getDeploymentUrl', () => {
    it('should return NEXT_PUBLIC_DEPLOYMENT_URL when available', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_DEPLOYMENT_URL: 'https://deployment.vercel.app',
        VERCEL_URL: 'different-vercel.vercel.app',
      };

      const { validateEnv, getDeploymentUrl } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(getDeploymentUrl(env)).toBe('https://deployment.vercel.app');
    });

    it('should return formatted VERCEL_URL when DEPLOYMENT_URL is not available', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        VERCEL_URL: 'vercel-deployment.vercel.app',
      };

      const { validateEnv, getDeploymentUrl } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(getDeploymentUrl(env)).toBe('https://vercel-deployment.vercel.app');
    });

    it('should fallback to NEXT_PUBLIC_APP_URL when others are not available', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
      };

      const { validateEnv, getDeploymentUrl } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(getDeploymentUrl(env)).toBe('https://test-app.com');
    });
  });

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'development',
      };

      const { validateEnv, isProduction } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isProduction(env)).toBe(true);
    });

    it('should return true when NEXT_PUBLIC_APP_ENV is production', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'production',
      };

      const { validateEnv, isProduction } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isProduction(env)).toBe(true);
    });

    it('should return false when neither environment is production', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'staging',
      };

      const { validateEnv, isProduction } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isProduction(env)).toBe(false);
    });
  });

  describe('isDevelopment', () => {
    it('should return true when both NODE_ENV and NEXT_PUBLIC_APP_ENV are development', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'development',
      };

      const { validateEnv, isDevelopment } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isDevelopment(env)).toBe(true);
    });

    it('should return false when NODE_ENV is not development', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        UPSTASH_REDIS_REST_URL: 'https://redis-url.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'development',
      };

      const { validateEnv, isDevelopment } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isDevelopment(env)).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_APP_ENV is not development', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test-app.com',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'staging',
      };

      const { validateEnv, isDevelopment } = await import('@/lib/env-validation');
      const env = validateEnv();
      expect(isDevelopment(env)).toBe(false);
    });
  });
});