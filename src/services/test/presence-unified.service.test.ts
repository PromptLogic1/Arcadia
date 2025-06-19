/**
 * @jest-environment node
 */

import { presenceService } from '../presence-unified.service';
import { redisPresenceService } from '../redis-presence.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('../redis-presence.service');
jest.mock('@/lib/logger');

const mockRedisPresenceService = redisPresenceService as jest.Mocked<
  typeof redisPresenceService
>;

describe('presenceService (Unified)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackPresence', () => {
    const channelName = 'presence:bingo:board-123';
    const userId = 'user-456';
    const userInfo = {
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    };
    const metadata = {
      sessionId: 'session-789',
      role: 'player',
      isHost: false,
    };

    it('should track presence successfully', async () => {
      const mockCleanup = jest.fn().mockResolvedValue({ success: true });
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {
          cleanup: mockCleanup,
          updatePresence: jest.fn(),
          getCurrentState: jest.fn().mockResolvedValue({
            success: true,
            data: undefined,
          }),
        },
        error: null,
      });

      const cleanupFn = await presenceService.trackPresence(
        channelName,
        userId,
        userInfo,
        metadata
      );

      expect(mockRedisPresenceService.joinBoardPresence).toHaveBeenCalledWith(
        'board-123',
        userId,
        {
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
        metadata,
        expect.objectContaining({
          onError: expect.any(Function),
        })
      );

      // Test cleanup function
      await cleanupFn();
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should handle missing display name', async () => {
      const userInfoWithoutName = {
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const mockCleanup = jest.fn().mockResolvedValue({ success: true });
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {
          cleanup: mockCleanup,
          updatePresence: jest.fn(),
          getCurrentState: jest.fn().mockResolvedValue({
            success: true,
            data: undefined,
          }),
        },
        error: null,
      });

      await presenceService.trackPresence(
        channelName,
        userId,
        userInfoWithoutName
      );

      expect(mockRedisPresenceService.joinBoardPresence).toHaveBeenCalledWith(
        'board-123',
        userId,
        {
          displayName: `User ${userId}`,
          avatar: 'https://example.com/avatar.jpg',
        },
        undefined,
        expect.any(Object)
      );
    });

    it('should handle null avatar_url', async () => {
      const userInfoWithNullAvatar = {
        display_name: 'Test User',
        avatar_url: null,
      };

      const mockCleanup = jest.fn().mockResolvedValue({ success: true });
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {
          cleanup: mockCleanup,
          updatePresence: jest.fn(),
          getCurrentState: jest.fn().mockResolvedValue({
            success: true,
            data: undefined,
          }),
        },
        error: null,
      });

      await presenceService.trackPresence(
        channelName,
        userId,
        userInfoWithNullAvatar
      );

      expect(mockRedisPresenceService.joinBoardPresence).toHaveBeenCalledWith(
        'board-123',
        userId,
        {
          displayName: 'Test User',
          avatar: undefined,
        },
        undefined,
        expect.any(Object)
      );
    });

    it('should handle invalid channel name format', async () => {
      const invalidChannelName = '';

      const cleanupFn = await presenceService.trackPresence(
        invalidChannelName,
        userId,
        userInfo
      );

      expect(cleanupFn).toBeInstanceOf(Function);
      expect(log.debug).toHaveBeenCalledWith(
        'Failed to track presence',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Invalid channel name format',
          }),
        })
      );

      // Cleanup should be no-op
      await cleanupFn();
    });

    it('should handle redis service failure', async () => {
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Redis connection failed',
      });

      const cleanupFn = await presenceService.trackPresence(
        channelName,
        userId,
        userInfo
      );

      expect(cleanupFn).toBeInstanceOf(Function);
      expect(log.debug).toHaveBeenCalledWith(
        'Failed to track presence',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Redis connection failed',
          }),
        })
      );
    });

    it('should handle redis service returning no data', async () => {
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const cleanupFn = await presenceService.trackPresence(
        channelName,
        userId,
        userInfo
      );

      expect(cleanupFn).toBeInstanceOf(Function);
      expect(log.debug).toHaveBeenCalledWith(
        'Failed to track presence',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Failed to join board presence',
          }),
        })
      );
    });

    it('should handle cleanup failure gracefully', async () => {
      const mockCleanup = jest
        .fn()
        .mockResolvedValue({ success: false, error: 'Cleanup failed' });
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {
          cleanup: mockCleanup,
          updatePresence: jest.fn(),
          getCurrentState: jest.fn().mockResolvedValue({
            success: true,
            data: undefined,
          }),
        },
        error: null,
      });

      const cleanupFn = await presenceService.trackPresence(
        channelName,
        userId,
        userInfo
      );
      await cleanupFn();

      expect(log.debug).toHaveBeenCalledWith(
        'Presence cleanup failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Cleanup failed',
          }),
        })
      );
    });

    it('should handle unexpected error during tracking', async () => {
      mockRedisPresenceService.joinBoardPresence.mockRejectedValueOnce(
        new Error('Unexpected error')
      );

      const cleanupFn = await presenceService.trackPresence(
        channelName,
        userId,
        userInfo
      );

      expect(cleanupFn).toBeInstanceOf(Function);
      expect(log.debug).toHaveBeenCalledWith(
        'Failed to track presence',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Unexpected error',
          }),
        })
      );
    });

    it('should handle non-Error objects', async () => {
      mockRedisPresenceService.joinBoardPresence.mockRejectedValueOnce(
        'String error'
      );

      const _cleanupFn = await presenceService.trackPresence(
        channelName,
        userId,
        userInfo
      );

      expect(log.debug).toHaveBeenCalledWith(
        'Failed to track presence',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'String error',
          }),
        })
      );
    });

    it('should call onError callback when provided', async () => {
      const mockCleanup = jest.fn().mockResolvedValue({ success: true });
      const _mockOnError = jest.fn();

      mockRedisPresenceService.joinBoardPresence.mockImplementationOnce(
        (boardId, userId, userInfo, metadata, options) => {
          // Simulate error callback
          if (options?.onError) {
            options.onError(new Error('Test error'));
          }
          return Promise.resolve({
            success: true,
            data: {
              cleanup: mockCleanup,
              updatePresence: jest.fn(),
              getCurrentState: jest.fn().mockResolvedValue({
                success: true,
                data: undefined,
              }),
            },
            error: null,
          });
        }
      );

      await presenceService.trackPresence(channelName, userId, userInfo);

      expect(log.debug).toHaveBeenCalledWith(
        'Presence tracking error',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Test error',
          }),
        })
      );
    });
  });

  describe('updatePresence', () => {
    const channelName = 'presence:bingo:board-123';
    const userId = 'user-456';

    it('should update presence status successfully', async () => {
      mockRedisPresenceService.updateUserPresence.mockResolvedValueOnce({
        success: true,
        data: undefined,
        error: null,
      });

      const result = await presenceService.updatePresence(
        channelName,
        userId,
        'online',
        'playing'
      );

      expect(result.success).toBe(true);
      expect(mockRedisPresenceService.updateUserPresence).toHaveBeenCalledWith(
        'board-123',
        userId,
        'online',
        { activity: 'playing' }
      );
    });

    it('should map offline status to away', async () => {
      mockRedisPresenceService.updateUserPresence.mockResolvedValueOnce({
        success: true,
        data: undefined,
        error: null,
      });

      await presenceService.updatePresence(channelName, userId, 'offline');

      expect(mockRedisPresenceService.updateUserPresence).toHaveBeenCalledWith(
        'board-123',
        userId,
        'away',
        undefined
      );
    });

    it('should handle activity parameter', async () => {
      mockRedisPresenceService.updateUserPresence.mockResolvedValueOnce({
        success: true,
        data: undefined,
        error: null,
      });

      await presenceService.updatePresence(
        channelName,
        userId,
        'online',
        'editing'
      );

      expect(mockRedisPresenceService.updateUserPresence).toHaveBeenCalledWith(
        'board-123',
        userId,
        'online',
        { activity: 'editing' }
      );
    });

    it('should handle invalid channel name format', async () => {
      const result = await presenceService.updatePresence('', userId, 'online');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid channel name format');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle redis service failure', async () => {
      mockRedisPresenceService.updateUserPresence.mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Update failed',
      });

      const result = await presenceService.updatePresence(
        channelName,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected error', async () => {
      mockRedisPresenceService.updateUserPresence.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await presenceService.updatePresence(
        channelName,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle non-Error objects', async () => {
      mockRedisPresenceService.updateUserPresence.mockRejectedValueOnce(
        'String error'
      );

      const result = await presenceService.updatePresence(
        channelName,
        userId,
        'online'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update presence');
    });
  });

  describe('getPresence', () => {
    const channelName = 'presence:bingo:board-123';

    it('should get presence data successfully', async () => {
      const mockPresenceData = {
        'user-1': {
          userId: 'user-1',
          displayName: 'User 1',
          avatar: 'avatar1.jpg',
          status: 'online' as const,
          lastSeen: Date.now(),
          joinedAt: Date.now(),
          metadata: {
            activity: 'playing' as const,
            sessionId: 'session-1',
          },
        },
        'user-2': {
          userId: 'user-2',
          displayName: 'User 2',
          avatar: 'avatar2.jpg',
          status: 'busy' as const,
          lastSeen: Date.now(),
          joinedAt: Date.now(),
          metadata: {
            activity: 'viewing' as const,
          },
        },
      };

      mockRedisPresenceService.getBoardPresence.mockResolvedValueOnce({
        success: true,
        data: mockPresenceData,
        error: null,
      });

      const result = await presenceService.getPresence(channelName);

      expect(result).toEqual({
        presence: [
          {
            userId: 'user-1',
            user_id: 'user-1',
            displayName: 'User 1',
            avatar: 'avatar1.jpg',
            status: 'online',
            lastSeen: new Date(
              mockPresenceData['user-1'].lastSeen
            ).toISOString(),
            activity: 'playing',
            metadata: {
              boardId: 'board-123',
              sessionId: 'session-1',
              role: undefined,
              isHost: undefined,
              currentCell: undefined,
              color: undefined,
              activity: 'playing',
            },
          },
          {
            userId: 'user-2',
            user_id: 'user-2',
            displayName: 'User 2',
            avatar: 'avatar2.jpg',
            status: 'away', // busy mapped to away
            lastSeen: new Date(
              mockPresenceData['user-2'].lastSeen
            ).toISOString(),
            activity: 'viewing',
            metadata: {
              boardId: 'board-123',
              sessionId: undefined,
              role: undefined,
              isHost: undefined,
              currentCell: undefined,
              color: undefined,
              activity: 'viewing',
            },
          },
        ],
        onlineCount: 1, // Only 'online' status counts
      });

      expect(mockRedisPresenceService.getBoardPresence).toHaveBeenCalledWith(
        'board-123'
      );
    });

    it('should handle empty presence data', async () => {
      mockRedisPresenceService.getBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {},
        error: null,
      });

      const result = await presenceService.getPresence(channelName);

      expect(result).toEqual({
        presence: [],
        onlineCount: 0,
      });
    });

    it('should handle invalid channel name format', async () => {
      const result = await presenceService.getPresence('invalid-channel');

      expect(result).toBeNull();
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get presence',
        expect.any(Error),
        { metadata: { channelName: 'invalid-channel' } }
      );
    });

    it('should handle redis service failure', async () => {
      mockRedisPresenceService.getBoardPresence.mockResolvedValueOnce({
        success: false,
        error: 'Get failed',
        data: null,
      });

      const result = await presenceService.getPresence(channelName);

      expect(result).toBeNull();
    });

    it('should handle redis service returning no data', async () => {
      mockRedisPresenceService.getBoardPresence.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await presenceService.getPresence(channelName);

      expect(result).toBeNull();
    });

    it('should handle unexpected error', async () => {
      mockRedisPresenceService.getBoardPresence.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await presenceService.getPresence(channelName);

      expect(result).toBeNull();
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get presence',
        expect.any(Error),
        { metadata: { channelName } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockRedisPresenceService.getBoardPresence.mockRejectedValueOnce(
        'String error'
      );

      const result = await presenceService.getPresence(channelName);

      expect(result).toBeNull();
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get presence',
        expect.any(Error),
        { metadata: { channelName } }
      );
    });
  });

  describe('subscribeToPresence', () => {
    const boardId = 'board-123';

    it('should subscribe to presence updates successfully', async () => {
      const mockUpdatePresence = jest.fn().mockResolvedValue({ success: true });
      const mockCleanup = jest.fn().mockResolvedValue({ success: true });
      const mockOnPresenceUpdate = jest.fn();
      const mockOnUserJoin = jest.fn();
      const mockOnUserLeave = jest.fn();

      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {
          updatePresence: mockUpdatePresence,
          cleanup: mockCleanup,
          getCurrentState: jest.fn().mockResolvedValue({
            success: true,
            data: {},
            error: null,
          }),
        },
        error: null,
      });

      const subscription = await presenceService.subscribeToPresence(boardId, {
        onPresenceUpdate: mockOnPresenceUpdate,
        onUserJoin: mockOnUserJoin,
        onUserLeave: mockOnUserLeave,
      });

      expect(mockRedisPresenceService.joinBoardPresence).toHaveBeenCalledWith(
        boardId,
        'system-observer',
        { displayName: 'Observer' },
        {},
        expect.objectContaining({
          onPresenceUpdate: expect.any(Function),
          onUserJoin: expect.any(Function),
          onUserLeave: expect.any(Function),
        })
      );

      // Test the returned subscription object
      expect(subscription.updatePresence).toBeInstanceOf(Function);
      expect(subscription.cleanup).toBe(mockCleanup);

      // Test updatePresence mapping
      await subscription.updatePresence('offline');
      expect(mockUpdatePresence).toHaveBeenCalledWith('away');
    });

    it('should handle presence update callbacks', async () => {
      const mockOnPresenceUpdate = jest.fn();
      let presenceUpdateCallback:
        | ((boardId: string, presenceState: any) => void)
        | undefined;

      mockRedisPresenceService.joinBoardPresence.mockImplementationOnce(
        (boardId, userId, userInfo, metadata, options) => {
          presenceUpdateCallback = options?.onPresenceUpdate;
          return Promise.resolve({
            success: true,
            data: {
              updatePresence: jest.fn(),
              cleanup: jest.fn(),
              getCurrentState: jest.fn().mockResolvedValue({
                success: true,
                data: {},
                error: null,
              }),
            },
            error: null,
          });
        }
      );

      await presenceService.subscribeToPresence(boardId, {
        onPresenceUpdate: mockOnPresenceUpdate,
      });

      // Simulate presence update
      const mockPresenceState = {
        'user-1': {
          userId: 'user-1',
          displayName: 'User 1',
          status: 'busy' as const,
          lastSeen: Date.now(),
          metadata: { activity: 'playing' as const },
        },
      };

      if (presenceUpdateCallback) {
        presenceUpdateCallback(boardId, mockPresenceState);
      }

      expect(mockOnPresenceUpdate).toHaveBeenCalledWith({
        'user-1': expect.objectContaining({
          userId: 'user-1',
          user_id: 'user-1',
          displayName: 'User 1',
          status: 'away', // busy mapped to away
          activity: 'playing',
        }),
      });
    });

    it('should handle user join callbacks', async () => {
      const mockOnUserJoin = jest.fn();
      let userJoinCallback:
        | ((boardId: string, userId: string, presence: any) => void)
        | undefined;

      mockRedisPresenceService.joinBoardPresence.mockImplementationOnce(
        (boardId, userId, userInfo, metadata, options) => {
          userJoinCallback = options?.onUserJoin;
          return Promise.resolve({
            success: true,
            data: {
              updatePresence: jest.fn(),
              cleanup: jest.fn(),
              getCurrentState: jest.fn().mockResolvedValue({
                success: true,
                data: {},
                error: null,
              }),
            },
            error: null,
          });
        }
      );

      await presenceService.subscribeToPresence(boardId, {
        onUserJoin: mockOnUserJoin,
      });

      // Simulate user join
      const mockPresence = {
        userId: 'user-1',
        displayName: 'User 1',
        status: 'online' as const,
        lastSeen: Date.now(),
        metadata: { activity: 'viewing' as const },
      };

      if (userJoinCallback) {
        userJoinCallback(boardId, 'user-1', mockPresence);
      }

      expect(mockOnUserJoin).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          userId: 'user-1',
          user_id: 'user-1',
          displayName: 'User 1',
          status: 'online',
          activity: 'viewing',
        })
      );
    });

    it('should handle user leave callbacks', async () => {
      const mockOnUserLeave = jest.fn();
      let userLeaveCallback:
        | ((boardId: string, userId: string) => void)
        | undefined;

      mockRedisPresenceService.joinBoardPresence.mockImplementationOnce(
        (boardId, userId, userInfo, metadata, options) => {
          userLeaveCallback = options?.onUserLeave;
          return Promise.resolve({
            success: true,
            data: {
              updatePresence: jest.fn(),
              cleanup: jest.fn(),
              getCurrentState: jest.fn().mockResolvedValue({
                success: true,
                data: {},
                error: null,
              }),
            },
            error: null,
          });
        }
      );

      await presenceService.subscribeToPresence(boardId, {
        onUserLeave: mockOnUserLeave,
      });

      // Simulate user leave
      if (userLeaveCallback) {
        userLeaveCallback(boardId, 'user-1');
      }

      expect(mockOnUserLeave).toHaveBeenCalledWith('user-1');
    });

    it('should handle subscription failure', async () => {
      const mockOnError = jest.fn();

      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: false,
        error: 'Subscription failed',
        data: null,
      });

      await expect(
        presenceService.subscribeToPresence(boardId, {
          onError: mockOnError,
        })
      ).rejects.toThrow('Subscription failed');

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle subscription returning no data', async () => {
      const mockOnError = jest.fn();

      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      await expect(
        presenceService.subscribeToPresence(boardId, {
          onError: mockOnError,
        })
      ).rejects.toThrow('Failed to subscribe to presence');

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle unexpected error during subscription', async () => {
      const mockOnError = jest.fn();

      mockRedisPresenceService.joinBoardPresence.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        presenceService.subscribeToPresence(boardId, {
          onError: mockOnError,
        })
      ).rejects.toThrow('Network error');

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle updatePresence error in subscription', async () => {
      const mockUpdatePresence = jest
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: {
          updatePresence: mockUpdatePresence,
          cleanup: jest.fn(),
          getCurrentState: jest.fn().mockResolvedValue({
            success: true,
            data: {},
            error: null,
          }),
        },
        error: null,
      });

      const subscription = await presenceService.subscribeToPresence(
        boardId,
        {}
      );

      await expect(subscription.updatePresence('online')).rejects.toThrow(
        'Update failed'
      );
    });

    it('should handle missing subscription data during updatePresence', async () => {
      mockRedisPresenceService.joinBoardPresence.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      await expect(
        presenceService.subscribeToPresence(boardId, {})
      ).rejects.toThrow('Failed to subscribe to presence');
    });

    it('should handle non-Error objects in subscription', async () => {
      const mockOnError = jest.fn();

      mockRedisPresenceService.joinBoardPresence.mockRejectedValueOnce(
        'String error'
      );

      await expect(
        presenceService.subscribeToPresence(boardId, {
          onError: mockOnError,
        })
      ).rejects.toThrow('Unknown error');

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
