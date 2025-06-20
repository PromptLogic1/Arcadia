/**
 * @jest-environment node
 */

import { redisPubSubService } from '../redis-pubsub.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

describe('RedisPubSubService - Enhanced Coverage', () => {
  const mockRedis = {
    publish: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn(),
    zcard: jest.fn(),
    zremrangebyrank: jest.fn(),
    expire: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockGetRedisClient = getRedisClient as jest.MockedFunction<
    typeof getRedisClient
  >;
  const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
    typeof isRedisConfigured
  >;
  const mockLog = log as jest.Mocked<typeof log>;

  const gameId = 'game-123';
  const userId = 'user-123';
  const username = 'TestUser';
  const message = 'Test message';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as any);
    mockRedis.publish.mockResolvedValue(1);
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zcard.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
  });

  describe('Enhanced coverage for uncovered lines', () => {
    // Test for server-side check in publishChatMessage
    it('should reject client-side publishChatMessage operations', async () => {
      const originalWindow = (global as any).window;
      (global as any).window = {};

      const result = await redisPubSubService.publishChatMessage({
        userId,
        username,
        message,
        gameId,
        type: 'user',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'PubSub operations are only available on the server'
      );

      (global as any).window = originalWindow;
    });

    // Test for publishGameEvent error handling
    it('should handle Redis error in publishGameEvent', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      const result = await redisPubSubService.publishGameEvent({
        type: 'board_update',
        gameId,
        userId,
        boardId: 'board-123',
        data: { test: 'data' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('PUBLISH failed');
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Failed to publish game event',
        expect.objectContaining({
          metadata: expect.objectContaining({
            gameId,
            type: 'board_update',
            error: 'PUBLISH failed',
          }),
        })
      );
    });

    it('should handle non-Error objects in publishGameEvent', async () => {
      mockRedis.publish.mockRejectedValueOnce('String error');

      const result = await redisPubSubService.publishGameEvent({
        type: 'board_update',
        gameId,
        userId,
        boardId: 'board-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to publish game event');
    });

    // Test for getChatHistory error handling
    it('should handle Redis error in getChatHistory', async () => {
      mockRedis.zrange.mockRejectedValueOnce(new Error('ZRANGE failed'));

      const result = await redisPubSubService.getChatHistory(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ZRANGE failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get chat history',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameId, limit: 50, before: undefined },
        })
      );
    });

    it('should handle invalid JSON in chat history', async () => {
      mockRedis.zrange.mockResolvedValueOnce([
        'invalid-json',
        '123456',
        '{"broken": json}',
        '123457',
        JSON.stringify({
          id: '1',
          userId: 'user1',
          username: 'User1',
          message: 'Valid',
          timestamp: Date.now(),
          gameId,
          type: 'user',
        }),
        '123458',
      ]);

      const result = await redisPubSubService.getChatHistory(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only valid message
      expect(mockLog.warn).toHaveBeenCalledTimes(2); // Two invalid messages
    });

    // Test for getRecentEvents error handling
    it('should handle Redis error in getRecentEvents', async () => {
      mockRedis.zrange.mockRejectedValueOnce(new Error('ZRANGE failed'));

      const result = await redisPubSubService.getRecentEvents(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ZRANGE failed');
    });

    it('should handle invalid event data in getRecentEvents', async () => {
      mockRedis.zrange.mockResolvedValueOnce([
        'invalid-json',
        '123456',
        JSON.stringify({
          type: 'board_update',
          gameId,
          userId,
          timestamp: Date.now(),
          eventId: 'event-123',
        }),
        '123457',
      ]);

      const result = await redisPubSubService.getRecentEvents(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only valid event
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid event data found in history',
        expect.objectContaining({
          metadata: expect.objectContaining({ gameId }),
        })
      );
    });

    // Test for publishSystemAnnouncement
    it('should handle Redis error in publishSystemAnnouncement', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      const result = await redisPubSubService.publishSystemAnnouncement(
        gameId,
        'Server maintenance in 5 minutes',
        { priority: 'high' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('PUBLISH failed');
    });

    // Test for clearGameHistory error handling
    it('should handle Redis error in clearGameHistory', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('DEL failed'));

      const result = await redisPubSubService.clearGameHistory(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DEL failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to clear game history',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameId },
        })
      );
    });

    it('should handle non-Error objects in clearGameHistory', async () => {
      mockRedis.del.mockRejectedValueOnce({ code: 'REDIS_ERROR' });

      const result = await redisPubSubService.clearGameHistory(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to clear game history');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle very long messages in chat', async () => {
      const longMessage = 'x'.repeat(10000);

      const result = await redisPubSubService.publishChatMessage({
        userId,
        username,
        message: longMessage,
        gameId,
        type: 'user',
      });

      expect(result.success).toBe(true);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(longMessage)
      );
    });

    it('should handle special characters in messages', async () => {
      const specialMessage =
        '{"test": "value"}\n\t<script>alert("xss")</script>';

      const result = await redisPubSubService.publishChatMessage({
        userId,
        username,
        message: specialMessage,
        gameId,
        type: 'user',
      });

      expect(result.success).toBe(true);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(specialMessage)
      );
    });

    it('should handle concurrent event publishing', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'board_update' as const,
        gameId,
        userId,
        data: { index: i },
      }));

      const results = await Promise.all(
        events.map(event => redisPubSubService.publishGameEvent(event))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(mockRedis.publish).toHaveBeenCalledTimes(10);
    });

    it('should handle Redis unavailable during operations', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const chatResult = await redisPubSubService.publishChatMessage({
        userId,
        username,
        message,
        gameId,
        type: 'user',
      });

      expect(chatResult.success).toBe(false);
      expect(chatResult.error).toBe('PubSub service unavailable');

      const eventResult = await redisPubSubService.publishGameEvent({
        type: 'board_update',
        gameId,
        userId,
      });

      expect(eventResult.success).toBe(false);
      expect(eventResult.error).toBe('PubSub service unavailable');
    });

    it('should handle bulk event publishing', async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: 'cell_marked' as const,
        gameId,
        userId,
        data: { cellIndex: i },
      }));

      const result = await redisPubSubService.publishBulkEvents(events);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
      expect(mockRedis.publish).toHaveBeenCalledTimes(5);
    });

    it('should handle bulk event publishing errors', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('Bulk publish failed'));

      const events = [
        {
          type: 'game_start' as const,
          gameId,
          userId,
        },
      ];

      const result = await redisPubSubService.publishBulkEvents(events);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk publish failed');
    });

    it('should handle getChannelStats', async () => {
      mockRedis.zcard.mockResolvedValueOnce(10).mockResolvedValueOnce(20);
      mockRedis.zrange
        .mockResolvedValueOnce(['event1', '123456'])
        .mockResolvedValueOnce(['message1', '789012']);

      const result = await redisPubSubService.getChannelStats(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        eventCount: 10,
        chatMessageCount: 20,
        oldestEventTimestamp: 123456,
        newestEventTimestamp: 789012,
      });
    });

    it('should handle expire errors gracefully when persisting events', async () => {
      mockRedis.expire.mockRejectedValueOnce(new Error('EXPIRE failed'));

      const result = await redisPubSubService.publishGameEvent({
        type: 'board_update',
        gameId,
        userId,
      });

      // Should still succeed even if expire fails
      expect(result.success).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to persist event for polling',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({ gameId }),
        })
      );
    });
  });
});
