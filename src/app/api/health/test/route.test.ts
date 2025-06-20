/**
 * @jest-environment node
 */

import { GET } from '../route';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));
jest.mock('@supabase/supabase-js');
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: init?.headers,
    })),
  },
}));

const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
  typeof isRedisConfigured
>;
const mockGetRedisClient = getRedisClient as jest.MockedFunction<
  typeof getRedisClient
>;
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe('Health Check Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when all services are healthy', () => {
    it('returns healthy status with all checks passing', async () => {
      // Mock Supabase client
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ error: null }),
      };
      mockCreateClient.mockReturnValue(mockSupabaseClient as any);

      // Mock Redis
      mockIsRedisConfigured.mockReturnValue(true);
      const mockRedisClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
      };
      mockGetRedisClient.mockReturnValue(mockRedisClient as any);

      // Mock fetch for Supabase API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.checks).toHaveLength(3);
      expect(
        data.checks.every((check: any) => check.status === 'healthy')
      ).toBe(true);
      expect(data.overall.healthy).toBe(3);
      expect(data.overall.unhealthy).toBe(0);
      expect(response.status).toBe(200);
    });
  });

  describe('when database is unhealthy', () => {
    it('returns unhealthy status when database query fails', async () => {
      // Mock Supabase client with error
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          error: new Error('Database connection failed'),
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabaseClient as any);

      // Mock healthy Redis
      mockIsRedisConfigured.mockReturnValue(true);
      const mockRedisClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
      };
      mockGetRedisClient.mockReturnValue(mockRedisClient as any);

      // Mock healthy Supabase API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(
        data.checks.find((check: any) => check.service === 'database').status
      ).toBe('unhealthy');
      expect(data.overall.unhealthy).toBe(1);
      expect(response.status).toBe(503);
    });
  });

  describe('when Redis is not configured', () => {
    it('returns degraded status when Redis is not configured', async () => {
      // Mock healthy Supabase
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ error: null }),
      };
      mockCreateClient.mockReturnValue(mockSupabaseClient as any);

      // Mock Redis not configured
      mockIsRedisConfigured.mockReturnValue(false);

      // Mock healthy Supabase API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('degraded');
      expect(
        data.checks.find((check: any) => check.service === 'redis').status
      ).toBe('degraded');
      expect(response.status).toBe(200);
    });
  });

  describe('when environment variables are missing', () => {
    it('returns unhealthy when Supabase env vars are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      mockIsRedisConfigured.mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(
        data.checks.find((check: any) => check.service === 'database').status
      ).toBe('unhealthy');
      expect(
        data.checks.find((check: any) => check.service === 'database').message
      ).toContain('Missing Supabase environment variables');
    });
  });

  describe('response headers', () => {
    it('includes cache control headers', async () => {
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      mockIsRedisConfigured.mockReturnValue(false);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await GET();

      expect(response.headers).toEqual({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
    });
  });
});
