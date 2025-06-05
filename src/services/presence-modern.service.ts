/**
 * Presence Service
 *
 * Handles real-time presence tracking for bingo boards.
 * Provides clean API for presence operations without direct Supabase usage.
 */

import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { RealtimePresenceState } from '@supabase/supabase-js';

export interface PresenceState {
  user_id: string;
  online_at: number;
  last_seen_at: number;
  status: 'online' | 'away' | 'busy';
  activity?: 'viewing' | 'playing' | 'editing';
}

interface PresenceStateWithRef extends PresenceState {
  presence_ref: string;
}

// Constants
export const PRESENCE_CONSTANTS = {
  STATUS: {
    ONLINE: 'online' as const,
    AWAY: 'away' as const,
    BUSY: 'busy' as const,
  },
  TIMING: {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    CLEANUP_TIMEOUT: 5000, // 5 seconds
  },
} as const;

// Helper function to convert presence state
const convertPresence = (presence: PresenceStateWithRef): PresenceState => ({
  user_id: presence.user_id,
  online_at: presence.online_at,
  last_seen_at: presence.last_seen_at,
  status: presence.status,
  activity: presence.activity || 'viewing',
});

export interface PresenceSubscriptionOptions {
  onPresenceUpdate?: (presenceState: Record<string, PresenceState>) => void;
  onUserJoin?: (key: string, presence: PresenceState) => void;
  onUserLeave?: (key: string) => void;
  onError?: (error: Error) => void;
}

class PresenceService {
  private supabase = createClient();
  private channels = new Map<
    string,
    ReturnType<typeof this.supabase.channel>
  >();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private visibilityListeners = new Map<string, () => void>();

  /**
   * Subscribe to presence updates for a specific board
   */
  async subscribeToPresence(
    boardId: string,
    options: PresenceSubscriptionOptions = {}
  ): Promise<{
    updatePresence: (status: PresenceState['status']) => Promise<void>;
    cleanup: () => void;
  }> {
    const { onPresenceUpdate, onUserJoin, onUserLeave, onError } = options;
    const channelName = `presence:bingo:${boardId}`;

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Clean up existing subscription if any
      await this.cleanup(boardId);

      // Create new channel
      const channel = this.supabase.channel(channelName);
      this.channels.set(boardId, channel);

      // Set up presence event handlers
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceStateWithRef>();
          const typedState = Object.entries(
            state as RealtimePresenceState<PresenceStateWithRef>
          ).reduce(
            (acc, [key, value]) => {
              if (Array.isArray(value) && value[0]) {
                acc[key] = convertPresence(value[0]);
              }
              return acc;
            },
            {} as Record<string, PresenceState>
          );

          logger.debug('Presence state synced', {
            metadata: { boardId, userCount: Object.keys(typedState).length },
          });
          onPresenceUpdate?.(typedState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences?.[0]) {
            const presence = newPresences[0] as PresenceStateWithRef;
            const convertedPresence = convertPresence(presence);

            logger.debug('User joined presence', {
              metadata: { boardId, userId: convertedPresence.user_id },
            });
            onUserJoin?.(key, convertedPresence);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          logger.debug('User left presence', {
            metadata: { boardId, key },
          });
          onUserLeave?.(key);
        });

      // Subscribe to channel
      await new Promise<void>((resolve, reject) => {
        channel.subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Presence channel subscribed', {
              metadata: { boardId },
            });

