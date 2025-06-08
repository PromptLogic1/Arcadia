/**
 * Redis Pub/Sub Service
 *
 * Provides publish/subscribe functionality for real-time multiplayer events.
 * Note: In serverless environments, persistent connections are not feasible,
 * so this service focuses on publishing events and provides polling-based alternatives.
 */

import {
  getRedisClient,
  createRedisKey,
  REDIS_PREFIXES,
  isRedisConfigured,
} from '@/lib/redis';
import { log } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { z } from 'zod';

// Event schemas
const gameEventSchema = z.object({
  type: z.enum([
    'game_start',
    'game_end',
    'player_join',
    'player_leave',
    'cell_marked',
    'bingo_achieved',
    'board_update',
    'chat_message',
    'system_announcement',
  ]),
  gameId: z.string(),
  boardId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.number(),
  eventId: z.string(),
});

const chatMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
  gameId: z.string(),
  type: z.enum(['user', 'system', 'achievement']).default('user'),
});

export type GameEvent = z.infer<typeof gameEventSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Constants
export const PUBSUB_CONSTANTS = {
  CHANNELS: {
    GAME_EVENTS: 'game:events',
    CHAT: 'game:chat',
    SYSTEM: 'game:system',
    BOARD_UPDATES: 'game:board-updates',
  },
  EVENT_HISTORY: {
    MAX_EVENTS: 100,
    TTL: 3600, // 1 hour
  },
  POLLING: {
    DEFAULT_INTERVAL: 5000, // 5 seconds
    MAX_EVENTS_PER_POLL: 50,
  },
} as const;

export interface PublishOptions {
  persist?: boolean; // Whether to store event for polling clients
  ttl?: number; // TTL for persisted events
}

