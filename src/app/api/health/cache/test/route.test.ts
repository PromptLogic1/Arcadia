/**
 * @jest-environment node
 */

import { GET } from '../route';
import { cacheMetrics } from '@/lib/cache-metrics';
import { redisCircuitBreaker, CircuitState } from '@/lib/circuit-breaker';
import { isRedisConfigured } from '@/lib/redis';

// Mock external dependencies
jest.mock('@/lib/cache-metrics', () => ({
  cacheMetrics: {
    getSummary: jest.fn(),
    getMetrics: jest.fn(),
  },
}));

jest.mock('@/lib/circuit-breaker', () => ({
  redisCircuitBreaker: {
    getMetrics: jest.fn(),
  },
  CircuitState: {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
  },
}));

jest.mock('@/lib/redis', () => ({
  isRedisConfigured: jest.fn(),
}));

const mockCacheMetrics = cacheMetrics as jest.Mocked<typeof cacheMetrics>;
const mockRedisCircuitBreaker = redisCircuitBreaker as jest.Mocked<typeof redisCircuitBreaker>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<typeof isRedisConfigured>;

// Helper to create complete CacheMetrics mock data
const createCacheMetrics = (hits: number, misses: number, errors: number, sets: number, deletes: number, uptime = 3600000) => ({
  hits,
  misses,
  errors,
  sets,
  deletes,
  totalLatency: (hits + misses) * 12.5, // Average 12.5ms per operation
  operationCount: hits + misses,
  startTime: Date.now() - uptime,
});