            // Initial presence update
            await this.updatePresence(
              boardId,
              user.id,
              PRESENCE_CONSTANTS.STATUS.ONLINE
            );
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to presence channel');
            logger.error('Presence subscription failed', error, {
              metadata: { boardId },
            });
            reject(error);
          }
        });
      });

      // Set up heartbeat
      const heartbeatInterval = setInterval(() => {
        this.updatePresence(
          boardId,
          user.id,
          document.hidden
            ? PRESENCE_CONSTANTS.STATUS.AWAY
            : PRESENCE_CONSTANTS.STATUS.ONLINE
        ).catch(error => {
          logger.error('Heartbeat presence update failed', error as Error, {
            metadata: { boardId },
          });
        });
      }, PRESENCE_CONSTANTS.TIMING.HEARTBEAT_INTERVAL);

      this.heartbeatIntervals.set(boardId, heartbeatInterval);

      // Set up visibility change handler
      const handleVisibilityChange = () => {
        const status = document.hidden
          ? PRESENCE_CONSTANTS.STATUS.AWAY
          : PRESENCE_CONSTANTS.STATUS.ONLINE;

        this.updatePresence(boardId, user.id, status).catch(error => {
          logger.error(
            'Visibility change presence update failed',
            error as Error,
            {
              metadata: { boardId },
            }
          );
        });
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.visibilityListeners.set(boardId, handleVisibilityChange);

      // Return control functions
      const updatePresence = async (status: PresenceState['status']) => {
        await this.updatePresence(boardId, user.id, status);
      };

      const cleanup = () => this.cleanup(boardId);

      return { updatePresence, cleanup };
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error('Failed to subscribe to presence');
      logger.error('Presence subscription error', err, {
        metadata: { boardId },
      });
      onError?.(err);
      throw err;
    }
  }

  /**
   * Update user presence status
   */
  private async updatePresence(
    boardId: string,
    userId: string,
    status: PresenceState['status'],
    activity: PresenceState['activity'] = 'viewing'
  ): Promise<void> {
    try {
      const channel = this.channels.get(boardId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      await channel.track({
        user_id: userId,
        online_at: Date.now(),
        last_seen_at: Date.now(),
        status,
        activity,
      });
    } catch (error) {
      logger.error('Failed to update presence', error as Error, {
        metadata: { boardId, userId, status },
      });
      throw error;
    }
  }

  /**
   * Clean up presence subscription for a specific board
   */
  async cleanup(boardId: string): Promise<void> {
    try {
      // Clean up heartbeat
      const heartbeat = this.heartbeatIntervals.get(boardId);
      if (heartbeat) {
        clearInterval(heartbeat);
        this.heartbeatIntervals.delete(boardId);
      }

      // Clean up visibility listener
      const visibilityListener = this.visibilityListeners.get(boardId);
      if (visibilityListener) {
        document.removeEventListener('visibilitychange', visibilityListener);
        this.visibilityListeners.delete(boardId);
      }

      // Clean up channel
      const channel = this.channels.get(boardId);
      if (channel) {
        await this.supabase.removeChannel(channel);
        this.channels.delete(boardId);
      }

      logger.debug('Presence cleaned up', { metadata: { boardId } });
    } catch (error) {
      logger.error('Failed to cleanup presence', error as Error, {
        metadata: { boardId },
      });
    }
  }

  /**
   * Clean up all presence subscriptions
   */
  async cleanupAll(): Promise<void> {
    const boardIds = Array.from(this.channels.keys());
    await Promise.all(boardIds.map(boardId => this.cleanup(boardId)));

    logger.debug('All presence subscriptions cleaned up');
  }

  /**
   * Get current presence state for a board (if channel exists)
   */
  getCurrentPresenceState(
    boardId: string
  ): Record<string, PresenceState> | null {
    const channel = this.channels.get(boardId);
    if (!channel) return null;

    try {
      const state = channel.presenceState<PresenceStateWithRef>();
      return Object.entries(
        state as RealtimePresenceState<PresenceStateWithRef>
      ).reduce(
        (acc, [key, value]) => {
          if (Array.isArray(value) && value[0]) {
            acc[key] = convertPresence(value[0]);
          }
          return acc;
        },
        {} as Record<string, PresenceState>
      );
    } catch (error) {
      logger.error('Failed to get current presence state', error as Error, {
        metadata: { boardId },
      });
      return null;
    }
  }
}

// Export singleton instance
export const presenceService = new PresenceService();
