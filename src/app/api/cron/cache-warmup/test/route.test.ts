/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { enhancedCache } from '@/lib/cache-enhanced';
import { log } from '@/lib/logger';

// Mock external dependencies
jest.mock('@/lib/cache-enhanced', () => ({
  enhancedCache: {
    warmCache: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockEnhancedCache = enhancedCache as jest.Mocked<typeof enhancedCache>;
const mockLog = log as jest.Mocked<typeof log>;

// Environment variable setup
const originalEnv = process.env;

describe('GET /api/cron/cache-warmup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (authHeader?: string): NextRequest => {
    const headers = new Headers();
    if (authHeader) {
      headers.set('authorization', authHeader);
    }

    return new NextRequest('https://localhost:3000/api/cron/cache-warmup', {
      headers,
    });
  };

  describe('Authorization', () => {
    it('should reject requests without authorization header', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should reject requests with invalid authorization header', async () => {
      const request = createRequest('Bearer invalid-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should accept requests with valid authorization header', async () => {
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: true,
        data: 3,
        error: null,
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Cache Warmup Success', () => {
    it('should successfully warm cache and return success response', async () => {
      const expectedWarmedItems = 3;
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: true,
        data: expectedWarmedItems,
        error: null,
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Cache warmup completed',
        warmedItems: expectedWarmedItems,
      });
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call enhancedCache.warmCache with correct warmup items', async () => {
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: true,
        data: 3,
        error: null,
      });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockEnhancedCache.warmCache).toHaveBeenCalledTimes(1);
      
      const warmupItems = mockEnhancedCache.warmCache.mock.calls[0]?.[0];
      expect(warmupItems).toBeDefined();
      if (!warmupItems) return;
      expect(warmupItems).toHaveLength(3);
      
      // Verify each warmup item structure
      warmupItems.forEach(item => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('fetcher');
        expect(item).toHaveProperty('options');
        expect(item.options).toHaveProperty('ttl');
        expect(item.options).toHaveProperty('namespace');
        expect(typeof item.fetcher).toBe('function');
      });

      // Verify specific items
      const keys = warmupItems.map(item => item.key);
      expect(keys).toContain('public_boards_featured');
      expect(keys).toContain('leaderboard_global');
      expect(keys).toContain('stats_global');
    });

    it('should log successful cache warmup', async () => {
      const expectedWarmedItems = 3;
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: true,
        data: expectedWarmedItems,
        error: null,
      });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockLog.info).toHaveBeenCalledWith('Starting cache warmup job');
      expect(mockLog.info).toHaveBeenCalledWith(
        'Cache warmup completed successfully',
        {
          metadata: { successCount: expectedWarmedItems },
        }
      );
    });
  });

  describe('Cache Warmup Failure', () => {
    it('should handle cache warmup service failure', async () => {
      const errorMessage = 'Cache service unavailable';
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: false,
        data: null,
        error: errorMessage,
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        message: 'Cache warmup failed',
        error: errorMessage,
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should log cache warmup service failure', async () => {
      const errorMessage = 'Cache service unavailable';
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: false,
        data: null,
        error: errorMessage,
      });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Cache warmup failed',
        new Error(errorMessage)
      );
    });

    it('should handle cache warmup service failure without error message', async () => {
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: false,
        data: null,
        error: null,
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        message: 'Cache warmup failed',
      });
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Exception Handling', () => {
    it('should handle unexpected errors during cache warmup', async () => {
      const error = new Error('Unexpected error');
      mockEnhancedCache.warmCache.mockRejectedValueOnce(error);

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        message: 'Cache warmup job failed',
        error: 'Unexpected error',
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should handle non-Error exceptions', async () => {
      const errorMessage = 'String error';
      mockEnhancedCache.warmCache.mockRejectedValueOnce(errorMessage);

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        message: 'Cache warmup job failed',
        error: 'Unknown error',
      });
    });

    it('should log unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockEnhancedCache.warmCache.mockRejectedValueOnce(error);

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Cache warmup cron job failed',
        error
      );
    });
  });

  describe('Warmup Item Fetchers', () => {
    it('should execute warmup item fetchers correctly', async () => {
      // Mock successful cache warmup to get the fetchers called
      mockEnhancedCache.warmCache.mockImplementationOnce(async warmupItems => {
        // Execute each fetcher to test they work
        for (const item of warmupItems) {
          const result = await item.fetcher() as { lastUpdated: string };
          expect(result).toHaveProperty('lastUpdated');
          expect(typeof result.lastUpdated).toBe('string');
        }
        return { success: true, data: warmupItems.length, error: null };
      });

      const request = createRequest('Bearer test-cron-secret');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should verify warmup item configurations', async () => {
      mockEnhancedCache.warmCache.mockResolvedValueOnce({
        success: true,
        data: 3,
        error: null,
      });

      const request = createRequest('Bearer test-cron-secret');
      await GET(request);

      const warmupItems = mockEnhancedCache.warmCache.mock.calls[0]?.[0];
      expect(warmupItems).toBeDefined();
      if (!warmupItems) return;
      
      // Verify public_boards_featured configuration
      const publicBoardsItem = warmupItems.find(item => item.key === 'public_boards_featured');
      expect(publicBoardsItem).toBeDefined();
      if (publicBoardsItem && publicBoardsItem.options) {
        expect(publicBoardsItem.options.ttl).toBe(4 * 60 * 60); // 4 hours
        expect(publicBoardsItem.options.namespace).toBe('public');
      }

      // Verify leaderboard_global configuration
      const leaderboardItem = warmupItems.find(item => item.key === 'leaderboard_global');
      expect(leaderboardItem).toBeDefined();
      if (leaderboardItem && leaderboardItem.options) {
        expect(leaderboardItem.options.ttl).toBe(2 * 60 * 60); // 2 hours
        expect(leaderboardItem.options.namespace).toBe('leaderboard');
      }

      // Verify stats_global configuration
      const statsItem = warmupItems.find(item => item.key === 'stats_global');
      expect(statsItem).toBeDefined();
      if (statsItem && statsItem.options) {
        expect(statsItem.options.ttl).toBe(24 * 60 * 60); // 24 hours
        expect(statsItem.options.namespace).toBe('stats');
      }
    });
  });

  describe('Configuration', () => {
    it('should handle missing CRON_SECRET environment variable', async () => {
      delete process.env.CRON_SECRET;

      const request = createRequest('Bearer any-secret');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });
  });
});