describe('GET /api/health/cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Healthy Cache Status', () => {
    it('should return healthy status when circuit breaker is healthy', async () => {
      // Mock healthy state
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 85.5,
        missRate: 14.5,
        errorRate: 0.1,
        avgLatency: 12.5,
        totalOperations: 1000,
        uptime: 3600000, // 1 hour in ms
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(855, 145, 1, 200, 50, 3600000));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'healthy',
        redis: {
          configured: true,
          circuitBreaker: {
            state: CircuitState.CLOSED,
            failures: 0,
            isHealthy: true,
            lastFailureTime: null as any,
          },
        },
        metrics: {
          hitRate: '85.50%',
          missRate: '14.50%',
          errorRate: '0.10%',
          avgLatency: '12.50ms',
          totalOperations: 1000,
          uptimeMinutes: 60,
          raw: {
            hits: 855,
            misses: 145,
            errors: 1,
            sets: 200,
            deletes: 50,
          },
        },
      });
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return correct cache-control headers for healthy status', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 90,
        missRate: 10,
        errorRate: 0,
        avgLatency: 10,
        totalOperations: 100,
        uptime: 60000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(90, 10, 0, 20, 5, 60000));

      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });

  describe('Degraded Cache Status', () => {
    it('should return degraded status when circuit breaker is unhealthy', async () => {
      const lastFailureTime = Date.now() - 30000; // 30 seconds ago
      
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.OPEN,
        failures: 5,
        isHealthy: false,
        lastFailureTime,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 60,
        missRate: 30,
        errorRate: 10,
        avgLatency: 50,
        totalOperations: 500,
        uptime: 1800000, // 30 minutes
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(300, 150, 50, 100, 25, 1800000));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        status: 'degraded',
        redis: {
          configured: true,
          circuitBreaker: {
            state: CircuitState.OPEN,
            failures: 5,
            isHealthy: false,
            lastFailureTime: new Date(lastFailureTime).toISOString(),
          },
        },
        metrics: {
          hitRate: '60.00%',
          missRate: '30.00%',
          errorRate: '10.00%',
          avgLatency: '50.00ms',
          totalOperations: 500,
          uptimeMinutes: 30,
          raw: {
            hits: 300,
            misses: 150,
            errors: 50,
            sets: 100,
            deletes: 25,
          },
        },
      });
    });

    it('should return correct headers for degraded status', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.HALF_OPEN,
        failures: 3,
        isHealthy: false,
        lastFailureTime: Date.now() - 10000,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 70,
        missRate: 25,
        errorRate: 5,
        avgLatency: 35,
        totalOperations: 200,
        uptime: 300000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(140, 50, 10, 40, 10, 300000));

      const response = await GET();

      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });

  describe('Redis Configuration', () => {
    it('should handle Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: 'unknown' as any,
        failures: 0,
        isHealthy: false,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 0,
        missRate: 0,
        errorRate: 0,
        avgLatency: 0,
        totalOperations: 0,
        uptime: 0,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(0, 0, 0, 0, 0, 0));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.redis.configured).toBe(false);
      expect(data.status).toBe('degraded');
    });

    it('should handle Redis configured but circuit breaker indicates unhealthy', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.OPEN,
        failures: 10,
        isHealthy: false,
        lastFailureTime: Date.now() - 60000,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 20,
        missRate: 60,
        errorRate: 20,
        avgLatency: 100,
        totalOperations: 50,
        uptime: 120000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(10, 30, 10, 15, 5, 120000));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.redis.configured).toBe(true);
      expect(data.redis.circuitBreaker.isHealthy).toBe(false);
      expect(data.status).toBe('degraded');
    });
  });

  describe('Circuit Breaker States', () => {
    it('should handle closed circuit breaker state', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 95,
        missRate: 5,
        errorRate: 0,
        avgLatency: 8,
        totalOperations: 2000,
        uptime: 7200000, // 2 hours
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(1900, 100, 0, 500, 100, 7200000));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redis.circuitBreaker.state).toBe('CLOSED');
      expect(data.redis.circuitBreaker.isHealthy).toBe(true);
      expect(data.status).toBe('healthy');
    });

    it('should handle open circuit breaker state', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.OPEN,
        failures: 15,
        isHealthy: false,
        lastFailureTime: Date.now() - 5000,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 30,
        missRate: 40,
        errorRate: 30,
        avgLatency: 150,
        totalOperations: 100,
        uptime: 600000, // 10 minutes
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(30, 40, 30, 25, 5, 600000));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.redis.circuitBreaker.state).toBe('OPEN');
      expect(data.redis.circuitBreaker.isHealthy).toBe(false);
      expect(data.status).toBe('degraded');
    });

    it('should handle half-open circuit breaker state', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.HALF_OPEN,
        failures: 7,
        isHealthy: false,
        lastFailureTime: Date.now() - 15000,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 75,
        missRate: 20,
        errorRate: 5,
        avgLatency: 25,
        totalOperations: 400,
        uptime: 900000, // 15 minutes
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(300, 80, 20, 100, 20, 900000));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.redis.circuitBreaker.state).toBe('HALF_OPEN');
      expect(data.redis.circuitBreaker.isHealthy).toBe(false);
      expect(data.status).toBe('degraded');
    });
  });

  describe('Metrics Calculation', () => {
    it('should format percentages with 2 decimal places', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 85.555,
        missRate: 14.333,
        errorRate: 0.112,
        avgLatency: 12.777,
        totalOperations: 999,
        uptime: 3661000, // 1 hour and 1 minute and 1 second
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(855, 143, 1, 200, 50, 3661000));

      const response = await GET();
      const data = await response.json();

      expect(data.metrics.hitRate).toBe('85.56%');
      expect(data.metrics.missRate).toBe('14.33%');
      expect(data.metrics.errorRate).toBe('0.11%');
      expect(data.metrics.avgLatency).toBe('12.78ms');
      expect(data.metrics.uptimeMinutes).toBe(61); // Floor of 61.01666...
    });

    it('should handle zero values correctly', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 0,
        missRate: 0,
        errorRate: 0,
        avgLatency: 0,
        totalOperations: 0,
        uptime: 0,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(0, 0, 0, 0, 0, 0));

      const response = await GET();
      const data = await response.json();

      expect(data.metrics.hitRate).toBe('0.00%');
      expect(data.metrics.missRate).toBe('0.00%');
      expect(data.metrics.errorRate).toBe('0.00%');
      expect(data.metrics.avgLatency).toBe('0.00ms');
      expect(data.metrics.totalOperations).toBe(0);
      expect(data.metrics.uptimeMinutes).toBe(0);
    });

    it('should handle high values correctly', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 99.99,
        missRate: 0.01,
        errorRate: 0.00,
        avgLatency: 5.123,
        totalOperations: 1000000,
        uptime: 86400000, // 24 hours
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(999900, 100, 0, 100000, 5000, 86400000));

      const response = await GET();
      const data = await response.json();

      expect(data.metrics.hitRate).toBe('99.99%');
      expect(data.metrics.missRate).toBe('0.01%');
      expect(data.metrics.errorRate).toBe('0.00%');
      expect(data.metrics.avgLatency).toBe('5.12ms');
      expect(data.metrics.totalOperations).toBe(1000000);
      expect(data.metrics.uptimeMinutes).toBe(1440); // 24 * 60
    });
  });

  describe('Last Failure Time Handling', () => {
    it('should format lastFailureTime correctly when present', async () => {
      const lastFailureTime = Date.now() - 45000; // 45 seconds ago
      
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.HALF_OPEN,
        failures: 3,
        isHealthy: false,
        lastFailureTime,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 80,
        missRate: 15,
        errorRate: 5,
        avgLatency: 20,
        totalOperations: 300,
        uptime: 600000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(240, 45, 15, 60, 12, 600000));

      const response = await GET();
      const data = await response.json();

      expect(data.redis.circuitBreaker.lastFailureTime).toBe(
        new Date(lastFailureTime).toISOString()
      );
    });

    it('should handle null lastFailureTime', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 90,
        missRate: 10,
        errorRate: 0,
        avgLatency: 15,
        totalOperations: 500,
        uptime: 1200000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(450, 50, 0, 100, 25, 1200000));

      const response = await GET();
      const data = await response.json();

      expect(data.redis.circuitBreaker.lastFailureTime).toBeNull();
    });

    it('should handle undefined lastFailureTime', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: undefined as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 95,
        missRate: 5,
        errorRate: 0,
        avgLatency: 10,
        totalOperations: 800,
        uptime: 2400000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(760, 40, 0, 150, 30, 2400000));

      const response = await GET();
      const data = await response.json();

      expect(data.redis.circuitBreaker.lastFailureTime).toBeNull();
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields in response', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 85,
        missRate: 15,
        errorRate: 0,
        avgLatency: 12,
        totalOperations: 100,
        uptime: 60000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(85, 15, 0, 20, 5, 60000));

      const response = await GET();
      const data = await response.json();

      // Top-level fields
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('redis');
      expect(data).toHaveProperty('metrics');

      // Redis fields
      expect(data.redis).toHaveProperty('configured');
      expect(data.redis).toHaveProperty('circuitBreaker');
      expect(data.redis.circuitBreaker).toHaveProperty('state');
      expect(data.redis.circuitBreaker).toHaveProperty('failures');
      expect(data.redis.circuitBreaker).toHaveProperty('isHealthy');
      expect(data.redis.circuitBreaker).toHaveProperty('lastFailureTime');

      // Metrics fields
      expect(data.metrics).toHaveProperty('hitRate');
      expect(data.metrics).toHaveProperty('missRate');
      expect(data.metrics).toHaveProperty('errorRate');
      expect(data.metrics).toHaveProperty('avgLatency');
      expect(data.metrics).toHaveProperty('totalOperations');
      expect(data.metrics).toHaveProperty('uptimeMinutes');
      expect(data.metrics).toHaveProperty('raw');
      expect(data.metrics.raw).toHaveProperty('hits');
      expect(data.metrics.raw).toHaveProperty('misses');
      expect(data.metrics.raw).toHaveProperty('errors');
      expect(data.metrics.raw).toHaveProperty('sets');
      expect(data.metrics.raw).toHaveProperty('deletes');
    });

    it('should return valid ISO timestamp', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockRedisCircuitBreaker.getMetrics.mockReturnValue({
        state: CircuitState.CLOSED,
        failures: 0,
        isHealthy: true,
        lastFailureTime: null as any,
      });
      mockCacheMetrics.getSummary.mockReturnValue({
        hitRate: 85,
        missRate: 15,
        errorRate: 0,
        avgLatency: 12,
        totalOperations: 100,
        uptime: 60000,
      });
      mockCacheMetrics.getMetrics.mockReturnValue(createCacheMetrics(85, 15, 0, 20, 5, 60000));

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
      expect(Date.now() - new Date(data.timestamp).getTime()).toBeLessThan(1000);
    });
  });
});