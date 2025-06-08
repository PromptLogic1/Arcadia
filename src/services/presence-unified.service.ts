/**
 * Unified Presence Service
 *
 * Backward-compatible wrapper around the new Redis-based presence service.
 * Maintains the same interface as the old presence service while using Redis.
 */

import { redisPresenceService } from './redis-presence.service';
import { log } from '@/lib/logger';

export interface PresenceState {
  userId: string;
  user_id?: string; // Backward compatibility
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  activity?: 'viewing' | 'playing' | 'editing';
  metadata?: {
    sessionId?: string;
    boardId?: string;
    role?: string;
    isHost?: boolean;
    currentCell?: string;
    color?: string;
    activity?: 'viewing' | 'playing' | 'editing';
  };
}

export interface PresenceData {
  presence: PresenceState[];
  onlineCount: number;
}

interface UserInfo {
  display_name?: string;
  avatar_url?: string | null;
}

export const presenceService = {
  /**
   * Track presence for a session
   */
  async trackPresence(
    channelName: string,
    userId: string,
    userInfo: UserInfo,
    metadata?: PresenceState['metadata']
  ): Promise<() => void> {
    try {
      // Extract board ID from channel name (format: "presence:bingo:{boardId}")
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        userId,
        {
          displayName: userInfo.display_name || `User ${userId}`,
          avatar: userInfo.avatar_url || undefined,
        },
        metadata,
        {
          onError: error => {
            log.debug('Presence tracking error', {
              metadata: {
                channelName,
                userId,
                error: error instanceof Error ? error.message : String(error),
              },
            });
          },
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to join board presence');
      }

      // Return cleanup function
      const { cleanup } = result.data;
      return async () => {
        const cleanupResult = await cleanup();
        if (!cleanupResult.success) {
          log.debug('Presence cleanup failed', {
            metadata: {
              channelName,
              userId,
              error: cleanupResult.error || 'Cleanup failed',
            },
          });
        }
      };
    } catch (error) {
      log.debug('Failed to track presence', {
        metadata: {
          channelName,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      // Return no-op cleanup function
      return () => {};
    }
  },

  /**
   * Update presence status
   */
  async updatePresence(
    channelName: string,
    userId: string,
    status: 'online' | 'away' | 'offline',
    activity?: 'viewing' | 'playing' | 'editing'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      // Map status to Redis presence service format
      const mappedStatus: 'online' | 'away' | 'busy' =
        status === 'offline' ? 'away' : status;

      const metadata = activity ? { activity } : undefined;
      const result = await redisPresenceService.updateUserPresence(
        boardId,
        userId,
        mappedStatus,
        metadata
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update presence');
      }

      return { success: true };
    } catch (error) {
      log.error(
        'Failed to update presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName, userId, status, activity },
        }
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update presence',
      };
    }
  },

  /**
   * Get current presence state
   */
  async getPresence(channelName: string): Promise<PresenceData | null> {
    try {
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      const result = await redisPresenceService.getBoardPresence(boardId);

      if (!result.success || !result.data) {
        return null;
      }

      // Convert Redis presence format to legacy format
      const presenceList: PresenceState[] = Object.entries(result.data).map(
        ([_key, presence]) => ({
          userId: presence.userId,
          user_id: presence.userId, // Backward compatibility
          displayName: presence.displayName,
          avatar: presence.avatar,
          status: presence.status === 'busy' ? 'away' : presence.status,
          lastSeen: new Date(presence.lastSeen).toISOString(),
          activity: presence.metadata?.activity,
          metadata: {
            boardId,
            sessionId: presence.metadata?.sessionId,
            role: presence.metadata?.role,
            isHost: presence.metadata?.isHost,
            currentCell: presence.metadata?.currentCell,
            color: presence.metadata?.color,
            activity: presence.metadata?.activity,
          },
        })
      );

      return {
        presence: presenceList,
        onlineCount: presenceList.filter(p => p.status === 'online').length,
      };
    } catch (error) {
      log.error(
        'Failed to get presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName },
        }
      );
      return null;
    }
  },

  /**
   * Subscribe to presence updates (compatibility layer)
   */
  async subscribeToPresence(
    boardId: string,
    options: {
      onPresenceUpdate?: (state: Record<string, PresenceState>) => void;
      onUserJoin?: (key: string, presence: PresenceState) => void;
      onUserLeave?: (key: string) => void;
      onError?: (error: Error) => void;
    }
  ) {
    try {
      const result = await redisPresenceService.joinBoardPresence(
        boardId,
        'system-observer', // Special user for subscription
        { displayName: 'Observer' },
        {},
        {
          onPresenceUpdate: (boardId, presenceState) => {
            if (options.onPresenceUpdate) {
              // Convert Redis presence format to legacy format
              const legacyState: Record<string, PresenceState> = {};
              for (const [key, presence] of Object.entries(presenceState)) {
                legacyState[key] = {
                  userId: presence.userId,
                  user_id: presence.userId, // Backward compatibility
                  displayName: presence.displayName,
                  avatar: presence.avatar,
                  status: presence.status === 'busy' ? 'away' : presence.status,
                  lastSeen: new Date(presence.lastSeen).toISOString(),
                  activity: presence.metadata?.activity,
                  metadata: presence.metadata,
                };
              }
              options.onPresenceUpdate(legacyState);
            }
          },
          onUserJoin: (boardId, userId, presence) => {
            if (options.onUserJoin) {
              const legacyPresence: PresenceState = {
                userId: presence.userId,
                user_id: presence.userId, // Backward compatibility
                displayName: presence.displayName,
                avatar: presence.avatar,
                status: presence.status === 'busy' ? 'away' : presence.status,
                lastSeen: new Date(presence.lastSeen).toISOString(),
                activity: presence.metadata?.activity,
                metadata: presence.metadata,
              };
              options.onUserJoin(userId, legacyPresence);
            }
          },
          onUserLeave: (boardId, userId) => {
            if (options.onUserLeave) {
              options.onUserLeave(userId);
            }
          },
          onError: options.onError,
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to subscribe to presence');
      }

      return {
        updatePresence: async (status: 'online' | 'away' | 'offline') => {
          const mappedStatus: 'online' | 'away' | 'busy' =
            status === 'offline' ? 'away' : status;
          const data = result.data;
          if (!data) {
            throw new Error('No subscription data available');
          }
          return data.updatePresence(mappedStatus);
        },
        cleanup: result.data.cleanup,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      if (options.onError) {
        options.onError(err);
      }
      throw err;
    }
  },
};
