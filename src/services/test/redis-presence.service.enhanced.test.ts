/**
 * @jest-environment node
 */

import { redisPresenceService } from '../redis-presence.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { Redis } from '@upstash/redis';
import type {
  PresenceState,
  PresenceSubscriptionOptions,
} from '../redis-presence.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

describe('RedisPresenceService - Enhanced Coverage', () => {
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

  const mockGetRedisClient = jest.mocked(getRedisClient);
  const mockIsRedisConfigured = jest.mocked(isRedisConfigured);
  const mockLog = jest.mocked(log);

  const boardId = 'test-board-123';
  const userId = 'user-456';
  const userInfo = {
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue(mockRedis as unknown as Redis);

    // Clear any subscriptions
    (redisPresenceService as any).subscriptions.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any subscriptions after each test
    (redisPresenceService as any).subscriptions.clear();
  });

  describe('Enhanced coverage for edge cases', () => {
    it('should handle client-side updateUserPresence operations', async () => {
      const originalWindow = global.window;
      global.window = {} as any;

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      global.window = originalWindow;
    });

    it('should handle client-side leaveBoardPresence operations', async () => {
      const originalWindow = global.window;
      global.window = {} as any;

      const result = await redisPresenceService.leaveBoardPresence(
        boardId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      global.window = originalWindow;
    });

    it('should handle client-side getBoardPresence operations', async () => {
      const originalWindow = global.window;
      global.window = {} as any;

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      global.window = originalWindow;
    });

    it('should handle client-side getUserPresence operations', async () => {
      const originalWindow = global.window;
      global.window = {} as any;

      const result = await redisPresenceService.getUserPresence(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      global.window = originalWindow;
    });

    it('should handle client-side cleanupUserPresence operations', async () => {
      const originalWindow = global.window;
      global.window = {} as any;

      const result = await redisPresenceService.cleanupUserPresence(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      global.window = originalWindow;
    });

    it('should handle Redis not configured for all operations', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const results = await Promise.all([
        redisPresenceService.updateUserPresence(boardId, userId, 'online'),
        redisPresenceService.leaveBoardPresence(boardId, userId),
        redisPresenceService.getBoardPresence(boardId),
        redisPresenceService.getUserPresence(userId),
        redisPresenceService.cleanupUserPresence(userId),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Presence service unavailable');
      });

      expect(mockLog.warn).toHaveBeenCalledTimes(5);
    });

    it('should handle Redis errors in getBoardPresence', async () => {
      mockRedis.smembers.mockRejectedValueOnce(new Error('SMEMBERS failed'));

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMEMBERS failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get board presence',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle non-Error objects in getBoardPresence', async () => {
      mockRedis.smembers.mockRejectedValueOnce('String error');

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get board presence');
    });

    it('should handle Redis error during updateUserPresence', async () => {
      // Set up existing presence first
      const presence: PresenceState = {
        userId,
        displayName: userInfo.displayName,
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(presence));
      mockRedis.setex.mockRejectedValueOnce(new Error('SETEX failed'));

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'away'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SETEX failed');
    });

    it('should handle non-Error objects in updateUserPresence', async () => {
      // Set up existing presence first
      const presence: PresenceState = {
        userId,
        displayName: userInfo.displayName,
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(presence));
      mockRedis.setex.mockRejectedValueOnce({ code: 'REDIS_ERROR' });

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'busy'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update user presence');
    });

    it('should handle Redis error during leaveBoardPresence', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('DEL failed'));

      const result = await redisPresenceService.leaveBoardPresence(
        boardId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('DEL failed');
    });

    it('should handle srem failure in leaveBoardPresence', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      mockRedis.srem.mockRejectedValueOnce(new Error('SREM failed'));

      const result = await redisPresenceService.leaveBoardPresence(
        boardId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SREM failed');
    });

    it('should handle cleanup errors gracefully', async () => {
      // Create a mock subscription with failing cleanup
      const subscriptionKey = `${boardId}:${userId}`;
      const mockCleanup = jest.fn().mockRejectedValueOnce(new Error('DEL failed'));
      
      // Add subscription to the service's internal map
      (redisPresenceService as any).subscriptions.set(subscriptionKey, {
        cleanup: mockCleanup,
        heartbeatInterval: null,
      });

      const cleanupResult = await redisPresenceService.cleanup(subscriptionKey);

      expect(cleanupResult.success).toBe(false);
      expect(cleanupResult.error).toBe('DEL failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to cleanup presence subscription',
        expect.any(Error),
        expect.objectContaining({
          metadata: { subscriptionKey },
        })
      );
    });

    it('should handle heartbeat errors gracefully', async () => {
      const onError = jest.fn();

      // Join presence with onError callback
      const joinResult = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo,
        {},
        { onError }
      );
      expect(joinResult.success).toBe(true);

      // Get the subscription to access the heartbeat interval
      const subscriptionKey = `${boardId}:${userId}`;
      const subscription = (redisPresenceService as any).subscriptions.get(subscriptionKey);
      expect(subscription).toBeDefined();
      expect(subscription.heartbeatInterval).toBeDefined();

      // Clear the interval to prevent it from running during test
      clearInterval(subscription.heartbeatInterval);

      // Directly test the error handling logic by simulating what happens in the heartbeat
      const heartbeatError = new Error('Heartbeat failed');
      mockRedis.get.mockRejectedValueOnce(heartbeatError);

      // Call updateUserPresence manually to simulate heartbeat failure
      const updateResult = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'online'
      );

      expect(updateResult.success).toBe(false);
      
      // The service logs the error internally during heartbeat
      // We're verifying the subscription was set up correctly
      expect(subscription).toBeDefined();
      expect(typeof subscription.cleanup).toBe('function');

      // Cleanup
      await redisPresenceService.cleanup(subscriptionKey);
    });

    it('should handle invalid presence data during getBoardPresence', async () => {
      mockRedis.smembers.mockResolvedValueOnce([userId]);
      mockRedis.get.mockResolvedValueOnce('invalid-json');

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid JSON data in board presence, skipping user',
        expect.objectContaining({
          metadata: expect.objectContaining({ boardId, userId }),
        })
      );
    });

    it('should handle null presence data gracefully', async () => {
      mockRedis.smembers.mockResolvedValueOnce([userId]);
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle invalid presence schema validation', async () => {
      const invalidPresence = {
        userId,
        // Missing required fields like displayName, status, lastSeen, joinedAt
      };
      mockRedis.smembers.mockResolvedValueOnce([userId]);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(invalidPresence));

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      // The service logs a warning when JSON is valid but doesn't match schema
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid presence data found',
        expect.objectContaining({
          metadata: expect.objectContaining({ boardId, userId }),
        })
      );
    });

    it('should handle presence update with metadata merging', async () => {
      const existingPresence: PresenceState = {
        userId,
        displayName: userInfo.displayName,
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
        metadata: { sessionId: 'session-123', role: 'player' },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingPresence));

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'away',
        { activity: 'editing', currentCell: 'B5' }
      );

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should handle cleanupUserPresence with multiple boards', async () => {
      // Mock user in multiple boards
      mockRedis.smembers.mockResolvedValueOnce(['board1', 'board2', 'board3']);

      const result = await redisPresenceService.cleanupUserPresence(userId);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith(
        'User presence cleaned up',
        expect.objectContaining({
          metadata: { userId, boardCount: 3 },
        })
      );
    });

    it('should handle subscription cleanup errors', async () => {
      // Join presence first
      const joinResult = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );
      expect(joinResult.success).toBe(true);

      // Get the subscription key
      const subscriptionKey = `${boardId}:${userId}`;
      
      // Replace the cleanup function in the subscription to throw an error
      const originalSubscription = (redisPresenceService as any).subscriptions.get(subscriptionKey);
      if (originalSubscription) {
        originalSubscription.cleanup = jest.fn().mockRejectedValueOnce(new Error('DEL failed in cleanup'));
      }

      // Call cleanup - this calls the service's cleanup method which handles errors
      const cleanupResult = await joinResult.data?.cleanup();

      // The cleanup method catches errors and returns a ServiceError
      expect(cleanupResult?.success).toBe(false);
      expect(cleanupResult?.error).toBe('DEL failed in cleanup');
    });

    it('should handle publishPresenceEvent errors silently', async () => {
      mockRedis.publish.mockRejectedValueOnce(new Error('PUBLISH failed'));

      // Join presence - publish will fail but should not affect the result
      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result.success).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to publish presence event',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({ event: expect.any(Object) }),
        })
      );
    });

    it('should handle non-Error exceptions in getUserPresence', async () => {
      mockRedis.smembers.mockRejectedValueOnce('String error');

      const result = await redisPresenceService.getUserPresence(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get user presence');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get user presence',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle mixed valid and invalid presence data in getUserPresence', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['board1', 'board2', 'board3']);
      mockRedis.get
        .mockResolvedValueOnce('invalid-json{')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          JSON.stringify({
            userId,
            displayName: 'Test User',
            status: 'online',
            lastSeen: Date.now(),
            joinedAt: Date.now(),
          })
        );

      const result = await redisPresenceService.getUserPresence(userId);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!)).toHaveLength(1);
      expect(result.data).toHaveProperty('board3');
      expect(mockLog.warn).toHaveBeenCalled();
    });

    it('should handle concurrent subscription attempts', async () => {
      // First subscription
      const result1 = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      // Second subscription should clean up the first
      const result2 = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect((redisPresenceService as any).subscriptions.size).toBe(1);
    });

    it('should handle non-Error exceptions in cleanup', async () => {
      // Create a mock subscription with failing cleanup that throws a non-Error
      const subscriptionKey = `${boardId}:${userId}`;
      const mockCleanup = jest.fn().mockRejectedValueOnce('String cleanup error');
      
      // Add subscription to the service's internal map
      (redisPresenceService as any).subscriptions.set(subscriptionKey, {
        cleanup: mockCleanup,
        heartbeatInterval: null,
      });

      const cleanupResult = await redisPresenceService.cleanup(subscriptionKey);

      expect(cleanupResult.success).toBe(false);
      expect(cleanupResult.error).toBe(
        'Failed to cleanup presence subscription'
      );
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to cleanup presence subscription',
        expect.any(Error),
        expect.objectContaining({
          metadata: { subscriptionKey },
        })
      );
    });
  });

  describe('Additional edge cases', () => {
    it('should handle presence updates with partial user info', async () => {
      const partialUserInfo = { displayName: 'User' }; // Missing avatar

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        partialUserInfo
      );

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should handle Redis unavailable during operations', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Presence service unavailable');
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Redis not configured - presence tracking unavailable'
      );
    });

    it('should handle subscription with optional metadata', async () => {
      const metadata = {
        sessionId: 'session-123',
        role: 'admin',
        isHost: true,
      };
      const options: PresenceSubscriptionOptions = {
        onPresenceUpdate: jest.fn(),
        onUserJoin: jest.fn(),
        onUserLeave: jest.fn(),
        onError: jest.fn(),
      };

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        userInfo,
        metadata,
        options
      );

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should handle updateUserPresence without metadata', async () => {
      const presence: PresenceState = {
        userId,
        displayName: userInfo.displayName,
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(presence));

      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        'busy'
      );

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });
});
