/**
 * @jest-environment node
 */

import { redisPresenceService } from '../redis-presence.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type {
  PresenceState,
  PresenceSubscriptionOptions,
} from '../redis-presence.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  expire: jest.fn(),
  publish: jest.fn(),
};

const mockGetRedisClient = getRedisClient as jest.MockedFunction<
  typeof getRedisClient
>;
const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<
  typeof isRedisConfigured
>;
const mockLog = log as jest.Mocked<typeof log>;

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
    mockGetRedisClient.mockReturnValue(mockRedis as any);

    // Clear any subscriptions
    (redisPresenceService as any).subscriptions.clear();
  });

  describe('server-only guard', () => {
    it('should reject client-side operations', async () => {
      // Mock window to simulate client-side
      Object.defineProperty(window, 'window', {
        value: {},
        writable: true,
      });

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
      delete (global as any).window;
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
      const metadata = { sessionId: 'session-123', role: 'player' };
      const options: PresenceSubscriptionOptions = {
        onPresenceUpdate: jest.fn(),
      };

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo,
        metadata,
        options
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('updatePresence');
      expect(result.data).toHaveProperty('cleanup');
      expect(result.data).toHaveProperty('getCurrentState');

      // Verify Redis operations
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user:${boardId}:${userId}`),
        60, // TTL
        expect.stringContaining('"displayName":"Test User"')
      );

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        expect.stringContaining(`presence:board:${boardId}`),
        userId
      );

      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.stringContaining(`presence:board:${boardId}`),
        expect.stringContaining('"type":"join"')
      );

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

    it('should clean up existing subscription before joining', async () => {
      const subscriptionKey = `${boardId}:${userId}`;
      const mockCleanup = jest.fn();

      // Set up existing subscription
      (redisPresenceService as any).subscriptions.set(subscriptionKey, {
        cleanup: mockCleanup,
      });

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(true);
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should set up heartbeat interval', async () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(true);
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30000 // 30 second heartbeat interval
      );

      jest.useRealTimers();
    });

    it('should handle Redis errors during join', async () => {
      mockRedis.setex.mockRejectedValueOnce(
        new Error('Redis connection failed')
      );

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
    beforeEach(() => {
      const presenceData = {
        userId,
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now() - 5000,
        joinedAt: Date.now() - 10000,
        metadata: { sessionId: 'session-123' },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(presenceData));
    });

    it('should update user presence successfully', async () => {
      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'away',
        { activity: 'viewing' }
      );

      expect(result.success).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user:${boardId}:${userId}`)
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user:${boardId}:${userId}`),
        60,
        expect.stringContaining('"status":"away"')
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringContaining(`presence:board:${boardId}`),
        60
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.stringContaining(`presence:board:${boardId}`),
        expect.stringContaining('"type":"update"')
      );
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
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user:${boardId}:${userId}`)
      );
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in presence, removing and recreating',
        expect.any(Object)
      );
    });

    it('should merge metadata with existing values', async () => {
      const existingPresence = {
        userId,
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now() - 5000,
        joinedAt: Date.now() - 10000,
        metadata: { sessionId: 'session-123', role: 'player' },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingPresence));

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'busy',
        { activity: 'editing', currentCell: 'B5' }
      );

      expect(result.success).toBe(true);

      // Check that the stored data contains merged metadata
      const setexCall = mockRedis.setex.mock.calls.find(call =>
        call[0].includes(`presence:user:${boardId}:${userId}`)
      );
      const storedData = JSON.parse(setexCall![2]);
      expect(storedData.metadata).toEqual({
        sessionId: 'session-123',
        role: 'player',
        activity: 'editing',
        currentCell: 'B5',
      });
    });
  });

  describe('leaveBoardPresence', () => {
    it('should leave board presence successfully', async () => {
      const result = await redisPresenceService.leaveBoardPresence(
        boardId,
        userId
      );

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user:${boardId}:${userId}`)
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        expect.stringContaining(`presence:board:${boardId}`),
        userId
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user-boards:${userId}`),
        boardId
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        expect.stringContaining(`presence:board:${boardId}`),
        expect.stringContaining('"type":"leave"')
      );
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
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to leave board presence',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId, userId },
        })
      );
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
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('presence:user:' + boardId + ':user1')
      );
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

      // Mock successful leave operations
      jest
        .spyOn(redisPresenceService, 'leaveBoardPresence')
        .mockResolvedValueOnce({ success: true, data: undefined })
        .mockResolvedValueOnce({ success: true, data: undefined });

      // Set up some subscriptions to clean up
      const subscriptions = (redisPresenceService as any).subscriptions;
      subscriptions.set(`board1:${userId}`, { cleanup: jest.fn() });
      subscriptions.set(`board2:${userId}`, { cleanup: jest.fn() });
      subscriptions.set(`board3:otheruser`, { cleanup: jest.fn() }); // Should not be cleaned

      const result = await redisPresenceService.cleanupUserPresence(userId);

      expect(result.success).toBe(true);
      expect(redisPresenceService.leaveBoardPresence).toHaveBeenCalledWith(
        'board1',
        userId
      );
      expect(redisPresenceService.leaveBoardPresence).toHaveBeenCalledWith(
        'board2',
        userId
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        'User presence cleaned up',
        expect.objectContaining({
          metadata: { userId, boardCount: 2 },
        })
      );

      // Check that only user subscriptions were cleaned
      expect(subscriptions.size).toBe(1);
      expect(subscriptions.has('board3:otheruser')).toBe(true);
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
      jest.spyOn(mockLog, 'info').mockImplementationOnce(() => {
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

  describe('integration tests', () => {
    it('should handle complete join-update-leave flow', async () => {
      // Join
      const joinResult = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );
      expect(joinResult.success).toBe(true);

      // Update presence via returned function
      const updatePresence = joinResult.data!.updatePresence;

      // Mock presence data for update
      const presenceData = {
        userId,
        displayName: 'Test User',
        status: 'online' as const,
        lastSeen: Date.now() - 5000,
        joinedAt: Date.now() - 10000,
        metadata: { sessionId: 'session-123' },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(presenceData));

      const updateResult = await updatePresence('busy', {
        activity: 'editing',
      });
      expect(updateResult.success).toBe(true);

      // Cleanup via returned function
      const cleanup = joinResult.data!.cleanup;
      const cleanupResult = await cleanup();
      expect(cleanupResult.success).toBe(true);
    });

    it('should handle heartbeat failures gracefully', async () => {
      jest.useFakeTimers();
      const onError = jest.fn();

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo,
        {},
        { onError }
      );

      expect(result.success).toBe(true);

      // Simulate heartbeat failure
      mockRedis.get.mockRejectedValue(new Error('Heartbeat failed'));

      // Advance timer to trigger heartbeat
      jest.advanceTimersByTime(30000);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(mockLog.error).toHaveBeenCalledWith(
        'Presence heartbeat failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId, userId },
        })
      );

      jest.useRealTimers();
    });
  });
});
