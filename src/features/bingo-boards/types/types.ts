// =============================================================================
// BASIC TYPES - Re-export from main types
// =============================================================================
// This file exists for compatibility with existing imports
// All new code should import from './index' instead

export * from './index';

// Specific re-exports for common patterns
export type {
  BoardCell,
  GamePlayer,
  BingoBoard,
  BingoBoardSession,
  BingoCard,
  GameState,
  GameEvent,
  QueueEntry,
  SessionSettings,
  WinConditions,
  ColorOption,
  FilterState,
  GeneratorOptions,
  CreateBoardFormData,
  BingoError,
  BoardViewMode,
  BoardSection,
  GameCategory,
  Difficulty,
  BoardStatus,
  SessionStatus,
  QueueStatus,
} from './index';

// Game and Game-related types alias for backward compatibility
export type { BingoBoardSession as Game } from './index';
