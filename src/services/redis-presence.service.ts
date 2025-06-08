/**
 * Redis-Based Presence Service
 *
 * Modern presence tracking using Redis pub/sub and TTL-based expiration.
 * Replaces Supabase-based presence with serverless-friendly Redis implementation.
 */

import { getRedisClient, createRedisKey, REDIS_PREFIXES } from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { z } from 'zod';

// Validation schemas
const presenceStateSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatar: z.string().optional(),
  status: z.enum(['online', 'away', 'busy']),
  lastSeen: z.number(),
  joinedAt: z.number(),
  metadata: z
    .object({
      sessionId: z.string().optional(),
      boardId: z.string().optional(),
      role: z.string().optional(),
      isHost: z.boolean().optional(),
      currentCell: z.string().optional(),
      color: z.string().optional(),
      activity: z.enum(['viewing', 'playing', 'editing']).optional(),
    })
    .optional(),
});

const presenceUpdateEventSchema = z.object({
  type: z.enum(['join', 'leave', 'update']),
  boardId: z.string(),
  userId: z.string(),
  presence: presenceStateSchema.optional(),
  timestamp: z.number(),
});

export type PresenceState = z.infer<typeof presenceStateSchema>;
export type PresenceUpdateEvent = z.infer<typeof presenceUpdateEventSchema>;

// Constants
export const PRESENCE_CONSTANTS = {
  TTL: {
    PRESENCE: 60, // 1 minute TTL for presence data
    HEARTBEAT: 30, // 30 second heartbeat interval
  },
  CHANNELS: {
    PRESENCE_UPDATES: 'presence:updates',
    BOARD_PREFIX: 'presence:board',
  },
  KEYS: {
    USER_PRESENCE: 'user',
    BOARD_USERS: 'board',
    USER_BOARDS: 'user-boards',
  },
} as const;

export interface PresenceSubscriptionOptions {
  onPresenceUpdate?: (
    boardId: string,
    presenceState: Record<string, PresenceState>
  ) => void;
  onUserJoin?: (
    boardId: string,
    userId: string,
    presence: PresenceState
  ) => void;
  onUserLeave?: (boardId: string, userId: string) => void;
  onError?: (error: Error) => void;
}

export interface PresenceSubscriptionResult {
  updatePresence: (
    status: PresenceState['status'],
    metadata?: PresenceState['metadata']
  ) => Promise<ServiceResponse<void>>;
  cleanup: () => Promise<ServiceResponse<void>>;
  getCurrentState: () => Promise<
    ServiceResponse<Record<string, PresenceState>>
  >;
}

class RedisPresenceService {
  private subscriptions = new Map<
    string,
    {
      cleanup: () => Promise<void>;
      heartbeatInterval?: NodeJS.Timeout;
    }
  >();

  /**
   * Join a board's presence and start tracking
   */
  async joinBoardPresence(
    boardId: string,
    userId: string,
    userInfo: {
      displayName: string;
      avatar?: string;
    },
    metadata: PresenceState['metadata'] = {},
    options: PresenceSubscriptionOptions = {}
  ): Promise<ServiceResponse<PresenceSubscriptionResult>> {
    try {
      const redis = getRedisClient();
      const subscriptionKey = `${boardId}:${userId}`;

      // Clean up existing subscription if any
      await this.cleanup(subscriptionKey);

      const presence: PresenceState = {
        userId,
        displayName: userInfo.displayName,
        avatar: userInfo.avatar,
        status: 'online',
        lastSeen: Date.now(),
        joinedAt: Date.now(),
        metadata: {
          ...metadata,
          boardId,
        },
      };

      // Store user presence with TTL
      const userPresenceKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_PRESENCE,
        boardId,
        userId
      );

      await redis.setex(
        userPresenceKey,
        PRESENCE_CONSTANTS.TTL.PRESENCE,
        JSON.stringify(presence)
      );

      // Add user to board's user set with TTL
      const boardUsersKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.BOARD_USERS,
        boardId
      );

      await redis.sadd(boardUsersKey, userId);
      await redis.expire(boardUsersKey, PRESENCE_CONSTANTS.TTL.PRESENCE);

