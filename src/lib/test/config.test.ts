/**
 * @jest-environment node
 */

import {
  getRuntimeConfig,
  getApiRuntimeConfig,
  validateServerEnv,
} from '../config';
import { get } from '@vercel/edge-config';

// Mock dependencies
jest.mock('@vercel/edge-config');

// Define test environment type
type TestProcessEnv = Partial<NodeJS.ProcessEnv> & {
  NODE_ENV?: 'development' | 'test' | 'production';
};

describe('config', () => {
  const originalEnv = process.env;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  // Helper to set process.env safely
  const setTestEnv = (env: TestProcessEnv): void => {
    // Clear current env and set new values
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    Object.assign(process.env, env);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment to original state
    setTestEnv({ ...originalEnv });
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    setTestEnv(originalEnv);
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('getRuntimeConfig', () => {
    it('should use edge config in production', async () => {
      setTestEnv({ NODE_ENV: 'production' });
      (get as jest.Mock).mockResolvedValue('edge-config-value');

      const result = await getRuntimeConfig('test-key');

      expect(result).toBe('edge-config-value');
      expect(get).toHaveBeenCalledWith('test-key');
    });

    it('should use environment variables in non-production', async () => {
      setTestEnv({ NODE_ENV: 'development', 'test-key': 'env-value' });

      const result = await getRuntimeConfig('test-key');

      expect(result).toBe('env-value');
      expect(get).not.toHaveBeenCalled();
    });

    it('should return undefined for missing env var in development', async () => {
      setTestEnv({ NODE_ENV: 'development' });

      const result = await getRuntimeConfig('missing-key');

      expect(result).toBeUndefined();
    });

    it('should handle edge config errors in production', async () => {
      setTestEnv({ NODE_ENV: 'production' });
      (get as jest.Mock).mockRejectedValue(new Error('Edge config error'));

      await expect(getRuntimeConfig('test-key')).rejects.toThrow(
        'Edge config error'
      );
    });
  });

  describe('getApiRuntimeConfig', () => {
    it('should return config when REVALIDATE_TOKEN is set', () => {
      setTestEnv({
        REVALIDATE_TOKEN: 'test-token-12345678901234567890123456789012',
        NODE_ENV: 'test',
      });

      const config = getApiRuntimeConfig();

      expect(config).toEqual({
        revalidateToken: 'test-token-12345678901234567890123456789012',
        allowedPaths: ['/', '/challenges', '/challenges/bingo-board'],
        environment: 'test',
      });
    });

    it('should throw error when REVALIDATE_TOKEN is missing', () => {
      setTestEnv({ NODE_ENV: 'test' });

      expect(() => getApiRuntimeConfig()).toThrow(
        'REVALIDATE_TOKEN environment variable is required'
      );
    });

    it('should use NODE_ENV for environment', () => {
      setTestEnv({
        REVALIDATE_TOKEN: 'test-token',
        NODE_ENV: 'production',
      });

      const config = getApiRuntimeConfig();

      expect(config.environment).toBe('production');
    });

    it('should default to development when NODE_ENV is not set', () => {
      setTestEnv({ REVALIDATE_TOKEN: 'test-token' });

      const config = getApiRuntimeConfig();

      expect(config.environment).toBe('development');
    });
  });

  describe('validateServerEnv', () => {
    const minimalValidEnv: TestProcessEnv = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      NEXT_PUBLIC_APP_URL: 'https://test.app.com',
      NODE_ENV: 'development',
    };

    it('should validate minimal valid environment', () => {
      setTestEnv(minimalValidEnv);

      const result = validateServerEnv();

      expect(result).toMatchObject({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_APP_URL: 'https://test.app.com',
        NEXT_PUBLIC_APP_NAME: 'Arcadia',
        NEXT_PUBLIC_APP_ENV: 'development',
        NODE_ENV: 'development',
      });
    });

    it('should validate complete environment with all optional fields', () => {
      setTestEnv({
        ...minimalValidEnv,
        NEXT_PUBLIC_APP_NAME: 'Custom App',
        NEXT_PUBLIC_APP_ENV: 'staging',
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NEXT_PUBLIC_SENTRY_DSN: 'https://sentry.io/dsn',
        SENTRY_AUTH_TOKEN: 'sentry-auth-token',
        SENTRY_ORG: 'test-org',
        SENTRY_PROJECT: 'test-project',
        NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'production',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_DEPLOYMENT_URL: 'https://deployment.vercel.app',
        VERCEL_URL: 'test.vercel.app',
        VERCEL_ENV: 'production',
      });

      const result = validateServerEnv();

      expect(result).toMatchObject({
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        SENTRY_ORG: 'test-org',
      });
    });

    it('should throw error for missing required fields', () => {
      setTestEnv({ NODE_ENV: 'test' });

      expect(() => validateServerEnv()).toThrow();
      expect(console.error).toHaveBeenCalledWith(
        '❌ Environment validation failed:'
      );
    });

    it('should throw error for invalid URL format', () => {
      setTestEnv({
        ...minimalValidEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      });

      expect(() => validateServerEnv()).toThrow();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('NEXT_PUBLIC_SUPABASE_URL')
      );
    });

    it('should throw error for empty required string', () => {
      setTestEnv({
        ...minimalValidEnv,
        SUPABASE_SERVICE_ROLE_KEY: '',
      });

      expect(() => validateServerEnv()).toThrow();
    });

    it('should throw error for invalid enum value', () => {
      setTestEnv({
        ...minimalValidEnv,
        NEXT_PUBLIC_APP_ENV: 'invalid-env',
      });

      expect(() => validateServerEnv()).toThrow();
    });

    it('should enforce Redis in production', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'production',
      });

      expect(() => validateServerEnv()).toThrow(
        'Redis configuration is REQUIRED in production'
      );
    });

    it('should enforce security tokens in production', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
      });

      expect(() => validateServerEnv()).toThrow(
        'Security tokens are REQUIRED in production'
      );
    });

    it('should validate production environment with all requirements', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
      });

      const result = validateServerEnv();

      expect(result.NODE_ENV).toBe('production');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Sentry is not configured for production')
      );
    });

    it('should warn about Sentry auth token in production', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_SENTRY_DSN: 'https://sentry.io/dsn',
      });

      validateServerEnv();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Sentry auth token not configured')
      );
    });

    it('should warn about Redis in development', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'development',
      });

      validateServerEnv();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis (Upstash) is not configured')
      );
    });

    it('should warn about Sentry in development', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'development',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
      });

      validateServerEnv();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Sentry is not configured')
      );
    });

    it('should not warn when all optional services are configured in development', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'development',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        NEXT_PUBLIC_SENTRY_DSN: 'https://sentry.io/dsn',
      });

      validateServerEnv();

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should validate tokens with exact minimum length', () => {
      setTestEnv({
        ...minimalValidEnv,
        REVALIDATE_TOKEN: 'a'.repeat(32),
        SESSION_SECRET: 'b'.repeat(32),
      });

      const result = validateServerEnv();

      expect(result.REVALIDATE_TOKEN).toHaveLength(32);
      expect(result.SESSION_SECRET).toHaveLength(32);
    });

    it('should reject tokens shorter than minimum length', () => {
      setTestEnv({
        ...minimalValidEnv,
        REVALIDATE_TOKEN: 'a'.repeat(31),
      });

      expect(() => validateServerEnv()).toThrow();
    });

    it('should consider NEXT_PUBLIC_APP_ENV for production check', () => {
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'production',
      });

      expect(() => validateServerEnv()).toThrow(
        'Redis configuration is REQUIRED in production'
      );
    });

    it('should handle non-Zod errors', () => {
      // Mock the validateServerEnv to throw after validation succeeds
      // We'll set up the env to pass validation but then throw in production check
      setTestEnv({
        ...minimalValidEnv,
        NODE_ENV: 'production',
        // Missing required production dependencies to trigger non-Zod error
      });

      expect(() => validateServerEnv()).toThrow(
        'Redis configuration is REQUIRED in production'
      );
      // This is a non-Zod error so it won't log the validation failed message
      // since the Zod parse succeeds
    });

    it('should handle multiple validation errors', () => {
      setTestEnv({
        NODE_ENV: 'test',
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
        // Missing other required fields
      });

      expect(() => validateServerEnv()).toThrow();
      // Check that multiple errors are logged
      expect(console.error).toHaveBeenCalled();
      const errorCalls = (console.error as jest.Mock).mock.calls;
      // First call is the header
      expect(errorCalls[0][0]).toBe('❌ Environment validation failed:');
      // Subsequent calls are the individual errors
      expect(errorCalls.length).toBeGreaterThan(1);
      // Check that we have errors for the invalid fields
      const errorMessages = errorCalls.slice(1).map(call => call[0]);
      expect(
        errorMessages.some(msg => msg.includes('NEXT_PUBLIC_SUPABASE_URL'))
      ).toBe(true);
      expect(
        errorMessages.some(msg => msg.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
      ).toBe(true);
    });
  });
});
