/**
 * @jest-environment node
 */

import { redisPresenceService } from '../redis-presence.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { Redis } from '@upstash/redis';
import type {
  PresenceSubscriptionOptions,
} from '../redis-presence.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockGetRedisClient = jest.mocked(getRedisClient);
const mockIsRedisConfigured = jest.mocked(isRedisConfigured);
const mockLog = jest.mocked(log);

const mockRedis = {
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn().mockResolvedValue(1),
  publish: jest.fn().mockResolvedValue(1),
};

describe('RedisPresenceService', () => {
  const boardId = 'test-board-123';
  const userId = 'user-456';
  const userInfo = {
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as unknown as Redis);
    
    // Clear any subscriptions
    (redisPresenceService as any).subscriptions.clear();
  });

  describe('server-only guard', () => {
    it('should reject client-side operations', async () => {
      // Mock window to simulate client-side
      const originalWindow = global.window;
      global.window = {} as any;

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      // Clean up
      global.window = originalWindow;
    });
  });

  describe('Redis configuration check', () => {
    it('should handle Redis not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Presence service unavailable');
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Redis not configured - presence tracking unavailable'
      );
    });
  });

  describe('joinBoardPresence', () => {
    it('should join board presence successfully', async () => {
      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('updatePresence');
      expect(result.data).toHaveProperty('cleanup');
      expect(result.data).toHaveProperty('getCurrentState');

      // Verify Redis operations were called
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockRedis.sadd).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalled();

      expect(mockLog.info).toHaveBeenCalledWith(
        'User joined board presence',
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId,
            userId,
            displayName: userInfo.displayName,
          }),
        })
      );
    });

    it('should handle Redis errors during join', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis connection failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to join board presence',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId, userId },
        })
      );
    });
  });

  describe('updateUserPresence', () => {
    it('should update user presence successfully', async () => {
      const presenceData = {
        userId,
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now() - 5000,
        joinedAt: Date.now() - 10000,
        metadata: { sessionId: 'session-123' },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(presenceData));

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'away',
        { activity: 'viewing' }
      );

      expect(result.success).toBe(true);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('should handle user presence not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User presence not found');
    });

    it('should handle invalid JSON presence data gracefully', async () => {
      mockRedis.get.mockResolvedValueOnce('invalid-json-data');

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid presence data, please reconnect');
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in presence, removing and recreating',
        expect.any(Object)
      );
    });
  });

  describe('leaveBoardPresence', () => {
    it('should leave board presence successfully', async () => {
      const result = await redisPresenceService.leaveBoardPresence(
        boardId,
        userId
      );

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockRedis.srem).toHaveBeenCalledTimes(2);
      expect(mockRedis.publish).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith(
        'User left board presence',
        expect.objectContaining({
          metadata: { boardId, userId },
        })
      );
    });

    it('should handle Redis errors during leave', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisPresenceService.leaveBoardPresence(
        boardId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalled();
    });
  });

  describe('getBoardPresence', () => {
    it('should get all users present on board', async () => {
      const userIds = ['user1', 'user2'];
      const user1Presence = {
        userId: 'user1',
        displayName: 'User One',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now() - 10000,
      };
      const user2Presence = {
        userId: 'user2',
        displayName: 'User Two',
        status: 'away',
        lastSeen: Date.now() - 5000,
        joinedAt: Date.now() - 15000,
      };

      mockRedis.smembers.mockResolvedValueOnce(userIds);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(user1Presence))
        .mockResolvedValueOnce(JSON.stringify(user2Presence));

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user1: user1Presence,
        user2: user2Presence,
      });
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Retrieved board presence',
        expect.objectContaining({
          metadata: { boardId, userCount: 2 },
        })
      );
    });

    it('should return empty object when no users present', async () => {
      mockRedis.smembers.mockResolvedValueOnce([]);

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle invalid presence data gracefully', async () => {
      const userIds = ['user1', 'user2'];
      mockRedis.smembers.mockResolvedValueOnce(userIds);
      mockRedis.get
        .mockResolvedValueOnce('invalid-json')
        .mockResolvedValueOnce(null);

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({}); // No valid presence data
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in board presence, skipping user',
        expect.any(Object)
      );
    });
  });

  describe('getUserPresence', () => {
    it('should get user presence across all boards', async () => {
      const boardIds = ['board1', 'board2'];
      const board1Presence = {
        userId,
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now() - 10000,
        metadata: { boardId: 'board1' },
      };
      const board2Presence = {
        userId,
        displayName: 'Test User',
        status: 'away',
        lastSeen: Date.now() - 5000,
        joinedAt: Date.now() - 15000,
        metadata: { boardId: 'board2' },
      };

      mockRedis.smembers.mockResolvedValueOnce(boardIds);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(board1Presence))
        .mockResolvedValueOnce(JSON.stringify(board2Presence));

      const result = await redisPresenceService.getUserPresence(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        board1: board1Presence,
        board2: board2Presence,
      });
    });

    it('should return empty object when user not present anywhere', async () => {
      mockRedis.smembers.mockResolvedValueOnce([]);

      const result = await redisPresenceService.getUserPresence(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle Redis errors', async () => {
      mockRedis.smembers.mockRejectedValueOnce(new Error('Redis error'));

      const result = await redisPresenceService.getUserPresence(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get user presence',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });
  });

  describe('cleanupUserPresence', () => {
    it('should clean up all user presence data', async () => {
      const boardIds = ['board1', 'board2'];
      mockRedis.smembers.mockResolvedValueOnce(boardIds);

      const result = await redisPresenceService.cleanupUserPresence(userId);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith(
        'User presence cleaned up',
        expect.objectContaining({
          metadata: { userId, boardCount: 2 },
        })
      );
    });
  });

  describe('subscribeToPresenceEvents', () => {
    it('should return a no-op cleanup function for serverless environments', async () => {
      const options: PresenceSubscriptionOptions = {
        onPresenceUpdate: jest.fn(),
      };

      const result = await redisPresenceService.subscribeToPresenceEvents(
        boardId,
        options
      );

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('function');

      // Test cleanup function
      if (result.data) {
        await result.data();
        expect(mockLog.debug).toHaveBeenCalledWith(
          'Presence subscription cleanup',
          expect.objectContaining({ metadata: { boardId } })
        );
      }

      expect(mockLog.info).toHaveBeenCalledWith(
        'Presence event subscription requested',
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId,
            note: expect.stringContaining('serverless'),
          }),
        })
      );
    });

    it('should handle subscription errors', async () => {
      // Force an error in the subscription process
      jest.mocked(mockLog.info).mockImplementationOnce(() => {
        throw new Error('Subscription error');
      });

      const result = await redisPresenceService.subscribeToPresenceEvents(
        boardId,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to subscribe to presence events',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up specific subscription', async () => {
      const subscriptionKey = `${boardId}:${userId}`;
      const mockCleanup = jest.fn();

      // Set up subscription
      const subscriptions = (redisPresenceService as any).subscriptions;
      subscriptions.set(subscriptionKey, {
        cleanup: mockCleanup,
      });

      const result = await redisPresenceService.cleanup(subscriptionKey);

      expect(result.success).toBe(true);
      expect(mockCleanup).toHaveBeenCalled();
      expect(subscriptions.has(subscriptionKey)).toBe(false);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Presence subscription cleaned up',
        expect.objectContaining({
          metadata: { subscriptionKey },
        })
      );
    });

    it('should handle cleanup when subscription does not exist', async () => {
      const subscriptionKey = 'nonexistent-key';

      const result = await redisPresenceService.cleanup(subscriptionKey);

      expect(result.success).toBe(true);
    });

    it('should handle cleanup errors', async () => {
      const subscriptionKey = `${boardId}:${userId}`;
      const mockCleanup = jest
        .fn()
        .mockRejectedValue(new Error('Cleanup error'));

      const subscriptions = (redisPresenceService as any).subscriptions;
      subscriptions.set(subscriptionKey, {
        cleanup: mockCleanup,
      });

      const result = await redisPresenceService.cleanup(subscriptionKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to cleanup presence subscription',
        expect.any(Error),
        expect.objectContaining({
          metadata: { subscriptionKey },
        })
      );
    });
  });
});