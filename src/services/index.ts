/**
 * Service Layer Index
 *
 * This file exports all service modules that handle data fetching and mutations.
 * Services are pure functions that interact with external APIs (Supabase).
 * They don't manage state - that's handled by Zustand stores.
 */

// Re-export database-generated types as the single source of truth for services
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from '@/types/database.types';

// Import for type aliases
import type { Tables, Enums } from '@/types/database.types';

// Re-export common database table types
export type BingoBoard = Tables<'bingo_boards'>;
export type BingoCard = Tables<'bingo_cards'>;
export type BingoSession = Tables<'bingo_sessions'>;
export type BingoSessionPlayer = Tables<'bingo_session_players'>;
export type GameCategory = Enums<'game_category'>;
export type DifficultyLevel = Enums<'difficulty_level'>;
export type SessionStatus = Enums<'session_status'>;
export type QueueStatus = Enums<'queue_status'>;

// Export service functions (not types) from individual services
export { authService } from './auth.service';
export { bingoCardsService } from './bingo-cards.service';
export { bingoBoardsService } from './bingo-boards.service';
export { bingoBoardEditService } from './bingo-board-edit.service';
export { sessionsService } from './sessions.service';
export { communityService } from './community.service';
export { gameStateService } from './game-state.service';
export { gameSettingsService } from './game-settings.service';
export { presenceService } from './presence.service';
export { sessionStateService } from './session-state.service';
export { queueService } from './queue.service';
export { cardLibraryService } from './card-library.service';
export { sessionJoinService } from './session-join.service';
export { sessionQueueService } from './session-queue.service';
export { settingsService } from './settings.service';
export { boardCollectionsService } from './board-collections.service';
export { userService } from './user.service';
export { realtimeBoardService } from './realtime-board.service';

// Redis services
export { redisService, cacheService } from './redis.service';
export {
  rateLimitingService,
  withRateLimit,
  type RateLimitResponse,
  type RateLimitConfig,
} from './rate-limiting.service';

// Advanced Redis services
export {
  redisPresenceService,
  type PresenceState as RedisPresenceState,
  type PresenceUpdateEvent,
  PRESENCE_CONSTANTS,
} from './redis-presence.service';

export {
  redisLocksService,
  type LockConfig,
  type LockResult,
  type DistributedLockOptions,
  LOCK_CONSTANTS,
} from './redis-locks.service';

export {
  redisPubSubService,
  type GameEvent,
  type ChatMessage,
  PUBSUB_CONSTANTS,
} from './redis-pubsub.service';

export {
  redisQueueService,
  type JobData,
  type JobResult,
  type QueueOptions,
  QUEUE_CONSTANTS,
} from './redis-queue.service';

// Common types used across services
export interface ServiceResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  gameType?: string;
  difficulty?: string;
  tags?: string[];
}
