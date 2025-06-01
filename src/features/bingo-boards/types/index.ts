// =============================================================================
// BINGO BOARDS FEATURE TYPES
// =============================================================================
// This file consolidates all bingo-boards related types following best practices

// Import from centralized type system (single source of truth)
import type {
  Tables,
  GameCategory,
  Difficulty,
  BoardStatus,
  SessionStatus,
  QueueStatus,
  BoardCell as DbBoardCell,
  SessionSettings as DbSessionSettings,
  WinConditions as DbWinConditions,
} from '../../../types';

// =============================================================================
// BASE DATABASE TYPES (re-exported for convenience)
// =============================================================================
export type BingoBoardRow = Tables<'bingo_boards'>;
export type BingoCardRow = Tables<'bingo_cards'>;
export type BingoSessionRow = Tables<'bingo_sessions'>;

// Re-export centralized types (no duplication)
export type {
  GameCategory,
  BoardStatus,
  SessionStatus,
  QueueStatus,
  Difficulty,
};

// =============================================================================
// GAME STATE TYPES
// =============================================================================

// Enhanced board cell for game state (with type conversion utilities)
export interface BoardCell {
  text: string | null;
  colors: string[] | null;
  completed_by: string[] | null;
  blocked: boolean | null;
  is_marked: boolean | null;
  cell_id: string | null;
  version: number | null;
  last_updated: number | null;
  last_modified_by: string | null;
  // Legacy frontend properties (deprecated - use snake_case above)
  completedBy?: string[];
  isMarked?: boolean;
  cellId?: string;
  lastUpdated?: number;
  lastModifiedBy?: string;
  conflictResolution?: {
    timestamp: number;
    resolvedBy: string;
    originalValue: string;
  };
}

// Type conversion utilities for BoardCell
export function convertDbBoardCellToFrontend(dbCell: DbBoardCell): BoardCell {
  return {
    // Database properties (snake_case)
    text: dbCell.text,
    colors: dbCell.colors,
    completed_by: dbCell.completed_by,
    blocked: dbCell.blocked,
    is_marked: dbCell.is_marked,
    cell_id: dbCell.cell_id,
    version: dbCell.version,
    last_updated: dbCell.last_updated,
    last_modified_by: dbCell.last_modified_by,
    // Legacy frontend properties (for backward compatibility)
    completedBy: dbCell.completed_by || [],
    isMarked: dbCell.is_marked || false,
    cellId: dbCell.cell_id || '',
    lastUpdated: dbCell.last_updated || undefined,
    lastModifiedBy: dbCell.last_modified_by || undefined,
  };
}

export function convertFrontendBoardCellToDb(
  frontendCell: BoardCell
): DbBoardCell {
  return {
    text: frontendCell.text,
    colors: frontendCell.colors,
    completed_by: frontendCell.completed_by,
    blocked: frontendCell.blocked,
    is_marked: frontendCell.is_marked,
    cell_id: frontendCell.cell_id,
    version: frontendCell.version,
    last_updated: frontendCell.last_updated,
    last_modified_by: frontendCell.last_modified_by,
  };
}

export interface GameState {
  currentState: BoardCell[];
  version: number;
  lastUpdate: string;
  activePlayer?: string;
}

