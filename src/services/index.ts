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
} from '@/types/database-generated';

// Import for type aliases
import type { Tables, Enums } from '@/types/database-generated';

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
export { presenceService as presenceServiceLegacy } from './presence.service';
export { sessionStateService } from './session-state.service';
export { queueService } from './queue.service';
export { cardLibraryService } from './card-library.service';
export { sessionJoinService } from './session-join.service';
export { sessionQueueService } from './session-queue.service';
export { settingsService } from './settings.service';
export { boardCollectionsService } from './board-collections.service';
export { userService } from './user.service';
export { realtimeBoardService } from './realtime-board.service';
export {
  presenceService,
  PRESENCE_CONSTANTS,
  type PresenceState,
} from './presence-modern.service';

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
