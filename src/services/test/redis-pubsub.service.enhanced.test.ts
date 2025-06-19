/**
 * @jest-environment node
 */

import { redisPubSubService, PUBSUB_CONSTANTS } from '../redis-pubsub.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { EventMessage, ChatMessage } from '../redis-pubsub.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

describe('RedisPubSubService - Enhanced Coverage', () => {
  const mockRedis = {
    publish: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    lrange: jest.fn(),
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

  const channel = 'test-channel';
  const userId = 'user-123';
  const content = 'Test message';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as any);
  });

  describe('Enhanced coverage for uncovered lines', () => {
    // Test for lines 163, 169-170 (server-side check in publishChatMessage)
    it('should reject client-side publishChatMessage operations', async () => {
      const originalWindow = (global as any).window;
      (global as any).window = {};

      const result = await redisPubSubService.publishChatMessage(
        channel,
        userId,
        content
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('PubSub operations are only available on the server');

      (global as any).window = originalWindow;
    });

    // Test for lines 251, 257-258 (publishBoardEvent error handling)
    it('should handle Redis error in publishBoardEvent', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      const event: EventMessage = {
        type: 'board:update',
        payload: { boardId: 'board-123', data: 'test' },
      };

      const result = await redisPubSubService.publishBoardEvent(channel, event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PUBLISH failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to publish board event',
        expect.any(Error),
        expect.objectContaining({
          metadata: { channel, eventType: 'board:update' },
        })
      );
    });

    it('should handle non-Error objects in publishBoardEvent', async () => {
      mockRedis.publish.mockRejectedValueOnce('String error');

      const event: EventMessage = {
        type: 'board:update',
        payload: { boardId: 'board-123' },
      };

      const result = await redisPubSubService.publishBoardEvent(channel, event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to publish board event');
    });

    // Test for lines 318, 324-325 (getChatHistory error handling)
    it('should handle Redis error in getChatHistory', async () => {
      mockRedis.lrange.mockRejectedValueOnce(new Error('LRANGE failed'));

      const result = await redisPubSubService.getChatHistory(channel);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LRANGE failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get chat history',
        expect.any(Error),
        expect.objectContaining({
          metadata: { channel },
        })
      );
    });

    it('should handle invalid JSON in chat history', async () => {
      mockRedis.lrange.mockResolvedValueOnce([
        'invalid-json',
        '{"broken": json}',
        JSON.stringify({ id: '1', userId: 'user1', content: 'Valid', timestamp: Date.now() }),
      ]);

      const result = await redisPubSubService.getChatHistory(channel);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only valid message
      expect(mockLog.warn).toHaveBeenCalledTimes(2); // Two invalid messages
    });

    // Test for lines 361-368 (getBoardEvents error handling)
    it('should handle polling timeout in getBoardEvents', async () => {
      jest.useFakeTimers();

      mockRedis.get.mockResolvedValue(null); // No events

      const resultPromise = redisPubSubService.getBoardEvents(channel, {
        pollInterval: 100,
        maxWaitTime: 500,
      });

      // Advance timers to trigger timeout
      await jest.advanceTimersByTimeAsync(600);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);

      jest.useRealTimers();
    });

    it('should handle Redis error during event polling', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('GET failed'));

      const result = await redisPubSubService.getBoardEvents(channel);

      expect(result.success).toBe(false);
      expect(result.error).toBe('GET failed');
    });

    // Test for lines 465, 471-472 (publishSessionEvent error handling)
    it('should handle Redis error in publishSessionEvent', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      const event: EventMessage = {
        type: 'session:update',
        payload: { sessionId: 'session-123' },
      };

      const result = await redisPubSubService.publishSessionEvent('session-123', event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PUBLISH failed');
    });

    // Test for lines 524, 530-531 (publishUserEvent error handling)
    it('should handle Redis error in publishUserEvent', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      const event: EventMessage = {
        type: 'user:status',
        payload: { status: 'online' },
      };

      const result = await redisPubSubService.publishUserEvent(userId, event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PUBLISH failed');
    });

    // Test for lines 591, 597-598 (clearChatHistory error handling)
    it('should handle Redis error in clearChatHistory', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('DEL failed'));

      const result = await redisPubSubService.clearChatHistory(channel);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DEL failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to clear chat history',
        expect.any(Error),
        expect.objectContaining({
          metadata: { channel },
        })
      );
    });

    it('should handle non-Error objects in clearChatHistory', async () => {
      mockRedis.del.mockRejectedValueOnce({ code: 'REDIS_ERROR' });

      const result = await redisPubSubService.clearChatHistory(channel);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to clear chat history');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle very long messages in chat', async () => {
      const longContent = 'x'.repeat(10000);

      const result = await redisPubSubService.publishChatMessage(
        channel,
        userId,
        longContent
      );

      expect(result.success).toBe(true);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(longContent)
      );
    });

    it('should handle special characters in messages', async () => {
      const specialContent = '{"test": "value"}\n\t<script>alert("xss")</script>';

      const result = await redisPubSubService.publishChatMessage(
        channel,
        userId,
        specialContent,
        { username: 'Test User' }
      );

      expect(result.success).toBe(true);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify(specialContent).slice(1, -1))
      );
    });

    it('should handle concurrent event publishing', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'board:update' as const,
        payload: { index: i },
      }));

      const results = await Promise.all(
        events.map(event => redisPubSubService.publishBoardEvent(channel, event))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(mockRedis.publish).toHaveBeenCalledTimes(10);
    });

    it('should handle Redis unavailable during operations', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const chatResult = await redisPubSubService.publishChatMessage(
        channel,
        userId,
        content
      );

      expect(chatResult.success).toBe(false);
      expect(chatResult.error).toBe('PubSub service unavailable');

      const eventResult = await redisPubSubService.publishBoardEvent(channel, {
        type: 'board:update',
        payload: {},
      });

      expect(eventResult.success).toBe(false);
      expect(eventResult.error).toBe('PubSub service unavailable');
    });

    it('should handle event polling with malformed stored data', async () => {
      let callCount = 0;
      mockRedis.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve('invalid-json');
        }
        return Promise.resolve(null);
      });

      const result = await redisPubSubService.getBoardEvents(channel, {
        pollInterval: 10,
        maxWaitTime: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid board events data',
        expect.any(Object)
      );
    });

    it('should handle ltrim errors gracefully', async () => {
      mockRedis.ltrim.mockRejectedValueOnce(new Error('LTRIM failed'));

      const result = await redisPubSubService.publishChatMessage(
        channel,
        userId,
        content
      );

      // Should still succeed even if trim fails
      expect(result.success).toBe(true);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to trim chat history',
        expect.objectContaining({
          metadata: { channel, error: 'LTRIM failed' },
        })
      );
    });

    it('should handle expire errors gracefully', async () => {
      mockRedis.expire.mockRejectedValueOnce(new Error('EXPIRE failed'));

      const result = await redisPubSubService.publishChatMessage(
        channel,
        userId,
        content
      );

      // Should still succeed even if expire fails
      expect(result.success).toBe(true);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to set chat history expiration',
        expect.objectContaining({
          metadata: { channel, error: 'EXPIRE failed' },
        })
      );
    });
  });
});