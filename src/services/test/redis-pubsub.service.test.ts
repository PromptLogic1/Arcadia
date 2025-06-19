/**
 * @jest-environment node
 */

import { redisPubSubService } from '../redis-pubsub.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { GameEvent, ChatMessage, PublishOptions } from '../redis-pubsub.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockRedis = {
  publish: jest.fn(),
  zrange: jest.fn(),
  zadd: jest.fn(),
  zcard: jest.fn(),
  zremrangebyrank: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
};

const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<typeof isRedisConfigured>;
const mockLog = log as jest.Mocked<typeof log>;

describe('RedisPubSubService', () => {
  const gameId = 'game-123';
  const userId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as any);
  });

  describe('server-only guard', () => {
    it('should reject client-side operations', async () => {
      // Mock window to simulate client-side
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      const result = await redisPubSubService.publishGameEvent({
        type: 'game_start',
        gameId,
        userId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('PubSub operations are only available on the server');
      
      // Clean up
      delete (global as any).window;
    });
  });

  describe('Redis configuration check', () => {
    it('should handle Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await redisPubSubService.publishGameEvent({
        type: 'game_start',
        gameId,
        userId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('PubSub service unavailable');
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Redis not configured - pubsub unavailable'
      );
    });
  });

  describe('publishGameEvent', () => {
    it('should publish game event successfully', async () => {
      const eventData = {
        type: 'cell_marked' as const,
        gameId,
        boardId: 'board-789',
        userId,
        data: { cellId: 'B3', value: 'test' },
      };

      mockRedis.publish.mockResolvedValueOnce(2); // 2 subscribers

      const result = await redisPubSubService.publishGameEvent(eventData);

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toMatch(new RegExp(`^${gameId}-\\d+-[a-z0-9]+$`));

      expect(mockRedis.publish).toHaveBeenCalledWith(
        `game:events:${gameId}`,
        expect.stringContaining('"type":"cell_marked"')
      );

      expect(mockLog.debug).toHaveBeenCalledWith(
        'Game event published',
        expect.objectContaining({
          metadata: expect.objectContaining({
            gameId,
            type: 'cell_marked',
            subscribers: 2,
          }),
        })
      );
    });

    it('should persist event for polling when enabled', async () => {
      const eventData = {
        type: 'game_start' as const,
        gameId,
        userId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);
      mockRedis.zcard.mockResolvedValueOnce(50); // Current event count

      const result = await redisPubSubService.publishGameEvent(eventData, {
        persist: true,
        ttl: 7200,
      });

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(`cache:game-events:${gameId}`),
        expect.objectContaining({
          score: expect.any(Number),
          member: expect.stringContaining('"type":"game_start"'),
        })
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringContaining(`cache:game-events:${gameId}`),
        7200
      );
    });

    it('should not persist event when persist is false', async () => {
      const eventData = {
        type: 'game_start' as const,
        gameId,
        userId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);

      const result = await redisPubSubService.publishGameEvent(eventData, {
        persist: false,
      });

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).not.toHaveBeenCalled();
    });

    it('should trim old events when max limit exceeded', async () => {
      const eventData = {
        type: 'game_start' as const,
        gameId,
        userId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);
      mockRedis.zcard.mockResolvedValueOnce(150); // Exceeds max of 100

      const result = await redisPubSubService.publishGameEvent(eventData);

      expect(result.success).toBe(true);
      expect(mockRedis.zremrangebyrank).toHaveBeenCalledWith(
        expect.stringContaining(`cache:game-events:${gameId}`),
        0,
        49 // Remove 50 oldest events (150 - 100)
      );
    });

    it('should handle Redis publish errors', async () => {
      const eventData = {
        type: 'game_start' as const,
        gameId,
        userId,
      };

      mockRedis.publish.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisPubSubService.publishGameEvent(eventData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Failed to publish game event',
        expect.objectContaining({
          metadata: expect.objectContaining({
            gameId,
            type: 'game_start',
            error: 'Redis error',
          }),
        })
      );
    });

    it('should validate event data with Zod', async () => {
      const invalidEventData = {
        type: 'invalid_event_type' as any,
        gameId,
        userId,
      };

      const result = await redisPubSubService.publishGameEvent(invalidEventData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('publishChatMessage', () => {
    it('should publish chat message successfully', async () => {
      const messageData = {
        userId,
        username: 'TestUser',
        message: 'Hello world!',
        gameId,
        type: 'user' as const,
      };

      mockRedis.publish.mockResolvedValueOnce(3); // 3 subscribers

      const result = await redisPubSubService.publishChatMessage(messageData);

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toMatch(/^msg-\d+-[a-z0-9]+$/);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        `game:chat:${gameId}`,
        expect.stringContaining('"message":"Hello world!"')
      );

      expect(mockLog.debug).toHaveBeenCalledWith(
        'Chat message published',
        expect.objectContaining({
          metadata: expect.objectContaining({
            gameId,
            userId,
            subscribers: 3,
          }),
        })
      );
    });

    it('should persist chat message for history', async () => {
      const messageData = {
        userId,
        username: 'TestUser',
        message: 'Hello!',
        gameId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);
      mockRedis.zcard.mockResolvedValueOnce(50);

      const result = await redisPubSubService.publishChatMessage(messageData);

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(`cache:chat-history:${gameId}`),
        expect.objectContaining({
          score: expect.any(Number),
          member: expect.stringContaining('"message":"Hello!"'),
        })
      );
    });

    it('should trim old chat messages when limit exceeded', async () => {
      const messageData = {
        userId,
        username: 'TestUser',
        message: 'Hello!',
        gameId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);
      mockRedis.zcard.mockResolvedValueOnce(250); // Exceeds limit of 200

      const result = await redisPubSubService.publishChatMessage(messageData);

      expect(result.success).toBe(true);
      expect(mockRedis.zremrangebyrank).toHaveBeenCalledWith(
        expect.stringContaining(`cache:chat-history:${gameId}`),
        0,
        49 // Remove 50 oldest messages (250 - 200)
      );
    });

    it('should handle chat publish errors', async () => {
      const messageData = {
        userId,
        username: 'TestUser',
        message: 'Hello!',
        gameId,
      };

      mockRedis.publish.mockRejectedValueOnce(new Error('Chat publish failed'));

      const result = await redisPubSubService.publishChatMessage(messageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat publish failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to publish chat message',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameId, userId },
        })
      );
    });
  });

  describe('publishSystemAnnouncement', () => {
    it('should publish system announcement', async () => {
      const announcement = 'Game will start in 30 seconds';
      const data = { countdown: 30 };

      // Mock the publishGameEvent method since publishSystemAnnouncement calls it
      jest.spyOn(redisPubSubService, 'publishGameEvent').mockResolvedValueOnce({
        success: true,
        data: 'event-123',
      });

      const result = await redisPubSubService.publishSystemAnnouncement(
        gameId,
        announcement,
        data
      );

      expect(result.success).toBe(true);
      expect(redisPubSubService.publishGameEvent).toHaveBeenCalledWith({
        type: 'system_announcement',
        gameId,
        userId: 'system',
        data: {
          announcement,
          countdown: 30,
        },
      });
    });
  });

  describe('getRecentEvents', () => {
    it('should retrieve recent events with default parameters', async () => {
      const eventData1 = {
        type: 'game_start',
        gameId,
        userId,
        timestamp: Date.now() - 5000,
        eventId: 'event-1',
      };
      const eventData2 = {
        type: 'cell_marked',
        gameId,
        userId,
        timestamp: Date.now(),
        eventId: 'event-2',
      };

      mockRedis.zrange.mockResolvedValueOnce([
        JSON.stringify(eventData1),
        (Date.now() - 5000).toString(),
        JSON.stringify(eventData2),
        Date.now().toString(),
      ]);

      const result = await redisPubSubService.getRecentEvents(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toMatchObject({
        type: 'game_start',
        gameId,
        eventId: 'event-1',
      });

      expect(mockRedis.zrange).toHaveBeenCalledWith(
        expect.stringContaining(`cache:game-events:${gameId}`),
        0,
        '+inf',
        expect.objectContaining({
          byScore: true,
          withScores: true,
          offset: 0,
          count: 50,
        })
      );
    });

    it('should filter events by timestamp', async () => {
      const since = Date.now() - 10000;

      mockRedis.zrange.mockResolvedValueOnce([]);

      const result = await redisPubSubService.getRecentEvents(gameId, since, 25);

      expect(result.success).toBe(true);
      expect(mockRedis.zrange).toHaveBeenCalledWith(
        expect.stringContaining(`cache:game-events:${gameId}`),
        since,
        '+inf',
        expect.objectContaining({
          byScore: true,
          withScores: true,
          offset: 0,
          count: 25,
        })
      );
    });

    it('should handle invalid event data gracefully', async () => {
      mockRedis.zrange.mockResolvedValueOnce([
        'invalid-json',
        Date.now().toString(),
        JSON.stringify({ invalid: 'event' }),
        Date.now().toString(),
      ]);

      const result = await redisPubSubService.getRecentEvents(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid event data found in history',
        expect.any(Object)
      );
    });

    it('should handle Redis errors', async () => {
      mockRedis.zrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisPubSubService.getRecentEvents(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get recent events',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameId, since: 0, limit: 50 },
        })
      );
    });
  });

  describe('getChatHistory', () => {
    it('should retrieve chat history in chronological order', async () => {
      const message1 = {
        id: 'msg-1',
        userId,
        username: 'User1',
        message: 'First message',
        timestamp: Date.now() - 10000,
        gameId,
        type: 'user',
      };
      const message2 = {
        id: 'msg-2',
        userId: 'user-2',
        username: 'User2',
        message: 'Second message',
        timestamp: Date.now() - 5000,
        gameId,
        type: 'user',
      };

      // Redis returns in reverse order (newest first), so we return in that order
      mockRedis.zrange.mockResolvedValueOnce([
        JSON.stringify(message2),
        (Date.now() - 5000).toString(),
        JSON.stringify(message1),
        (Date.now() - 10000).toString(),
      ]);

      const result = await redisPubSubService.getChatHistory(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      // Should be returned in chronological order (oldest first)
      expect(result.data![0]).toMatchObject({
        id: 'msg-1',
        message: 'First message',
      });
      expect(result.data![1]).toMatchObject({
        id: 'msg-2',
        message: 'Second message',
      });

      expect(mockRedis.zrange).toHaveBeenCalledWith(
        expect.stringContaining(`cache:chat-history:${gameId}`),
        '-inf',
        '+inf',
        expect.objectContaining({
          byScore: true,
          withScores: true,
          rev: true,
          offset: 0,
          count: 50,
        })
      );
    });

    it('should support pagination with before parameter', async () => {
      const before = Date.now() - 5000;

      mockRedis.zrange.mockResolvedValueOnce([]);

      const result = await redisPubSubService.getChatHistory(gameId, 25, before);

      expect(result.success).toBe(true);
      expect(mockRedis.zrange).toHaveBeenCalledWith(
        expect.stringContaining(`cache:chat-history:${gameId}`),
        '-inf',
        before,
        expect.objectContaining({
          byScore: true,
          withScores: true,
          rev: true,
          offset: 0,
          count: 25,
        })
      );
    });

    it('should handle invalid chat message data', async () => {
      mockRedis.zrange.mockResolvedValueOnce([
        'invalid-json',
        Date.now().toString(),
      ]);

      const result = await redisPubSubService.getChatHistory(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid chat message found in history',
        expect.any(Object)
      );
    });
  });

  describe('clearGameHistory', () => {
    it('should clear both events and chat history', async () => {
      const result = await redisPubSubService.clearGameHistory(gameId);

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`cache:game-events:${gameId}`)
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`cache:chat-history:${gameId}`)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        'Game history cleared',
        expect.objectContaining({
          metadata: { gameId },
        })
      );
    });

    it('should handle Redis errors during clear', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await redisPubSubService.clearGameHistory(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to clear game history',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameId },
        })
      );
    });
  });

  describe('getChannelStats', () => {
    it('should return channel statistics', async () => {
      mockRedis.zcard
        .mockResolvedValueOnce(25) // event count
        .mockResolvedValueOnce(15); // chat message count

      mockRedis.zrange
        .mockResolvedValueOnce(['oldest-event', '1000']) // oldest event
        .mockResolvedValueOnce(['newest-event', '2000']); // newest event

      const result = await redisPubSubService.getChannelStats(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        eventCount: 25,
        chatMessageCount: 15,
        oldestEventTimestamp: 1000,
        newestEventTimestamp: 2000,
      });
    });

    it('should handle empty channels', async () => {
      mockRedis.zcard
        .mockResolvedValueOnce(0) // no events
        .mockResolvedValueOnce(0); // no messages

      mockRedis.zrange
        .mockResolvedValueOnce([]) // no oldest event
        .mockResolvedValueOnce([]); // no newest event

      const result = await redisPubSubService.getChannelStats(gameId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        eventCount: 0,
        chatMessageCount: 0,
        oldestEventTimestamp: undefined,
        newestEventTimestamp: undefined,
      });
    });

    it('should handle Redis errors during stats collection', async () => {
      mockRedis.zcard.mockRejectedValueOnce(new Error('Stats error'));

      const result = await redisPubSubService.getChannelStats(gameId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stats error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get channel stats',
        expect.any(Error),
        expect.objectContaining({
          metadata: { gameId },
        })
      );
    });
  });

  describe('publishBulkEvents', () => {
    it('should publish multiple events atomically', async () => {
      const events = [
        {
          type: 'game_start' as const,
          gameId,
          userId,
        },
        {
          type: 'player_join' as const,
          gameId,
          userId: 'user-2',
        },
        {
          type: 'cell_marked' as const,
          gameId,
          userId,
          data: { cellId: 'A1' },
        },
      ];

      mockRedis.publish.mockResolvedValue(2);
      mockRedis.zcard.mockResolvedValue(50);

      const result = await redisPubSubService.publishBulkEvents(events);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data!.every(id => typeof id === 'string')).toBe(true);

      expect(mockRedis.publish).toHaveBeenCalledTimes(3);
      expect(mockLog.info).toHaveBeenCalledWith(
        'Bulk events published',
        expect.objectContaining({
          metadata: expect.objectContaining({
            eventCount: 3,
            eventIds: expect.any(Array),
          }),
        })
      );
    });

    it('should handle bulk publish with persistence disabled', async () => {
      const events = [
        {
          type: 'game_start' as const,
          gameId,
          userId,
        },
      ];

      mockRedis.publish.mockResolvedValue(1);

      const result = await redisPubSubService.publishBulkEvents(events, {
        persist: false,
      });

      expect(result.success).toBe(true);
      expect(mockRedis.zadd).not.toHaveBeenCalled();
    });

    it('should handle bulk publish errors', async () => {
      const events = [
        {
          type: 'game_start' as const,
          gameId,
          userId,
        },
      ];

      mockRedis.publish.mockRejectedValueOnce(new Error('Bulk publish failed'));

      const result = await redisPubSubService.publishBulkEvents(events);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk publish failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to publish bulk events',
        expect.any(Error),
        expect.objectContaining({
          metadata: { eventCount: 1 },
        })
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle persistence errors gracefully without failing publish', async () => {
      const eventData = {
        type: 'game_start' as const,
        gameId,
        userId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);
      // Persistence fails but should not affect the main publish operation
      mockRedis.zadd.mockRejectedValueOnce(new Error('Persistence failed'));

      const result = await redisPubSubService.publishGameEvent(eventData);

      expect(result.success).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to persist event for polling',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle chat persistence errors gracefully', async () => {
      const messageData = {
        userId,
        username: 'TestUser',
        message: 'Hello!',
        gameId,
      };

      mockRedis.publish.mockResolvedValueOnce(1);
      mockRedis.zadd.mockRejectedValueOnce(new Error('Chat persistence failed'));

      const result = await redisPubSubService.publishChatMessage(messageData);

      expect(result.success).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to persist chat message',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should generate unique event IDs', async () => {
      const eventData = {
        type: 'game_start' as const,
        gameId,
        userId,
      };

      mockRedis.publish.mockResolvedValue(1);

      const result1 = await redisPubSubService.publishGameEvent(eventData);
      const result2 = await redisPubSubService.publishGameEvent(eventData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).not.toBe(result2.data);
    });

    it('should generate unique message IDs', async () => {
      const messageData = {
        userId,
        username: 'TestUser',
        message: 'Hello!',
        gameId,
      };

      mockRedis.publish.mockResolvedValue(1);

      const result1 = await redisPubSubService.publishChatMessage(messageData);
      const result2 = await redisPubSubService.publishChatMessage(messageData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).not.toBe(result2.data);
    });
  });
});