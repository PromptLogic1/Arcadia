/**
 * Presence Service
 *
 * Handles real-time presence tracking for bingo boards.
 * Provides clean API for presence operations without direct Supabase usage.
 */

import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';

// Re-export ServiceResponse for consumers
export type { ServiceResponse } from '@/lib/service-types';
import { z } from 'zod';
// RealtimePresenceState available if needed

// Validation schemas
const presenceStateSchema = z.object({
  user_id: z.string(),
  online_at: z.number(),
  last_seen_at: z.number(),
  status: z.enum(['online', 'away', 'busy']),
  activity: z.enum(['viewing', 'playing', 'editing']).optional(),
});

const presenceStateWithRefSchema = presenceStateSchema.extend({
  presence_ref: z.string(),
});

export type PresenceState = z.infer<typeof presenceStateSchema>;
type PresenceStateWithRef = z.infer<typeof presenceStateWithRefSchema>;

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

export interface PresenceSubscriptionResult {
  updatePresence: (status: PresenceState['status']) => Promise<ServiceResponse<void>>;
  cleanup: () => Promise<ServiceResponse<void>>;
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
  ): Promise<ServiceResponse<PresenceSubscriptionResult>> {
    const { onPresenceUpdate, onUserJoin, onUserLeave, onError } = options;
    const channelName = `presence:bingo:${boardId}`;

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) {
        log.error('User not authenticated for presence', authError || new Error('No user'), {
          metadata: { boardId, service: 'presenceService' },
        });
        return createServiceError('User not authenticated');
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
          const typedState = Object.entries(state).reduce<Record<string, PresenceState>>(
            (acc, [key, value]) => {
              if (Array.isArray(value) && value[0]) {
                const validation = presenceStateWithRefSchema.safeParse(value[0]);
                if (validation.success) {
                  acc[key] = convertPresence(validation.data);
                }
              }
              return acc;
            },
            {}
          );

          log.debug('Presence state synced', {
            metadata: { boardId, userCount: Object.keys(typedState).length },
          });
          onPresenceUpdate?.(typedState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences?.[0]) {
            // Type guard validation for presence state
            const rawPresence = newPresences[0];
            const validation = presenceStateWithRefSchema.safeParse(rawPresence);
            
            if (validation.success) {
              const convertedPresence = convertPresence(validation.data);
              log.debug('User joined presence', {
                metadata: { boardId, userId: convertedPresence.user_id },
              });
              onUserJoin?.(key, convertedPresence);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          log.debug('User left presence', {
            metadata: { boardId, key },
          });
          onUserLeave?.(key);
        });

      // Subscribe to channel
      await new Promise<void>((resolve, reject) => {
        channel.subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            log.debug('Presence channel subscribed', {
              metadata: { boardId },
            });

            // Initial presence update
            const updateResult = await this.updatePresence(
              boardId,
              user.id,
              PRESENCE_CONSTANTS.STATUS.ONLINE
            );
            
            if (!updateResult.success) {
              reject(new Error(updateResult.error || 'Failed to update initial presence'));
              return;
            }
            
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to presence channel');
            log.error('Presence subscription failed', error, {
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
        ).then(result => {
          if (!result.success) {
            log.error(
              'Heartbeat presence update failed',
              new Error(result.error || 'Unknown heartbeat error'),
              {
                metadata: { boardId },
              }
            );
          }
        });
      }, PRESENCE_CONSTANTS.TIMING.HEARTBEAT_INTERVAL);

      this.heartbeatIntervals.set(boardId, heartbeatInterval);

      // Set up visibility change handler
      const handleVisibilityChange = () => {
        const status = document.hidden
          ? PRESENCE_CONSTANTS.STATUS.AWAY
          : PRESENCE_CONSTANTS.STATUS.ONLINE;

        this.updatePresence(boardId, user.id, status).then(result => {
          if (!result.success) {
            log.error(
              'Visibility change presence update failed',
              new Error(result.error || 'Unknown visibility error'),
              {
                metadata: { boardId },
              }
            );
          }
        });
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.visibilityListeners.set(boardId, handleVisibilityChange);

      // Return control functions
      const updatePresence = async (status: PresenceState['status']) => {
        return await this.updatePresence(boardId, user.id, status);
      };

      const cleanup = async () => {
        return await this.cleanupWithResponse(boardId);
      };

      return createServiceSuccess({ updatePresence, cleanup });
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error('Failed to subscribe to presence');
      log.error('Presence subscription error', err, {
        metadata: { boardId, service: 'presenceService' },
      });
      onError?.(err);
      return createServiceError(err.message);
    }
  }

  /**
   * Update user presence status
   */
  async updatePresence(
    boardId: string,
    userId: string,
    status: PresenceState['status'],
    activity: PresenceState['activity'] = 'viewing'
  ): Promise<ServiceResponse<void>> {
    try {
      const channel = this.channels.get(boardId);
      if (!channel) {
        return createServiceError('Channel not found');
      }

      await channel.track({
        user_id: userId,
        online_at: Date.now(),
        last_seen_at: Date.now(),
        status,
        activity,
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to update presence',
        error instanceof Error
          ? error
          : new Error('Unknown presence update error'),
        {
          metadata: { boardId, userId, status, service: 'presenceService' },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to update presence'
      );
    }
  }

  /**
   * Clean up presence subscription for a specific board (with response)
   */
  async cleanupWithResponse(boardId: string): Promise<ServiceResponse<void>> {
    try {
      await this.cleanup(boardId);
      return createServiceSuccess(undefined);
    } catch (error) {
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to cleanup presence'
      );
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

      log.debug('Presence cleaned up', { metadata: { boardId } });
    } catch (error) {
      log.error(
        'Failed to cleanup presence',
        error instanceof Error ? error : new Error('Unknown cleanup error'),
        {
          metadata: { boardId, service: 'presenceService' },
        }
      );
    }
  }

  /**
   * Clean up all presence subscriptions
   */
  async cleanupAll(): Promise<ServiceResponse<void>> {
    try {
      const boardIds = Array.from(this.channels.keys());
      await Promise.all(boardIds.map(boardId => this.cleanup(boardId)));

      log.debug('All presence subscriptions cleaned up');
      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to cleanup all presence subscriptions',
        error instanceof Error ? error : new Error('Unknown cleanup error'),
        {
          metadata: { service: 'presenceService' },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to cleanup all presence subscriptions'
      );
    }
  }

  /**
   * Get current presence state for a board (if channel exists)
   */
  getCurrentPresenceState(
    boardId: string
  ): ServiceResponse<Record<string, PresenceState>> {
    const channel = this.channels.get(boardId);
    if (!channel) {
      return createServiceError('Channel not found');
    }

    try {
      const state = channel.presenceState<PresenceStateWithRef>();
      const validatedState = Object.entries(state).reduce<Record<string, PresenceState>>(
        (acc, [key, value]) => {
          if (Array.isArray(value) && value[0]) {
            const validation = presenceStateWithRefSchema.safeParse(value[0]);
            if (validation.success) {
              acc[key] = convertPresence(validation.data);
            }
          }
          return acc;
        },
        {}
      );

      return createServiceSuccess(validatedState);
    } catch (error) {
      log.error(
        'Failed to get current presence state',
        error instanceof Error ? error : new Error('Unknown state error'),
        {
          metadata: { boardId, service: 'presenceService' },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get current presence state'
      );
    }
  }
}

// Export singleton instance
export const presenceService = new PresenceService();