      // Track which boards user is in
      const userBoardsKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_BOARDS,
        userId
      );

      await redis.sadd(userBoardsKey, boardId);
      await redis.expire(userBoardsKey, PRESENCE_CONSTANTS.TTL.PRESENCE);

      // Publish join event
      await this.publishPresenceEvent({
        type: 'join',
        boardId,
        userId,
        presence,
        timestamp: Date.now(),
      });

      // Set up heartbeat to keep presence alive
      const heartbeatInterval = setInterval(async () => {
        try {
          await this.updateUserPresence(
            boardId,
            userId,
            presence.status,
            presence.metadata
          );
        } catch (error) {
          log.error(
            'Presence heartbeat failed',
            error instanceof Error ? error : new Error(String(error)),
            {
              metadata: { boardId, userId },
            }
          );
          options.onError?.(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }, PRESENCE_CONSTANTS.TTL.HEARTBEAT * 1000);

      // Store subscription info
      this.subscriptions.set(subscriptionKey, {
        heartbeatInterval,
        cleanup: async () => {
          clearInterval(heartbeatInterval);
          await this.leaveBoardPresence(boardId, userId);
        },
      });

      // Return control functions
      const updatePresence = async (
        status: PresenceState['status'],
        newMetadata?: PresenceState['metadata']
      ) => {
        return await this.updateUserPresence(boardId, userId, status, {
          ...presence.metadata,
          ...newMetadata,
        });
      };

      const cleanup = async () => {
        return await this.cleanup(subscriptionKey);
      };

      const getCurrentState = async () => {
        return await this.getBoardPresence(boardId);
      };

      log.info('User joined board presence', {
        metadata: { boardId, userId, displayName: userInfo.displayName },
      });

      return createServiceSuccess({
        updatePresence,
        cleanup,
        getCurrentState,
      });
    } catch (error) {
      log.error(
        'Failed to join board presence',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { boardId, userId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to join board presence'
      );
    }
  }

  /**
   * Update user's presence status and metadata
   */
  async updateUserPresence(
    boardId: string,
    userId: string,
    status: PresenceState['status'],
    metadata?: PresenceState['metadata']
  ): Promise<ServiceResponse<void>> {
    try {
      const redis = getRedisClient();
      const userPresenceKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_PRESENCE,
        boardId,
        userId
      );

      // Get current presence
      const currentPresenceStr = await redis.get(userPresenceKey);
      if (!currentPresenceStr) {
        return createServiceError('User presence not found');
      }

      // Handle invalid JSON data gracefully
      let parsedPresence;
      try {
        parsedPresence = JSON.parse(currentPresenceStr as string);
      } catch (parseError) {
        log.warn('Invalid JSON data in presence, removing and recreating', {
          metadata: {
            userId,
            presenceData: (currentPresenceStr as string).substring(0, 100),
            parseError:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          },
        });
        // Remove invalid presence data and return error
        await redis.del(userPresenceKey);
        return createServiceError('Invalid presence data, please reconnect');
      }

      const currentPresence = presenceStateSchema.parse(parsedPresence);

      // Update presence
      const updatedPresence: PresenceState = {
        ...currentPresence,
        status,
        lastSeen: Date.now(),
        metadata: metadata
          ? { ...currentPresence.metadata, ...metadata }
          : currentPresence.metadata,
      };

      // Store updated presence with refreshed TTL
      await redis.setex(
        userPresenceKey,
        PRESENCE_CONSTANTS.TTL.PRESENCE,
        JSON.stringify(updatedPresence)
      );

      // Refresh board membership TTL
      const boardUsersKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.BOARD_USERS,
        boardId
      );
      await redis.expire(boardUsersKey, PRESENCE_CONSTANTS.TTL.PRESENCE);

      // Publish update event
      await this.publishPresenceEvent({
        type: 'update',
        boardId,
        userId,
        presence: updatedPresence,
        timestamp: Date.now(),
      });

      log.debug('User presence updated', {
        metadata: { boardId, userId, status },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to update user presence',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { boardId, userId, status },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to update user presence'
      );
    }
  }

  /**
   * Leave board presence
   */
  async leaveBoardPresence(
    boardId: string,
    userId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const redis = getRedisClient();

      // Remove user presence
      const userPresenceKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_PRESENCE,
        boardId,
        userId
      );
      await redis.del(userPresenceKey);

      // Remove user from board set
      const boardUsersKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.BOARD_USERS,
        boardId
      );
      await redis.srem(boardUsersKey, userId);

      // Remove board from user's boards
      const userBoardsKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_BOARDS,
        userId
      );
      await redis.srem(userBoardsKey, boardId);

      // Publish leave event
      await this.publishPresenceEvent({
        type: 'leave',
        boardId,
        userId,
        timestamp: Date.now(),
      });

      log.info('User left board presence', {
        metadata: { boardId, userId },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to leave board presence',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { boardId, userId },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to leave board presence'
      );
    }
  }

  /**
   * Get all users present on a board
   */
  async getBoardPresence(
    boardId: string
  ): Promise<ServiceResponse<Record<string, PresenceState>>> {
    try {
      const redis = getRedisClient();
      const boardUsersKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.BOARD_USERS,
        boardId
      );

      // Get all users in board
      const userIds = await redis.smembers(boardUsersKey);

      if (userIds.length === 0) {
        return createServiceSuccess({});
      }

      // Get presence for each user
      const presencePromises = userIds.map(async userId => {
        const userPresenceKey = createRedisKey(
          REDIS_PREFIXES.PRESENCE,
          PRESENCE_CONSTANTS.KEYS.USER_PRESENCE,
          boardId,
          userId
        );
        const presenceStr = await redis.get(userPresenceKey);

        if (presenceStr) {
          try {
            // Handle invalid JSON data gracefully
            let parsedPresence;
            try {
              parsedPresence = JSON.parse(presenceStr as string);
            } catch (jsonError) {
              log.warn('Invalid JSON data in board presence, skipping user', {
                metadata: {
                  boardId,
                  userId,
                  presenceData: (presenceStr as string).substring(0, 100),
                  jsonError:
                    jsonError instanceof Error
                      ? jsonError.message
                      : String(jsonError),
                },
              });
              // Remove invalid presence data
              await redis.del(userPresenceKey);
              return null;
            }

            const presence = presenceStateSchema.parse(parsedPresence);
            return [userId, presence] as const;
          } catch (parseError) {
            log.warn('Invalid presence data found', {
              metadata: { boardId, userId, error: parseError },
            });
            return null;
          }
        }
        return null;
      });

      const presenceResults = await Promise.all(presencePromises);
      const validPresences = presenceResults.filter(
        (result): result is [string, PresenceState] => result !== null
      );

      const presenceMap = Object.fromEntries(validPresences);

      log.debug('Retrieved board presence', {
        metadata: { boardId, userCount: validPresences.length },
      });

      return createServiceSuccess(presenceMap);
    } catch (error) {
      log.error(
        'Failed to get board presence',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { boardId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get board presence'
      );
    }
  }

  /**
   * Publish presence event to Redis pub/sub
   */
  private async publishPresenceEvent(
    event: PresenceUpdateEvent
  ): Promise<void> {
    try {
      const redis = getRedisClient();
      const channelName = `${PRESENCE_CONSTANTS.CHANNELS.BOARD_PREFIX}:${event.boardId}`;

      await redis.publish(channelName, JSON.stringify(event));

      log.debug('Published presence event', {
        metadata: {
          type: event.type,
          boardId: event.boardId,
          userId: event.userId,
        },
      });
    } catch (error) {
      log.error(
        'Failed to publish presence event',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { event },
        }
      );
      // Don't throw - pub/sub is best effort
    }
  }

  /**
   * Subscribe to presence events for a board
   * Note: In serverless environments, this would typically be replaced
   * with polling or webhook-based updates
   */
  async subscribeToPresenceEvents(
    boardId: string,
    _options: PresenceSubscriptionOptions
  ): Promise<ServiceResponse<() => Promise<void>>> {
    try {
      // For serverless environments, we recommend polling instead of persistent connections
      // This is a simplified implementation for demonstration

      log.info('Presence event subscription requested', {
        metadata: {
          boardId,
          note: 'In serverless environments, consider polling-based updates instead of persistent subscriptions',
        },
      });

      // Return a no-op cleanup function for now
      const cleanup = async () => {
        log.debug('Presence subscription cleanup', { metadata: { boardId } });
      };

      return createServiceSuccess(cleanup);
    } catch (error) {
      log.error(
        'Failed to subscribe to presence events',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { boardId },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to subscribe to presence events'
      );
    }
  }

  /**
   * Clean up presence subscription
   */
  async cleanup(subscriptionKey: string): Promise<ServiceResponse<void>> {
    try {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (subscription) {
        await subscription.cleanup();
        this.subscriptions.delete(subscriptionKey);

        log.debug('Presence subscription cleaned up', {
          metadata: { subscriptionKey },
        });
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to cleanup presence subscription',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { subscriptionKey },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to cleanup presence subscription'
      );
    }
  }

  /**
   * Clean up all presence subscriptions for a user
   */
  async cleanupUserPresence(userId: string): Promise<ServiceResponse<void>> {
    try {
      const redis = getRedisClient();
      const userBoardsKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_BOARDS,
        userId
      );

      // Get all boards user is in
      const boardIds = await redis.smembers(userBoardsKey);

      // Leave all boards
      await Promise.all(
        boardIds.map(boardId => this.leaveBoardPresence(boardId, userId))
      );

      // Clean up all subscriptions for this user
      const userSubscriptions = Array.from(this.subscriptions.keys()).filter(
        key => key.includes(userId)
      );

      await Promise.all(userSubscriptions.map(key => this.cleanup(key)));

      log.info('User presence cleaned up', {
        metadata: { userId, boardCount: boardIds.length },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to cleanup user presence',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { userId },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to cleanup user presence'
      );
    }
  }

  /**
   * Get user's presence across all boards
   */
  async getUserPresence(
    userId: string
  ): Promise<ServiceResponse<Record<string, PresenceState>>> {
    try {
      const redis = getRedisClient();
      const userBoardsKey = createRedisKey(
        REDIS_PREFIXES.PRESENCE,
        PRESENCE_CONSTANTS.KEYS.USER_BOARDS,
        userId
      );

      const boardIds = await redis.smembers(userBoardsKey);

      if (boardIds.length === 0) {
        return createServiceSuccess({});
      }

      const presencePromises = boardIds.map(async boardId => {
        const userPresenceKey = createRedisKey(
          REDIS_PREFIXES.PRESENCE,
          PRESENCE_CONSTANTS.KEYS.USER_PRESENCE,
          boardId,
          userId
        );
        const presenceStr = await redis.get(userPresenceKey);

        if (presenceStr) {
          try {
            // Handle invalid JSON data gracefully
            let parsedPresence;
            try {
              parsedPresence = JSON.parse(presenceStr as string);
            } catch (jsonError) {
              log.warn('Invalid JSON data in user presence, skipping board', {
                metadata: {
                  boardId,
                  userId,
                  presenceData: (presenceStr as string).substring(0, 100),
                  jsonError:
                    jsonError instanceof Error
                      ? jsonError.message
                      : String(jsonError),
                },
              });
              // Remove invalid presence data
              await redis.del(userPresenceKey);
              return null;
            }

            const presence = presenceStateSchema.parse(parsedPresence);
            return [boardId, presence] as const;
          } catch (parseError) {
            log.warn('Invalid presence data found for user', {
              metadata: { boardId, userId, error: parseError },
            });
            return null;
          }
        }
        return null;
      });

      const presenceResults = await Promise.all(presencePromises);
      const validPresences = presenceResults.filter(
        (result): result is [string, PresenceState] => result !== null
      );

      const presenceMap = Object.fromEntries(validPresences);

      return createServiceSuccess(presenceMap);
    } catch (error) {
      log.error(
        'Failed to get user presence',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { userId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get user presence'
      );
    }
  }
}

// Export singleton instance
export const redisPresenceService = new RedisPresenceService();
