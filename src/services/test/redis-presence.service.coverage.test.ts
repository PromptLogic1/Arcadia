/**
 * @jest-environment node
 */

import { redisPresenceService } from '../redis-presence.service';
import { getRedisClient, isRedisConfigured, createRedisKey } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { PresenceState } from '../redis-presence.service';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/logger');

// Define a type for our mock Redis client
type MockRedisClient = {
  setex: jest.Mock;
  sadd: jest.Mock;
  expire: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  srem: jest.Mock;
  smembers: jest.Mock;
  publish: jest.Mock;
};

describe('redisPresenceService coverage tests', () => {
  let mockRedis: MockRedisClient;

  afterEach(async () => {
    // Clean up any running intervals/timers
    jest.clearAllTimers();
    jest.useRealTimers();

    // Clear the service's internal subscriptions map
    // Access the private subscriptions property via type assertion
    (
      redisPresenceService as unknown as { subscriptions: Map<string, unknown> }
    ).subscriptions.clear();

    // Ensure window remains undefined after each test
    // @ts-expect-error - We're intentionally setting window to undefined
    delete global.window;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Ensure window is undefined for server-side tests
    // @ts-expect-error - We're intentionally setting window to undefined
    delete global.window;

    // Default mock setup
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      sadd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      publish: jest.fn().mockResolvedValue(1),
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    (isRedisConfigured as jest.Mock).mockReturnValue(true);
    (createRedisKey as jest.Mock).mockImplementation(
      (prefix: string, ...parts: string[]) => {
        return `${prefix}:${parts.join(':')}`;
      }
    );
  });

  describe('updateUserPresence edge cases', () => {
    it('should handle client-side execution', async () => {
      // Temporarily restore window for this test
      // @ts-expect-error - Mocking window for test purposes
      global.window = {};

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      // Clean up - MUST delete window
      // @ts-expect-error - We're intentionally setting window to undefined
      delete global.window;
    });

    it('should handle Redis not configured', async () => {
      (isRedisConfigured as jest.Mock).mockReturnValue(false);

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Presence service unavailable');
      expect(log.warn).toHaveBeenCalledWith(
        'Redis not configured - presence tracking unavailable'
      );
    });

    it('should handle missing user presence', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'away'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User presence not found');
    });

    it('should handle invalid JSON in presence data', async () => {
      mockRedis.get.mockResolvedValue('invalid-json{');

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'busy'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid presence data, please reconnect');
      expect(log.warn).toHaveBeenCalledWith(
        'Invalid JSON data in presence, removing and recreating',
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-456',
            presenceData: 'invalid-json{',
          }),
        })
      );
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should handle presence schema validation failure', async () => {
      const invalidPresence = {
        userId: 'user-456',
        // Missing required fields like displayName, status, lastSeen, joinedAt
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(invalidPresence));

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'online'
      );

      expect(result.success).toBe(false);
      // Zod validation errors are returned as the actual error message
      expect(result.error).toContain('Required');
      expect(log.error).toHaveBeenCalled();
    });

    it('should successfully update presence with metadata', async () => {
      const currentPresence: PresenceState = {
        userId: 'user-456',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        status: 'online',
        lastSeen: Date.now() - 30000,
        joinedAt: Date.now() - 60000,
        metadata: {
          boardId: 'board-123',
          role: 'player',
        },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(currentPresence));

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'away',
        { currentCell: 'B3', activity: 'playing' }
      );

      expect(result.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        '@arcadia/presence:user:board-123:user-456',
        60,
        expect.stringContaining('"status":"away"')
      );
      expect(mockRedis.expire).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('should handle Redis operation failures', async () => {
      const currentPresence: PresenceState = {
        userId: 'user-456',
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(currentPresence));
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'busy'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update user presence',
        expect.any(Error),
        expect.objectContaining({
          metadata: {
            boardId: 'board-123',
            userId: 'user-456',
            status: 'busy',
          },
        })
      );
    });
  });

  describe('leaveBoardPresence edge cases', () => {
    it('should handle client-side execution', async () => {
      // Temporarily restore window for this test
      // @ts-expect-error - Mocking window for test purposes
      global.window = {};

      const result = await redisPresenceService.leaveBoardPresence(
        'board-123',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Presence operations are only available on the server'
      );

      // Clean up - MUST delete window
      // @ts-expect-error - We're intentionally setting window to undefined
      delete global.window;
    });

    it('should successfully leave board presence', async () => {
      const result = await redisPresenceService.leaveBoardPresence(
        'board-123',
        'user-456'
      );

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        '@arcadia/presence:user:board-123:user-456'
      );
      expect(mockRedis.srem).toHaveBeenCalledTimes(2);
      expect(mockRedis.publish).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'User left board presence',
        expect.objectContaining({
          metadata: { boardId: 'board-123', userId: 'user-456' },
        })
      );
    });

    it('should handle Redis failures gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis timeout'));

      const result = await redisPresenceService.leaveBoardPresence(
        'board-123',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis timeout');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getBoardPresence edge cases', () => {
    it('should handle empty board (no users)', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await redisPresenceService.getBoardPresence('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle users with invalid JSON presence data', async () => {
      mockRedis.smembers.mockResolvedValue(['user-1', 'user-2', 'user-3']);
      mockRedis.get
        .mockResolvedValueOnce('invalid-json')
        .mockResolvedValueOnce(
          JSON.stringify({
            userId: 'user-2',
            displayName: 'Valid User',
            status: 'online',
            lastSeen: Date.now(),
            joinedAt: Date.now(),
          })
        )
        .mockResolvedValueOnce(null);

      const result = await redisPresenceService.getBoardPresence('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user-2');
      expect(Object.keys(result.data!)).toHaveLength(1);
      expect(log.warn).toHaveBeenCalledWith(
        'Invalid JSON data in board presence, skipping user',
        expect.any(Object)
      );
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should handle users with invalid presence schema', async () => {
      mockRedis.smembers.mockResolvedValue(['user-1', 'user-2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ invalidData: true }))
        .mockResolvedValueOnce(
          JSON.stringify({
            userId: 'user-2',
            displayName: 'Valid User',
            status: 'away',
            lastSeen: Date.now(),
            joinedAt: Date.now(),
          })
        );

      const result = await redisPresenceService.getBoardPresence('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user-2');
      expect(Object.keys(result.data!)).toHaveLength(1);
      expect(log.warn).toHaveBeenCalledWith(
        'Invalid presence data found',
        expect.any(Object)
      );
    });

    it('should handle Redis failures', async () => {
      mockRedis.smembers.mockRejectedValue(new Error('Connection lost'));

      const result = await redisPresenceService.getBoardPresence('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
      expect(log.error).toHaveBeenCalled();
    });

    it('should successfully retrieve multiple user presences', async () => {
      mockRedis.smembers.mockResolvedValue(['user-1', 'user-2']);
      const presence1: PresenceState = {
        userId: 'user-1',
        displayName: 'User One',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now() - 60000,
      };
      const presence2: PresenceState = {
        userId: 'user-2',
        displayName: 'User Two',
        status: 'busy',
        lastSeen: Date.now(),
        joinedAt: Date.now() - 30000,
        metadata: { currentCell: 'A1' },
      };
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(presence1))
        .mockResolvedValueOnce(JSON.stringify(presence2));

      const result = await redisPresenceService.getBoardPresence('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        'user-1': presence1,
        'user-2': presence2,
      });
      expect(log.debug).toHaveBeenCalledWith(
        'Retrieved board presence',
        expect.objectContaining({
          metadata: { boardId: 'board-123', userCount: 2 },
        })
      );
    });
  });

  describe('cleanupUserPresence edge cases', () => {
    it('should handle user with no boards', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await redisPresenceService.cleanupUserPresence('user-123');

      expect(result.success).toBe(true);
      expect(log.info).toHaveBeenCalledWith(
        'User presence cleaned up',
        expect.objectContaining({
          metadata: { userId: 'user-123', boardCount: 0 },
        })
      );
    });

    it('should handle user in multiple boards', async () => {
      mockRedis.smembers.mockResolvedValue(['board-1', 'board-2', 'board-3']);

      const result = await redisPresenceService.cleanupUserPresence('user-123');

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
      expect(mockRedis.srem).toHaveBeenCalledTimes(6); // 2 calls per board
      expect(log.info).toHaveBeenCalledWith(
        'User presence cleaned up',
        expect.objectContaining({
          metadata: { userId: 'user-123', boardCount: 3 },
        })
      );
    });

    it('should handle Redis failures during cleanup', async () => {
      mockRedis.smembers.mockRejectedValue(new Error('Redis error'));

      const result = await redisPresenceService.cleanupUserPresence('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getUserPresence edge cases', () => {
    it('should handle user not in any boards', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await redisPresenceService.getUserPresence('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle mixed valid and invalid presence data', async () => {
      mockRedis.smembers.mockResolvedValue(['board-1', 'board-2', 'board-3']);
      mockRedis.get
        .mockResolvedValueOnce('invalid-json{')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          JSON.stringify({
            userId: 'user-123',
            displayName: 'Test User',
            status: 'online',
            lastSeen: Date.now(),
            joinedAt: Date.now(),
          })
        );

      const result = await redisPresenceService.getUserPresence('user-123');

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!)).toHaveLength(1);
      expect(result.data).toHaveProperty('board-3');
      expect(log.warn).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockRedis.smembers.mockRejectedValue('String error');

      const result = await redisPresenceService.getUserPresence('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get user presence');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get user presence',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('publishPresenceEvent edge cases', () => {
    it('should handle publish failures silently', async () => {
      mockRedis.publish.mockRejectedValue(new Error('Publish failed'));

      // This method is private, so we test it indirectly through updateUserPresence
      const presence: PresenceState = {
        userId: 'user-456',
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(presence));

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'away'
      );

      // Should still succeed even if publish fails
      expect(result.success).toBe(true);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish presence event',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle non-Error exceptions in publish', async () => {
      mockRedis.publish.mockRejectedValue('String error');

      const presence: PresenceState = {
        userId: 'user-456',
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(presence));

      const result = await redisPresenceService.updateUserPresence(
        'board-123',
        'user-456',
        'busy'
      );

      expect(result.success).toBe(true);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish presence event',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('subscribeToPresenceEvents', () => {
    it('should return a cleanup function for serverless environments', async () => {
      const result = await redisPresenceService.subscribeToPresenceEvents(
        'board-123',
        {
          onPresenceUpdate: jest.fn(),
          onUserJoin: jest.fn(),
          onUserLeave: jest.fn(),
        }
      );

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('function');
      expect(log.info).toHaveBeenCalledWith(
        'Presence event subscription requested',
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            note: expect.stringContaining('serverless environments'),
          }),
        })
      );

      // Test cleanup function
      const cleanup = result.data!;
      await cleanup();
      expect(log.debug).toHaveBeenCalledWith(
        'Presence subscription cleanup',
        expect.objectContaining({ metadata: { boardId: 'board-123' } })
      );
    });

    it('should handle errors in subscription setup', async () => {
      // Mock an error by temporarily making log.info throw
      jest.mocked(log.info).mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const result = await redisPresenceService.subscribeToPresenceEvents(
        'board-123',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logging failed');
      expect(log.error).toHaveBeenCalled();

      // Clear the mock implementation to restore normal behavior
      jest.mocked(log.info).mockClear();
    });
  });

  describe('joinBoardPresence comprehensive coverage', () => {
    it('should successfully join board presence', async () => {
      const result = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User', avatar: 'https://example.com/avatar.jpg' },
        { sessionId: 'session-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data?.updatePresence).toBe('function');
      expect(typeof result.data?.cleanup).toBe('function');
      expect(typeof result.data?.getCurrentState).toBe('function');

      // Clean up the subscription
      await result.data?.cleanup();
    });

    it('should create heartbeat interval when joining', async () => {
      jest.useFakeTimers();

      const result = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User', avatar: 'https://example.com/avatar.jpg' },
        { sessionId: 'session-123' }
      );

      expect(result.success).toBe(true);

      // Verify that setInterval was called (heartbeat setup)
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // Cleanup
      if (result.data?.cleanup) {
        await result.data.cleanup();
      }
      jest.useRealTimers();
    });

    it('should handle non-Error exceptions in joinBoardPresence', async () => {
      mockRedis.setex.mockRejectedValue('String error');

      const result = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to join board presence');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to join board presence',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should provide cleanup function when joining', async () => {
      const result = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.cleanup).toBeDefined();
      expect(typeof result.data?.cleanup).toBe('function');

      // Call cleanup to ensure it works
      const cleanupResult = await result.data?.cleanup();
      expect(cleanupResult?.success).toBe(true);
    });

    it('should handle getCurrentState with errors', async () => {
      const result = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User' }
      );

      expect(result.success).toBe(true);

      // Mock getBoardPresence failure
      mockRedis.smembers.mockRejectedValue(new Error('Failed to get members'));

      const stateResult = await result.data?.getCurrentState();

      expect(stateResult?.success).toBe(false);
      expect(stateResult?.error).toBe('Failed to get members');

      // Clean up
      if (result.data?.cleanup) {
        await result.data.cleanup();
      }
    });

    it('should handle updatePresence through subscription result', async () => {
      const joinResult = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User' }
      );

      expect(joinResult.success).toBe(true);

      // Setup mock for successful update
      const presence: PresenceState = {
        userId: 'user-456',
        displayName: 'Test User',
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
        metadata: { boardId: 'board-123' },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(presence));

      const updateResult = await joinResult.data?.updatePresence('busy', {
        currentCell: 'B2',
      });

      expect(updateResult?.success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        60,
        expect.stringContaining('"status":"busy"')
      );

      // Clean up
      if (joinResult.data?.cleanup) {
        await joinResult.data.cleanup();
      }
    });
  });

  describe('cleanup method edge cases', () => {
    it('should handle non-existent subscription gracefully', async () => {
      const result = await redisPresenceService.cleanup('non-existent-key');

      expect(result.success).toBe(true);
      expect(log.debug).not.toHaveBeenCalled();
    });

    it('should cleanup existing subscriptions', async () => {
      // First join to create a subscription
      const joinResult = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        { displayName: 'Test User' }
      );

      expect(joinResult.success).toBe(true);

      const cleanupResult =
        await redisPresenceService.cleanup('board-123:user-456');

      expect(cleanupResult.success).toBe(true);
      expect(log.debug).toHaveBeenCalledWith(
        'Presence subscription cleaned up',
        expect.objectContaining({
          metadata: { subscriptionKey: 'board-123:user-456' },
        })
      );
    });

    it('should handle cleanup of subscriptions with error handling', async () => {
      // Create a subscription
      const joinResult = await redisPresenceService.joinBoardPresence(
        'board-123',
        'user-456',
        {
          displayName: 'Test User',
        }
      );

      expect(joinResult.success).toBe(true);

      // Call cleanup through the service method
      const cleanupResult =
        await redisPresenceService.cleanup('board-123:user-456');

      // Should succeed normally
      expect(cleanupResult.success).toBe(true);
    });
  });
});
