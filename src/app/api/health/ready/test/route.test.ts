/**
 * @jest-environment node
 */

import { GET } from '../route';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

// Mock external dependencies
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConfigured: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<typeof isRedisConfigured>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Environment variable setup
const originalEnv = process.env;

describe('GET /api/health/ready', () => {
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

  describe('All Dependencies Ready', () => {
    it('should return ready status when all dependencies are available', async () => {
      // Mock Redis configured and healthy
      mockIsRedisConfigured.mockReturnValue(true);
      const mockRedisClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
      };
      mockGetRedisClient.mockReturnValue(mockRedisClient as any);

      // Mock Supabase database healthy
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as any);

      // Mock Supabase API healthy
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ready: true,
        dependencies: {
          database: true,
          redis: true,
          supabase_api: true,
        },
        message: 'Application is ready to serve traffic',
      });
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return correct cache-control headers for ready status', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any);

      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });

  describe('Not Ready Status', () => {
    it('should return not ready when database is unavailable', async () => {
      // Mock Redis healthy
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any);

      // Mock database unhealthy
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: new Error('Database error'),
              }),
            }),
          }),
        }),
      } as any);

      // Mock Supabase API healthy
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        ready: false,
        dependencies: {
          database: false,
          redis: true,
          supabase_api: true,
        },
        message: 'Application is not ready - some dependencies are unavailable',
      });
    });

    it('should return not ready when Redis is unavailable', async () => {
      // Mock Redis configured but unhealthy
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      } as any);

      // Mock database healthy
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock Supabase API healthy
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        ready: false,
        dependencies: {
          database: true,
          redis: false,
          supabase_api: true,
        },
        message: 'Application is not ready - some dependencies are unavailable',
      });
    });

    it('should return not ready when Supabase API is unavailable', async () => {
      // Mock Redis healthy
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any);

      // Mock database healthy
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock Supabase API unhealthy
      mockFetch.mockResolvedValue({
        ok: false,
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        ready: false,
        dependencies: {
          database: true,
          redis: true,
          supabase_api: false,
        },
        message: 'Application is not ready - some dependencies are unavailable',
      });
    });

    it('should return not ready when multiple dependencies are unavailable', async () => {
      // Mock Redis unhealthy
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('Redis failed')),
      } as any);

      // Mock database unhealthy
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: new Error('Database failed'),
              }),
            }),
          }),
        }),
      } as any);

      // Mock Supabase API unhealthy
      mockFetch.mockRejectedValue(new Error('API failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        ready: false,
        dependencies: {
          database: false,
          redis: false,
          supabase_api: false,
        },
        message: 'Application is not ready - some dependencies are unavailable',
      });
    });
  });

  describe('Redis Configuration', () => {
    it('should handle Redis not configured (degraded mode)', async () => {
      // Mock Redis not configured
      mockIsRedisConfigured.mockReturnValue(false);

      // Mock database healthy
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock Supabase API healthy
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ready: true,
        dependencies: {
          database: true,
          redis: true, // Should be true in degraded mode
          supabase_api: true,
        },
        message: 'Application is ready to serve traffic',
      });

      // Redis client should not be called when not configured
      expect(mockGetRedisClient).not.toHaveBeenCalled();
    });

    it('should handle Redis ping returning non-PONG response', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockResolvedValue('UNEXPECTED'),
      } as any);

      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dependencies.redis).toBe(false);
    });
  });

  describe('Database Health Checks', () => {
    it('should query profiles table for database health check', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ error: null });
      const mockLimit = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockCreateClient.mockReturnValue({ from: mockFrom } as any);
      mockIsRedisConfigured.mockReturnValue(false); // Skip Redis
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await GET();

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('count');
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should handle database connection exception', async () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error('Supabase client creation failed');
      });

      mockIsRedisConfigured.mockReturnValue(false); // Skip Redis
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dependencies.database).toBe(false);
    });

    it('should use service role key for database connection', async () => {
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);

      mockIsRedisConfigured.mockReturnValue(false);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await GET();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key'
      );
    });
  });

  describe('Supabase API Health Checks', () => {
    it('should check Supabase API with correct headers', async () => {
      mockIsRedisConfigured.mockReturnValue(false); // Skip Redis
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);

      mockFetch.mockResolvedValue({ ok: true } as Response);

      await GET();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/',
        {
          headers: {
            apikey: 'test-anon-key',
          },
        }
      );
    });

    it('should handle Supabase API fetch exception', async () => {
      mockIsRedisConfigured.mockReturnValue(false); // Skip Redis
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);

      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dependencies.supabase_api).toBe(false);
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing NEXT_PUBLIC_SUPABASE_URL', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      mockIsRedisConfigured.mockReturnValue(false);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dependencies.database).toBe(false);
      expect(data.dependencies.supabase_api).toBe(false);
    });

    it('should handle missing SUPABASE_SERVICE_ROLE_KEY', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      mockIsRedisConfigured.mockReturnValue(false);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dependencies.database).toBe(false);
    });

    it('should handle missing NEXT_PUBLIC_SUPABASE_ANON_KEY', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      mockIsRedisConfigured.mockReturnValue(false);
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dependencies.supabase_api).toBe(false);
    });

    it('should handle all environment variables missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      mockIsRedisConfigured.mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        ready: false,
        dependencies: {
          database: false,
          redis: true, // Redis not configured, so marked as ready
          supabase_api: false,
        },
        message: 'Application is not ready - some dependencies are unavailable',
      });
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any);
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('ready');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('dependencies');
      expect(data).toHaveProperty('message');

      expect(data.dependencies).toHaveProperty('database');
      expect(data.dependencies).toHaveProperty('redis');
      expect(data.dependencies).toHaveProperty('supabase_api');

      expect(typeof data.ready).toBe('boolean');
      expect(typeof data.timestamp).toBe('string');
      expect(typeof data.dependencies).toBe('object');
      expect(typeof data.message).toBe('string');
    });

    it('should return valid ISO timestamp', async () => {
      mockIsRedisConfigured.mockReturnValue(false);
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
      expect(Date.now() - new Date(data.timestamp).getTime()).toBeLessThan(1000);
    });
  });

  describe('Performance', () => {
    it('should complete health checks in reasonable time', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockReturnValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any);
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const startTime = Date.now();
      await GET();
      const endTime = Date.now();

      // Readiness checks should complete quickly (under 5 seconds for integration tests)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});