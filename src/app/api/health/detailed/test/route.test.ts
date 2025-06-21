/**
 * @jest-environment node
 */

import { GET } from '../route';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/redis');
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

// Mock OS module
jest.mock('os', () => ({
  loadavg: jest.fn(() => [0.1, 0.2, 0.3]),
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
const mockNextResponse = NextResponse.json as jest.MockedFunction<
  typeof NextResponse.json
>;

// Mock fetch for external services tests
global.fetch = jest.fn();

describe('Health Detailed Route', () => {
  const originalEnv = process.env;
  const mockRedisClient = {
    ping: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  };
  const mockSupabaseClient = {
    from: jest.fn(),
    auth: {
      admin: {
        listUsers: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.io/123',
      NODE_ENV: 'test',
      npm_package_version: '1.0.0',
      VERCEL_URL: 'test-deployment.vercel.app',
      VERCEL_REGION: 'iad1',
      VERCEL_DEPLOYMENT_ID: 'test-deployment-123',
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
    mockGetRedisClient.mockReturnValue(mockRedisClient as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Database Health Checks', () => {
    it('should report healthy database when all checks pass', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded', // degraded due to Redis not configured
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'database',
              status: 'healthy',
              message: 'Database and auth services OK',
            }),
          ]),
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should report unhealthy database when profiles check fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' },
          }),
        }),
      });

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'database',
              status: 'unhealthy',
              message: 'Database or auth service degraded',
            }),
          ]),
        }),
        expect.objectContaining({
          status: 503,
        })
      );
    });

    it('should report unhealthy database when auth check fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Auth failed' },
      });

      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'database',
              status: 'unhealthy',
              message: 'Database or auth service degraded',
            }),
          ]),
        }),
        expect.objectContaining({
          status: 503,
        })
      );
    });

    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'database',
              status: 'unhealthy',
              message: 'Database connection failed: Connection timeout',
              metadata: expect.objectContaining({
                error: 'Connection timeout',
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          status: 503,
        })
      );
    });

    it('should include latency measurements in database checks', async () => {
      const startTime = Date.now();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 50); // 50ms latency

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'database',
              status: 'healthy',
              latency: 50,
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('Redis Health Checks', () => {
    it('should report healthy Redis when configured and all operations pass', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('ok');

      // Mock database as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'redis',
              status: 'healthy',
              message: 'Redis operations OK',
              metadata: expect.objectContaining({
                ping_ok: true,
                set_ok: true,
                get_ok: true,
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should report unhealthy Redis when operations fail', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('ok');

      // Mock database as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'redis',
              status: 'unhealthy',
              message: 'Redis operations degraded',
              metadata: expect.objectContaining({
                ping_ok: false,
                set_ok: true,
                get_ok: true,
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          status: 503,
        })
      );
    });

    it('should report degraded status when Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      // Mock database as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'redis',
              status: 'degraded',
              message: 'Redis not configured - running in degraded mode',
              metadata: expect.objectContaining({
                configured: false,
                impact: 'Caching and rate limiting disabled',
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should handle Redis connection errors gracefully', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      // Mock database as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'redis',
              status: 'unhealthy',
              message: 'Redis operations failed: Redis connection failed',
              metadata: expect.objectContaining({
                error: 'Redis connection failed',
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          status: 503,
        })
      );
    });

    it('should include Redis URL in metadata', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('ok');

      // Mock database as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'redis',
              metadata: expect.objectContaining({
                redis_url: 'https://test-redis.upstash.io',
              }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('External Services Health Checks', () => {
    it('should report healthy external services when all checks pass', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Supabase API
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Sentry

      // Mock other services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'external_services',
              status: 'healthy',
              message: 'External services OK',
              metadata: expect.objectContaining({
                supabase_api: true,
                sentry_configured: true,
                sentry_reachable: true,
              }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should report degraded external services when Supabase API fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500 }) // Supabase API fails
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Sentry OK

      // Mock other services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'external_services',
              status: 'degraded',
              message: 'Some external services degraded',
              metadata: expect.objectContaining({
                supabase_api: false,
                sentry_configured: true,
                sentry_reachable: true,
              }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should handle missing Sentry configuration gracefully', async () => {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Supabase API

      // Mock other services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'external_services',
              status: 'healthy',
              message: 'External services OK',
              metadata: expect.objectContaining({
                supabase_api: true,
                sentry_configured: false,
                sentry_reachable: true, // Should be true when not configured
              }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should handle external services check errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Mock other services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'external_services',
              status: 'degraded',
              message: 'Some external services degraded',
              metadata: expect.objectContaining({
                supabase_api: false,
                sentry_reachable: false,
              }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('System Metrics', () => {
    it('should include comprehensive system metrics', async () => {
      // Mock process methods
      const mockMemoryUsage = {
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024, // 150MB
        external: 10 * 1024 * 1024, // 10MB
      };
      const mockCpuUsage = {
        user: 100000, // 100ms in microseconds
        system: 50000, // 50ms in microseconds
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
      jest.spyOn(process, 'cpuUsage').mockReturnValue(mockCpuUsage);
      jest.spyOn(process, 'uptime').mockReturnValue(3600); // 1 hour

      // Mock other services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          system: {
            memory: {
              heap_used: 50, // MB
              heap_total: 100, // MB
              heap_percentage: 50,
              rss: 150, // MB
              external: 10, // MB
            },
            cpu: {
              user: 100, // ms
              system: 50, // ms
            },
            uptime: 3600, // seconds
            load_average: [0.1, 0.2, 0.3],
          },
        }),
        expect.any(Object)
      );
    });

    it('should handle load average unavailability gracefully', async () => {
      const os = require('os');
      os.loadavg.mockImplementation(() => {
        throw new Error('Load average not available');
      });

      // Mock other services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.objectContaining({
            memory: expect.any(Object),
            cpu: expect.any(Object),
            uptime: expect.any(Number),
            // load_average should be undefined when not available
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('Response Structure', () => {
    it('should include all required response fields', async () => {
      // Mock all services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          version: '1.0.0',
          environment: 'test',
          deployment: {
            url: 'https://test-deployment.vercel.app',
            region: 'iad1',
            deployment_id: 'test-deployment-123',
          },
          system: expect.objectContaining({
            memory: expect.any(Object),
            cpu: expect.any(Object),
            uptime: expect.any(Number),
          }),
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: expect.any(String),
              status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
              message: expect.any(String),
              timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
              last_checked: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
            }),
          ]),
          summary: expect.objectContaining({
            total_checks: expect.any(Number),
            healthy: expect.any(Number),
            unhealthy: expect.any(Number),
            degraded: expect.any(Number),
            average_latency: expect.any(Number),
          }),
        }),
        expect.objectContaining({
          status: expect.any(Number),
          headers: expect.objectContaining({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          }),
        })
      );
    });

    it('should calculate summary statistics correctly', async () => {
      // Mock mixed health states
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false); // This will create degraded status

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            total_checks: 3, // database, redis, external_services
            healthy: 2, // database and external_services
            unhealthy: 0,
            degraded: 1, // redis not configured
            average_latency: expect.any(Number),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should return 503 status for unhealthy overall status', async () => {
      // Mock database as unhealthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' },
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
        }),
        expect.objectContaining({
          status: 503,
        })
      );
    });

    it('should return 200 status for degraded overall status', async () => {
      // Mock all services as healthy except Redis not configured (degraded)
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });

    it('should return 200 status for healthy overall status', async () => {
      // Mock all services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('ok');

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
        }),
        expect.objectContaining({
          status: 200,
        })
      );
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing environment variables gracefully', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.npm_package_version;
      delete process.env.VERCEL_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0.0', // fallback
          deployment: {
            url: undefined, // no fallback URL
            region: 'iad1',
            deployment_id: 'test-deployment-123',
          },
          checks: expect.arrayContaining([
            expect.objectContaining({
              service: 'database',
              metadata: expect.objectContaining({
                supabase_url: undefined, // undefined for missing URL
              }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('should use NEXT_PUBLIC_APP_URL when VERCEL_URL is not available', async () => {
      delete process.env.VERCEL_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://my-app.com';

      // Mock services as healthy
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ count: 1 }],
            error: null,
          }),
        }),
      });
      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      mockIsRedisConfigured.mockReturnValue(false);

      await GET();

      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          deployment: expect.objectContaining({
            url: 'https://my-app.com',
          }),
        }),
        expect.any(Object)
      );
    });
  });
});