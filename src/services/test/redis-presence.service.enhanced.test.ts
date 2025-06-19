/**
 * @jest-environment node
 */

import { redisPresenceService, PRESENCE_CONSTANTS } from '../redis-presence.service';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { log } from '@/lib/logger';
import type {
  PresenceState,
  PresenceSubscriptionOptions,
} from '../redis-presence.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

describe('RedisPresenceService - Enhanced Coverage', () => {
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
    mockGetRedisClient.mockReturnValue(mockRedis as any);

    // Clear any subscriptions
    (redisPresenceService as any).subscriptions.clear();
  });

  describe('Enhanced coverage for uncovered lines', () => {
    // Test for line 118 (server-side check in subscribeToBoard)
    it('should reject client-side subscribeToBoard operations', async () => {
      const originalWindow = (global as any).window;
      (global as any).window = {};

      const options: PresenceSubscriptionOptions = {
        onJoin: jest.fn(),
        onLeave: jest.fn(),
        onUpdate: jest.fn(),
      };

      const result = await redisPresenceService.subscribeToBoard(
        boardId,
        userId,
        userInfo,
        options
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Presence operations are only available on the server');

      (global as any).window = originalWindow;
    });

    // Test for lines 200-207 (getBoardPresence error handling)
    it('should handle Redis error in getBoardPresence', async () => {
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

    // Test for lines 217-218, 227, 234, 238 (updatePresence error scenarios)
    it('should handle Redis error during presence update', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('SETEX failed'));

      const result = await redisPresenceService.updatePresence(
        boardId,
        userId,
        { status: 'active' as const }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SETEX failed');
    });

    it('should handle non-Error objects in updatePresence', async () => {
      mockRedis.setex.mockRejectedValueOnce({ code: 'REDIS_ERROR' });

      const result = await redisPresenceService.updatePresence(
        boardId,
        userId,
        { status: 'active' as const }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update presence');
    });

    // Test for lines 276, 282-283 (removePresence error scenarios)
    it('should handle Redis error during presence removal', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('DEL failed'));

      const result = await redisPresenceService.removePresence(boardId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DEL failed');
    });

    it('should handle srem failure in removePresence', async () => {
      mockRedis.srem.mockRejectedValueOnce(new Error('SREM failed'));

      const result = await redisPresenceService.removePresence(boardId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SREM failed');
    });

    // Test for lines 387, 393-394 (startPresenceCleanup error scenarios)
    it('should handle cleanup errors gracefully', async () => {
      // Set up active cleanup interval
      (redisPresenceService as any).cleanupInterval = null;
      
      // Mock smembers to return board keys
      mockRedis.smembers.mockResolvedValueOnce(['board1', 'board2']);
      
      // Mock get to throw error
      mockRedis.get.mockRejectedValueOnce(new Error('GET failed'));

      // Start cleanup
      await redisPresenceService.startPresenceCleanup();

      // Force cleanup to run
      const cleanupMethod = (redisPresenceService as any).runCleanup.bind(redisPresenceService);
      await cleanupMethod();

      expect(mockLog.error).toHaveBeenCalledWith(
        'Error during presence cleanup',
        expect.any(Error)
      );

      // Stop cleanup
      await redisPresenceService.stopPresenceCleanup();
    });

    // Test for lines 462, 468-469 (heartbeat error scenarios)
    it('should handle heartbeat errors gracefully', async () => {
      const options: PresenceSubscriptionOptions = {
        onJoin: jest.fn(),
        onLeave: jest.fn(),
        onUpdate: jest.fn(),
      };

      // Subscribe first
      await redisPresenceService.subscribeToBoard(boardId, userId, userInfo, options);

      // Mock expire to fail
      mockRedis.expire.mockRejectedValueOnce(new Error('EXPIRE failed'));

      // Force heartbeat to run
      const subscription = (redisPresenceService as any).subscriptions.get(`${boardId}:${userId}`);
      if (subscription?.heartbeatInterval) {
        // Trigger heartbeat manually
        const heartbeatMethod = (redisPresenceService as any).sendHeartbeat.bind(
          redisPresenceService,
          boardId,
          userId
        );
        await heartbeatMethod();

        expect(mockLog.error).toHaveBeenCalledWith(
          'Failed to send heartbeat',
          expect.any(Error),
          expect.objectContaining({
            metadata: { boardId, userId },
          })
        );
      }
    });

    // Test for lines 522-525, 544-551, 577 (presence event handling)
    it('should handle invalid presence data during polling', async () => {
      mockRedis.smembers.mockResolvedValueOnce([userId]);
      mockRedis.get.mockResolvedValueOnce('invalid-json');

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Invalid presence data format',
        expect.objectContaining({
          metadata: { boardId, userId },
        })
      );
    });

    it('should handle null presence data gracefully', async () => {
      mockRedis.smembers.mockResolvedValueOnce([userId]);
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await redisPresenceService.getBoardPresence(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    // Test for lines 669, 675-676 (polling and subscription edge cases)
    it('should handle presence update with no active subscription', async () => {
      // Clear subscriptions
      (redisPresenceService as any).subscriptions.clear();

      const result = await redisPresenceService.updatePresence(
        boardId,
        userId,
        { status: 'active' as const }
      );

      // Should still succeed even without subscription
      expect(result.success).toBe(true);
    });

    // Test for lines 707-714, 731, 737-738 (cleanup edge cases)
    it('should handle presence cleanup with expired data', async () => {
      // Mock board with users
      mockRedis.smembers
        .mockResolvedValueOnce(['board1']) // Active boards
        .mockResolvedValueOnce([userId]); // Users in board

      // Mock presence data that indicates expired
      const expiredPresence: PresenceState = {
        userId,
        boardId: 'board1',
        status: 'active',
        userInfo,
        lastHeartbeat: Date.now() - PRESENCE_CONSTANTS.PRESENCE_TIMEOUT - 1000,
        joinedAt: Date.now() - 10000,
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(expiredPresence));

      // Start cleanup
      await redisPresenceService.startPresenceCleanup();

      // Force cleanup to run
      const cleanupMethod = (redisPresenceService as any).runCleanup.bind(redisPresenceService);
      await cleanupMethod();

      // Should remove expired presence
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(`presence:user:board1:${userId}`)
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        expect.stringContaining('presence:board:board1'),
        userId
      );

      // Stop cleanup
      await redisPresenceService.stopPresenceCleanup();
    });

    // Test for lines 770-783, 789-795 (private method coverage via public API)
    it('should handle subscription cleanup errors', async () => {
      const options: PresenceSubscriptionOptions = {
        onJoin: jest.fn(),
        onLeave: jest.fn(),
        onUpdate: jest.fn(),
      };

      // Subscribe first
      await redisPresenceService.subscribeToBoard(boardId, userId, userInfo, options);

      // Mock del to fail during cleanup
      mockRedis.del.mockRejectedValueOnce(new Error('DEL failed in cleanup'));

      // Call cleanup
      const subscriptionKey = `${boardId}:${userId}`;
      const cleanupMethod = (redisPresenceService as any).cleanup.bind(
        redisPresenceService,
        subscriptionKey
      );
      
      await cleanupMethod();

      // Should handle error gracefully
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to remove presence during cleanup',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({ subscriptionKey }),
        })
      );
    });

    it('should handle polling interval errors', async () => {
      const options: PresenceSubscriptionOptions = {
        onJoin: jest.fn(),
        onLeave: jest.fn(),
        onUpdate: jest.fn(),
      };

      // Subscribe with polling
      await redisPresenceService.subscribeToBoard(boardId, userId, userInfo, options);

      // Mock smembers to fail during polling
      mockRedis.smembers.mockRejectedValueOnce(new Error('SMEMBERS failed in polling'));

      // Force polling to run
      const subscription = (redisPresenceService as any).subscriptions.get(`${boardId}:${userId}`);
      if (subscription?.pollingInterval) {
        const pollMethod = (redisPresenceService as any).pollPresence.bind(
          redisPresenceService,
          boardId,
          subscription
        );
        await pollMethod();

        expect(mockLog.error).toHaveBeenCalledWith(
          'Error polling presence',
          expect.any(Error),
          expect.objectContaining({
            metadata: { boardId },
          })
        );
      }
    });
  });

  describe('Additional edge cases', () => {
    it('should handle presence updates with partial user info', async () => {
      const partialUserInfo = { displayName: 'User' }; // Missing avatar

      const result = await redisPresenceService.subscribeToBoard(
        boardId,
        userId,
        partialUserInfo,
        {
          onJoin: jest.fn(),
          onLeave: jest.fn(),
          onUpdate: jest.fn(),
        }
      );

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        PRESENCE_CONSTANTS.PRESENCE_TIMEOUT,
        expect.stringContaining('"displayName":"User"')
      );
    });

    it('should handle concurrent subscription attempts', async () => {
      const options: PresenceSubscriptionOptions = {
        onJoin: jest.fn(),
        onLeave: jest.fn(),
        onUpdate: jest.fn(),
      };

      // First subscription
      const result1 = await redisPresenceService.subscribeToBoard(
        boardId,
        userId,
        userInfo,
        options
      );

      // Second subscription should clean up the first
      const result2 = await redisPresenceService.subscribeToBoard(
        boardId,
        userId,
        userInfo,
        options
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect((redisPresenceService as any).subscriptions.size).toBe(1);
    });

    it('should handle Redis unavailable during operations', async () => {
      mockIsRedisConfigured.mockReturnValue(false);

      const result = await redisPresenceService.updatePresence(
        boardId,
        userId,
        { status: 'active' as const }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Presence service unavailable');
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Redis not configured - presence tracking unavailable'
      );
    });
  });
});