export interface SubscriptionOptions {
  onEvent?: (event: GameEvent) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

class RedisPubSubService {
  /**
   * Publish a game event
   */
  async publishGameEvent(
    event: Omit<GameEvent, 'timestamp' | 'eventId'>,
    options: PublishOptions = {}
  ): Promise<ServiceResponse<string>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();
      const eventId = `${event.gameId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const completeEvent: GameEvent = {
        ...event,
        timestamp: Date.now(),
        eventId,
      };

      // Validate event
      const validatedEvent = gameEventSchema.parse(completeEvent);

      // Publish to real-time channel
      const channel = `${PUBSUB_CONSTANTS.CHANNELS.GAME_EVENTS}:${event.gameId}`;
      const publishResult = await redis.publish(
        channel,
        JSON.stringify(validatedEvent)
      );

      log.debug('Game event published', {
        metadata: {
          eventId,
          gameId: event.gameId,
          type: event.type,
          subscribers: publishResult,
        },
      });

      // Optionally persist for polling clients
      if (options.persist !== false) {
        await this.persistEventForPolling(validatedEvent, options.ttl);
      }

      return createServiceSuccess(eventId);
    } catch (error) {
      log.debug('Failed to publish game event', {
        metadata: {
          gameId: event.gameId,
          type: event.type,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to publish game event'
      );
    }
  }

  /**
   * Publish a chat message
   */
  async publishChatMessage(
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
    options: PublishOptions = {}
  ): Promise<ServiceResponse<string>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const completeMessage: ChatMessage = {
        ...message,
        id: messageId,
        timestamp: Date.now(),
      };

      // Validate message
      const validatedMessage = chatMessageSchema.parse(completeMessage);

      // Publish to chat channel
      const channel = `${PUBSUB_CONSTANTS.CHANNELS.CHAT}:${message.gameId}`;
      const publishResult = await redis.publish(
        channel,
        JSON.stringify(validatedMessage)
      );

      log.debug('Chat message published', {
        metadata: {
          messageId,
          gameId: message.gameId,
          userId: message.userId,
          subscribers: publishResult,
        },
      });

      // Persist chat message for history
      await this.persistChatMessage(validatedMessage, options.ttl);

      return createServiceSuccess(messageId);
    } catch (error) {
      log.error(
        'Failed to publish chat message',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { gameId: message.gameId, userId: message.userId },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to publish chat message'
      );
    }
  }

  /**
   * Publish a system announcement
   */
  async publishSystemAnnouncement(
    gameId: string,
    announcement: string,
    data?: Record<string, unknown>
  ): Promise<ServiceResponse<string>> {
    return await this.publishGameEvent({
      type: 'system_announcement',
      gameId,
      userId: 'system',
      data: {
        announcement,
        ...data,
      },
    });
  }

  /**
   * Get recent events for polling clients (serverless-friendly)
   */
  async getRecentEvents(
    gameId: string,
    since?: number,
    limit: number = PUBSUB_CONSTANTS.POLLING.MAX_EVENTS_PER_POLL
  ): Promise<ServiceResponse<GameEvent[]>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();
      const eventsKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'game-events',
        gameId
      );

      // Get events from sorted set (sorted by timestamp)
      const minScore = since || 0;
      const events = await redis.zrange(eventsKey, minScore, '+inf', {
        byScore: true,
        withScores: true,
        offset: 0,
        count: limit,
      });

      const parsedEvents: GameEvent[] = [];

      // Events come as [value, score, value, score, ...]
      for (let i = 0; i < events.length; i += 2) {
        try {
          const eventData = JSON.parse(events[i] as string);
          const validatedEvent = gameEventSchema.parse(eventData);
          parsedEvents.push(validatedEvent);
        } catch (parseError) {
          log.warn('Invalid event data found in history', {
            metadata: { gameId, error: parseError },
          });
        }
      }

      return createServiceSuccess(parsedEvents);
    } catch (error) {
      log.error(
        'Failed to get recent events',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { gameId, since, limit },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get recent events'
      );
    }
  }

  /**
   * Get chat history for a game
   */
  async getChatHistory(
    gameId: string,
    limit = 50,
    before?: number
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();
      const chatKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'chat-history',
        gameId
      );

      const maxScore = before || '+inf';
      const messages = await redis.zrange(chatKey, '-inf', maxScore, {
        byScore: true,
        withScores: true,
        rev: true,
        offset: 0,
        count: limit,
      });

      const parsedMessages: ChatMessage[] = [];

      // Messages come as [value, score, value, score, ...]
      for (let i = 0; i < messages.length; i += 2) {
        try {
          const messageData = JSON.parse(messages[i] as string);
          const validatedMessage = chatMessageSchema.parse(messageData);
          parsedMessages.push(validatedMessage);
        } catch (parseError) {
          log.warn('Invalid chat message found in history', {
            metadata: { gameId, error: parseError },
          });
        }
      }

      return createServiceSuccess(parsedMessages.reverse()); // Return in chronological order
    } catch (error) {
      log.error(
        'Failed to get chat history',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { gameId, limit, before },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get chat history'
      );
    }
  }

  /**
   * Persist event for polling clients
   */
  private async persistEventForPolling(
    event: GameEvent,
    ttl: number = PUBSUB_CONSTANTS.EVENT_HISTORY.TTL
  ): Promise<void> {
    try {
      const redis = getRedisClient();
      const eventsKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'game-events',
        event.gameId
      );

      // Add to sorted set with timestamp as score
      await redis.zadd(eventsKey, {
        score: event.timestamp,
        member: JSON.stringify(event),
      });

      // Set TTL
      await redis.expire(eventsKey, ttl);

      // Trim to max events
      const totalEvents = await redis.zcard(eventsKey);
      if (totalEvents > PUBSUB_CONSTANTS.EVENT_HISTORY.MAX_EVENTS) {
        const excess = totalEvents - PUBSUB_CONSTANTS.EVENT_HISTORY.MAX_EVENTS;
        await redis.zremrangebyrank(eventsKey, 0, excess - 1);
      }
    } catch (error) {
      log.error(
        'Failed to persist event for polling',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { eventId: event.eventId, gameId: event.gameId },
        }
      );
      // Don't throw - persistence is best effort
    }
  }

  /**
   * Persist chat message for history
   */
  private async persistChatMessage(
    message: ChatMessage,
    ttl: number = PUBSUB_CONSTANTS.EVENT_HISTORY.TTL
  ): Promise<void> {
    try {
      const redis = getRedisClient();
      const chatKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'chat-history',
        message.gameId
      );

      // Add to sorted set with timestamp as score
      await redis.zadd(chatKey, {
        score: message.timestamp,
        member: JSON.stringify(message),
      });

      // Set TTL
      await redis.expire(chatKey, ttl);

      // Trim to reasonable size (keep last 200 messages)
      const totalMessages = await redis.zcard(chatKey);
      if (totalMessages > 200) {
        const excess = totalMessages - 200;
        await redis.zremrangebyrank(chatKey, 0, excess - 1);
      }
    } catch (error) {
      log.error(
        'Failed to persist chat message',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { messageId: message.id, gameId: message.gameId },
        }
      );
      // Don't throw - persistence is best effort
    }
  }

  /**
   * Clear event history for a game
   */
  async clearGameHistory(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();

      const eventsKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'game-events',
        gameId
      );

      const chatKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'chat-history',
        gameId
      );

      await Promise.all([redis.del(eventsKey), redis.del(chatKey)]);

      log.info('Game history cleared', {
        metadata: { gameId },
      });

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Failed to clear game history',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { gameId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to clear game history'
      );
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(gameId: string): Promise<
    ServiceResponse<{
      eventCount: number;
      chatMessageCount: number;
      oldestEventTimestamp?: number;
      newestEventTimestamp?: number;
    }>
  > {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();

      const eventsKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'game-events',
        gameId
      );

      const chatKey = createRedisKey(
        REDIS_PREFIXES.CACHE,
        'chat-history',
        gameId
      );

      const [eventCount, chatMessageCount, eventRange, chatRange] =
        await Promise.all([
          redis.zcard(eventsKey),
          redis.zcard(chatKey),
          redis.zrange(eventsKey, 0, 0, { withScores: true }),
          redis.zrange(chatKey, -1, -1, { withScores: true }),
        ]);

      const oldestEventTimestamp =
        eventRange.length > 1 ? Number(eventRange[1]) : undefined;
      const newestEventTimestamp =
        chatRange.length > 1 ? Number(chatRange[1]) : undefined;

      return createServiceSuccess({
        eventCount,
        chatMessageCount,
        oldestEventTimestamp,
        newestEventTimestamp,
      });
    } catch (error) {
      log.error(
        'Failed to get channel stats',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { gameId },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to get channel stats'
      );
    }
  }

  /**
   * Bulk publish multiple events (atomic operation)
   */
  async publishBulkEvents(
    events: Array<Omit<GameEvent, 'timestamp' | 'eventId'>>,
    options: PublishOptions = {}
  ): Promise<ServiceResponse<string[]>> {
    try {
      // Server-only guard
      if (typeof window !== 'undefined') {
        return createServiceError(
          'PubSub operations are only available on the server'
        );
      }

      if (!isRedisConfigured()) {
        log.warn('Redis not configured - pubsub unavailable');
        return createServiceError('PubSub service unavailable');
      }

      const redis = getRedisClient();
      const eventIds: string[] = [];
      const publishPromises: Promise<unknown>[] = [];

      for (const event of events) {
        const eventId = `${event.gameId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        eventIds.push(eventId);

        const completeEvent: GameEvent = {
          ...event,
          timestamp: Date.now(),
          eventId,
        };

        const validatedEvent = gameEventSchema.parse(completeEvent);
        const channel = `${PUBSUB_CONSTANTS.CHANNELS.GAME_EVENTS}:${event.gameId}`;

        publishPromises.push(
          redis.publish(channel, JSON.stringify(validatedEvent))
        );

        if (options.persist !== false) {
          publishPromises.push(
            this.persistEventForPolling(validatedEvent, options.ttl)
          );
        }
      }

      await Promise.all(publishPromises);

      log.info('Bulk events published', {
        metadata: { eventCount: events.length, eventIds },
      });

      return createServiceSuccess(eventIds);
    } catch (error) {
      log.error(
        'Failed to publish bulk events',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { eventCount: events.length },
        }
      );
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to publish bulk events'
      );
    }
  }
}

// Export singleton instance
export const redisPubSubService = new RedisPubSubService();