export interface GameEvent {
  type:
    | 'cell_marked'
    | 'cell_unmarked'
    | 'player_joined'
    | 'player_left'
    | 'game_ended';
  sessionId: string;
  playerId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// =============================================================================
// PLAYER MANAGEMENT TYPES
// =============================================================================

export interface Player {
  id: string;
  name: string;
  color: string;
  hoverColor: string;
  team: number;
  avatarUrl?: string;
  joinedAt?: Date;
  isActive?: boolean;
}

export interface ColorOption {
  name: string;
  color: string;
  hoverColor: string;
  available?: boolean;
}

export interface QueueEntry {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  color: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  error?: string;
}

// =============================================================================
// BOARD AND SESSION TYPES
// =============================================================================

// Define a simple type for the creator, to be expanded if needed
export interface BoardCreator {
  username: string | null;
  avatar_url: string | null;
  id?: string | null;
}

export interface BingoBoard
  extends Omit<BingoBoardRow, 'created_at' | 'updated_at'> {
  id: string;
  created_at: Date | string;
  updated_at: Date | string;
  votedBy?: Set<string> | string[];
  bookmarked?: boolean;
  clonedFrom?: string;
  statistics?: BoardStatistics;
  creator_id: string | null;
  creator?: BoardCreator | null;
}

export interface BoardStatistics {
  totalPlays: number;
  averageCompletionTime: number;
  difficultyRating: number;
  popularityScore: number;
}

export interface BingoSession {
  id: string;
  board_id: string | null;
  host_id: string | null;
  session_code: string | null;
  players?: Player[];
  status: SessionStatus | null;
  current_state?: BoardCell[] | null;
  settings?: SessionSettings | null;
  version: number | null;
  winner_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: Date;
}

// Use database SessionSettings type directly
export type SessionSettings = DbSessionSettings;

// Use database WinConditions type
export type WinConditions = DbWinConditions;

// =============================================================================
// CARD MANAGEMENT TYPES
// =============================================================================

export interface BingoCard extends Omit<BingoCardRow, 'created_at' | 'votes'> {
  id: string;
  created_at: Date | string;
  votes?: number | null;
  hasVoted?: boolean;
  isSelected?: boolean;
}

export interface GeneratorOptions {
  gameCategory: GameCategory;
  difficulty: Difficulty;
  tags: string[];
  excludePrevious: boolean;
  customPrompts?: string[];
}

export interface GeneratorResult {
  cards: BingoCard[];
  metadata: {
    generatedAt: Date;
    options: GeneratorOptions;
    totalGenerated: number;
    duplicatesRemoved: number;
  };
}

// =============================================================================
// FORM AND FILTER TYPES
// =============================================================================

export interface CreateBoardFormData {
  board_title: string;
  board_description?: string;
  board_size: number;
  board_game_type: GameCategory;
  board_difficulty: Difficulty;
  board_tags: string[];
  is_public: boolean;
}

export interface FilterState {
  category: GameCategory | 'All Games';
  difficulty: Difficulty | 'all';
  sort: 'newest' | 'oldest' | 'popular' | 'difficulty';
  search: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface BingoCardFilter {
  game?: GameCategory;
  difficulty?: Difficulty;
  category?: string;
  search?: string;
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

export interface BingoBoardComponentProps {
  boardId?: string;
  onClose?: () => void;
  className?: string;
}

export interface BoardCardProps {
  board: BingoBoard;
  section: 'bookmarked' | 'all' | 'my-boards';
  onVote?: (boardId: string, userId: string) => void;
  onBookmark?: (boardId: string) => void;
  onSelect?: (board: BingoBoard, section: string) => void;
  className?: string;
}

export interface BingoBoardDetailProps {
  board: BingoBoard;
  onBookmark: () => void;
  onClose: () => void;
  onPlay?: () => void;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type BoardViewMode = 'grid' | 'list' | 'compact';
export type BoardSection = 'all' | 'bookmarked' | 'my-boards' | 'recent';

export interface BingoError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isSet(value: Set<string> | string[]): value is Set<string> {
  return value instanceof Set;
}

// Other type guards (isValidGameCategory, isValidDifficulty) moved to ../utils/guards.ts

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_BOARD_SIZE = 5;
export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 6;
export const DEFAULT_MAX_PLAYERS = 4;

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: 'bg-green-500',
  easy: 'bg-blue-500',
  medium: 'bg-yellow-500',
  hard: 'bg-orange-500',
  expert: 'bg-red-500',
} as const;

export const PLAYER_COLORS: ColorOption[] = [
  { name: 'Cyan', color: '#06b6d4', hoverColor: '#0891b2' },
  { name: 'Purple', color: '#8b5cf6', hoverColor: '#7c3aed' },
  { name: 'Pink', color: '#ec4899', hoverColor: '#db2777' },
  { name: 'Green', color: '#10b981', hoverColor: '#059669' },
  { name: 'Orange', color: '#f59e0b', hoverColor: '#d97706' },
  { name: 'Red', color: '#ef4444', hoverColor: '#dc2626' },
] as const;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  max_players: 4,
  allow_spectators: true,
  auto_start: false,
  time_limit: null,
  require_approval: false,
};

export const DEFAULT_WIN_CONDITIONS: WinConditions = {
  line: true,
  majority: false,
  diagonal: false,
  corners: false,
};

export const DEFAULT_FILTER_STATE: FilterState = {
  category: 'All Games',
  difficulty: 'all',
  sort: 'newest',
  search: '',
  tags: [],
  isPublic: true,
};

// Re-export all constants
export * from './constants';

// Re-export win pattern types
export * from './win-patterns.types';
