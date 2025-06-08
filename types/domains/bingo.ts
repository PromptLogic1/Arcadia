// =============================================================================
// BINGO DOMAIN TYPES - Application types that extend database types
// =============================================================================

import type { Tables, Enums, CompositeTypes } from '../database.types';
import type { User, Tag } from '../index';
import { PLAYER_COLORS } from '../index'; // Value import

// Type aliases for database types
type BingoBoardDb = Tables<'bingo_boards'>;
type BingoCardDb = Tables<'bingo_cards'>;
type BingoSessionDb = Tables<'bingo_sessions'>;
type BingoSessionPlayerDb = Tables<'bingo_session_players'>;
type BingoSessionQueueDb = Tables<'bingo_session_queue'>;
type BingoSessionEventDb = Tables<'bingo_session_events'>;
type GameCategory = Enums<'game_category'>;
type Difficulty = Enums<'difficulty_level'>;
type QueueStatus = Enums<'queue_status'>;
type SessionStatus = Enums<'session_status'>;
type SessionEventType = Enums<'session_event_type'>;
type DbSessionSettings = CompositeTypes<'session_settings'>;

// =============================================================================
// CORE GAME TYPES (DERIVED FROM DATABASE)
// =============================================================================

// This is the source of truth for a cell's structure, based on the DB
export type BoardCell = CompositeTypes<'board_cell'>;

// Enhanced board cell for runtime game state, adding UI-specific properties
export interface GameBoardCell extends BoardCell {
  isClickable?: boolean;
  isHovered?: boolean;
  animationState?: 'none' | 'marking' | 'unmarking' | 'completing';
}

// Base domain type for a board, with a strongly-typed board_state
export interface BingoBoardDomain
  extends Omit<BingoBoardDb, 'board_state' | 'settings'> {
  board_state: BoardCell[];
  settings: CompositeTypes<'board_settings'> | null; // Use board_settings, not session_settings
}

// Enhanced player for game UI
export interface GamePlayer extends BingoSessionPlayerDb {
  isOnline?: boolean;
  isActive?: boolean;
  lastActivity?: Date;
  avatar?: string;
  hoverColor?: string;
  completedCells?: number;
  winConditionsMet?: string[];
  isWinner?: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

// A full board object used within the application, combining the base board with metadata
export interface GameBoardDomain extends BingoBoardDomain {
  creator?: Pick<User, 'id' | 'username' | 'avatar_url'>;
  isBookmarked?: boolean;
  hasVoted?: boolean;
  userVote?: 'up' | 'down' | null;
  playerCount?: number;
  completionRate?: number;
  averageRating?: number;
  lastPlayedAt?: Date;
  popularityScore?: number;
  estimatedDuration?: number;
  recommendedPlayerCount?: { min: number; max: number };
}

// Enhanced session with full context
export interface GameSessionDomain
  extends Omit<BingoSessionDb, 'current_state' | 'settings'> {
  current_state: BoardCell[] | null;
  settings: DbSessionSettings | null;
  board?: GameBoardDomain;
  players?: GamePlayer[];
  host?: Pick<User, 'id' | 'username' | 'avatar_url'>;
  winner?: Pick<User, 'id' | 'username' | 'avatar_url'>;
  queueCount?: number;
  pendingPlayers?: BingoSessionQueueDb[];
  currentTurn?: string;
  gameProgress?: {
    totalCells: number;
    completedCells: number;
    percentage: number;
  };
  isLive?: boolean;
  spectatorCount?: number;
  lastActivity?: Date;
  duration?: number;
  timeRemaining?: number;
}

// =============================================================================
// QUEUE MANAGEMENT TYPES
// =============================================================================

export interface QueueEntry extends BingoSessionQueueDb {
  estimatedWaitTime?: number;
  position?: number;
  canJoin?: boolean;
  rejectionReason?: string;
}

export interface QueueState {
  entries: QueueEntry[];
  isProcessing: boolean;
  processingEntryId: string | null;
  error: string | null;
  lastUpdated: number;
}

export interface QueueStats {
  totalEntries: number;
  pendingEntries: number;
  processingEntries: number;
  completedEntries: number;
  failedEntries: number;
  averageWaitTime: number;
  estimatedQueueTime: number;
}

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

export interface CreateBoardForm {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: Difficulty;
  size: number;
  is_public: boolean;
  tags?: string[];
  settings?: {
    team_mode?: boolean;
    lockout?: boolean;
    sound_enabled?: boolean;
    win_conditions?: {
      line?: boolean;
      majority?: boolean;
      diagonal?: boolean;
      corners?: boolean;
    };
  };
}

export interface CreateCardForm {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: Difficulty;
  is_public: boolean;
  tags?: string[];
}

export interface CreateSessionForm {
  board_id: string;
  settings: {
    max_players: number;
    allow_spectators: boolean;
    auto_start: boolean;
    time_limit?: number;
    require_approval: boolean;
  };
}

export interface JoinSessionForm {
  display_name: string;
  color: string;
  team?: number;
  avatar_url?: string;
}

// =============================================================================
// FILTER AND SEARCH TYPES
// =============================================================================

export interface BoardFilter {
  game_type?: GameCategory | 'All Games';
  difficulty?: Difficulty | 'all';
  search?: string;
  tags?: string[];
  is_public?: boolean;
  creator_id?: string;
  sort?: 'newest' | 'oldest' | 'popular' | 'rating' | 'difficulty' | 'size';
  size?: number | 'any';
  status?: string[];
}

export interface SessionFilter {
  game_type?: GameCategory | 'All Games';
  difficulty?: Difficulty | 'all';
  status?: 'waiting' | 'active' | 'all';
  has_slots?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'player_count' | 'difficulty';
}

// =============================================================================
// GAME EVENTS AND ACTIONS
// =============================================================================

export type GameEventType =
  | SessionEventType
  | 'settings_updated'
  | 'player_won'
  | 'turn_changed';

// Type aliases for compatibility (prefix unused with _)
type _BingoCard = BingoCardDb;
type _QueueStatus = QueueStatus;

export interface GameEvent extends BingoSessionEventDb {
  type: GameEventType;
  payload: {
    playerId?: string;
    cellId?: string;
    oldValue?: string | number | boolean | null;
    newValue?: string | number | boolean | null;
    metadata?: Record<string, string | number | boolean | null>;
  };
}

export type GameAction =
  | { type: 'MARK_CELL'; cellId: string; playerId: string }
  | { type: 'UNMARK_CELL'; cellId: string; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'END_GAME'; winnerId?: string }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<DbSessionSettings> };

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

export interface BoardCardProps {
  board: GameBoardDomain;
  variant?: 'default' | 'compact' | 'detailed';
  section?: 'all' | 'bookmarked' | 'my-boards' | 'recent';
  onVote?: (boardId: string, vote: 'up' | 'down') => void;
  onBookmark?: (boardId: string) => void;
  onSelect?: (board: GameBoardDomain) => void;
  onPlay?: (board: GameBoardDomain) => void;
  className?: string;
}

export interface SessionCardProps {
  session: GameSessionDomain;
  variant?: 'default' | 'compact' | 'detailed';
  onJoin?: (session: GameSessionDomain) => void;
  onSpectate?: (session: GameSessionDomain) => void;
  onSelect?: (session: GameSessionDomain) => void;
  className?: string;
}

export interface GameBoardProps {
  session: GameSessionDomain;
  currentPlayer?: GamePlayer;
  onCellClick?: (cellId: string) => void;
  onCellHover?: (cellId: string | null) => void;
  readonly?: boolean;
  showPlayerColors?: boolean;
  animationEnabled?: boolean;
  className?: string;
}

// =============================================================================
// HOOK INTERFACE TYPES
// =============================================================================

export interface UseBingoBoardProps {
  boardId: string;
  userId?: string;
  enableRealtime?: boolean;
}

export interface UseBingoBoardReturn {
  board: BingoBoardDomain | null;
  loading: boolean;
  error: Error | null;
  updateBoardState: (newState: GameBoardCell[]) => Promise<void>;
  updateBoardSettings: (settings: Partial<BingoBoardDomain>) => Promise<void>;
}

export interface UseSessionProps {
  sessionId: string;
  userId?: string;
  enableRealtime?: boolean;
}

export interface UseSessionReturn {
  session: GameSessionDomain | null;
  loading: boolean;
  error: Error | null;
  joinSession: (params: JoinSessionForm) => Promise<void>;
  leaveSession: () => Promise<void>;
  updateSession: (updates: Partial<GameSessionDomain>) => Promise<void>;
}

export interface UsePlayerManagementProps {
  sessionId: string;
  userId?: string;
}

export interface UsePlayerManagementReturn {
  players: GamePlayer[];
  currentPlayer: GamePlayer | null;
  loading: boolean;
  error: Error | null;
  addPlayer: (player: JoinSessionForm) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updatePlayer: (
    playerId: string,
    updates: Partial<GamePlayer>
  ) => Promise<void>;
}

export interface UseTagSystemProps {
  initialTags?: string[];
  gameType?: GameCategory;
}

export interface UseTagSystemReturn {
  tags: Tag[];
  selectedTags: string[];
  loading: boolean;
  error: Error | null;
  addTag: (tagName: string) => Promise<void>;
  removeTag: (tagId: string) => Promise<void>;
  selectTag: (tagId: string) => void;
  deselectTag: (tagId: string) => void;
  voteOnTag: (tagId: string, vote: 'up' | 'down') => Promise<void>;
}

// =============================================================================
// GAME CONSTANTS AND CONFIGURATION
// =============================================================================

export const BINGO_GAME_CONSTANTS = {
  // Board Constraints
  VALIDATION: {
    MIN_BOARD_SIZE: 3,
    MAX_BOARD_SIZE: 7,
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 8,
  },

  // Game Timing
  TIMING: {
    DEFAULT_GAME_DURATION: 3600, // 1 hour in seconds
    MOVE_TIMEOUT: 30, // 30 seconds per move
    RECONNECT_TIMEOUT: 60, // 1 minute
    PRESENCE_INTERVAL: 5000, // 5 seconds
  },

  // Sync & Reconnection
  SYNC: {
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 1000, // 1 second
    SYNC_INTERVAL: 2000, // 2 seconds
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
  },

  // Error Types
  ERROR_TYPES: {
    INVALID_MOVE: 'INVALID_MOVE',
    INVALID_GAME_STATE: 'INVALID_GAME_STATE',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
  },

  // Win Conditions
  WIN_CONDITIONS: {
    LINE: 'line',
    MAJORITY: 'majority',
    CUSTOM: 'custom',
  },

  // Performance Thresholds
  PERFORMANCE: {
    MAX_RENDER_TIME: 16, // 60fps = 16ms per frame
    MAX_UPDATE_TIME: 5,
    MEMORY_WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB
    LOW_FPS_THRESHOLD: 30,
  },
} as const;

export type BingoGameConstant = typeof BINGO_GAME_CONSTANTS;
export type ErrorType = keyof typeof BINGO_GAME_CONSTANTS.ERROR_TYPES;
export type WinCondition = keyof typeof BINGO_GAME_CONSTANTS.WIN_CONDITIONS;
export type GameStatus = SessionStatus;

// =============================================================================
// CONSTANTS AND DEFAULTS
// =============================================================================

export const BOARD_SIZES = [3, 4, 5, 6] as const;
export const DEFAULT_BOARD_SIZE = 5;

// export const PLAYER_COLORS = [ // Defined in types/index.ts
//   { name: 'Cyan', color: '#06b6d4', hoverColor: '#0891b2' },
//   { name: 'Purple', color: '#8b5cf6', hoverColor: '#7c3aed' },
//   { name: 'Pink', color: '#ec4899', hoverColor: '#db2777' },
//   { name: 'Green', color: '#10b981', hoverColor: '#059669' },
//   { name: 'Orange', color: '#f59e0b', hoverColor: '#d97706' },
//   { name: 'Red', color: '#ef4444', hoverColor: '#dc2626' },
//   { name: 'Yellow', color: '#eab308', hoverColor: '#ca8a04' },
//   { name: 'Indigo', color: '#6366f1', hoverColor: '#4f46e5' },
//   { name: 'Teal', color: '#14b8a6', hoverColor: '#0d9488' },
//   { name: 'Rose', color: '#f43f5e', hoverColor: '#e11d48' },
//   { name: 'Lime', color: '#84cc16', hoverColor: '#65a30d' },
//   { name: 'Sky', color: '#0ea5e9', hoverColor: '#0284c7' },
// ] as const

export const DEFAULT_SESSION_SETTINGS: CreateSessionForm['settings'] = {
  max_players: 4,
  allow_spectators: true,
  auto_start: false,
  require_approval: false,
};

export const DEFAULT_WIN_CONDITIONS = {
  line: true,
  majority: false,
  diagonal: false,
  corners: false,
} as const;

export const QUEUE_LIMITS = {
  MAX_WAIT_TIME: 5 * 60 * 1000, // 5 minutes
  MAX_PLAYERS_PER_SESSION: 12,
  AUTO_CLEANUP_INTERVAL: 60 * 1000, // 1 minute
} as const;

// Board-specific constants
export const BOARD_CONSTANTS = {
  SIZE: {
    MIN: 3,
    MAX: 6,
    DEFAULT: 5,
    SUPPORTED: [3, 4, 5, 6] as const,
  },

  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },

  DESCRIPTION: {
    MAX_LENGTH: 500,
  },

  GRID: {
    MIN_CELLS: 9, // 3x3
    MAX_CELLS: 36, // 6x6
    DEFAULT_CELLS: 25, // 5x5
  },

  VALIDATION: {
    TITLE_REQUIRED: true,
    MIN_FILLED_CELLS: 5,
    MAX_TAGS: 10,
  },

  UPDATE: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
  },

  SYNC: {
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 2000, // 2 seconds
  },
} as const;

export const ERROR_MESSAGES = {
  BOARD_NOT_FOUND: 'Board not found',
  INVALID_BOARD: 'Invalid board state',
  INVALID_BOARD_SIZE: 'Invalid board size',
  TITLE_TOO_SHORT: 'Title must be at least 3 characters',
  TITLE_TOO_LONG: 'Title cannot exceed 50 characters',
  DESCRIPTION_TOO_LONG: 'Description cannot exceed 500 characters',
  INSUFFICIENT_CELLS: 'Board must have at least 5 filled cells',
  INVALID_DIFFICULTY: 'Invalid difficulty level',
  INVALID_GAME_CATEGORY: 'Invalid game category',
  UNAUTHORIZED: 'You do not have permission to perform this action',
  NETWORK_ERROR: 'Network error occurred',
  UPDATE_FAILED: 'Failed to update board',
  SAVE_FAILED: 'Failed to save board',
  DELETE_FAILED: 'Failed to delete board',
  DUPLICATE_FAILED: 'Failed to duplicate board',
  SYNC_FAILED: 'Failed to sync board state',
} as const;

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isGameBoard(obj: unknown): obj is GameBoardDomain {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'title' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string'
  );
}

export function isGameSession(obj: unknown): obj is GameSessionDomain {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'board_id' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.board_id === 'string'
  );
}

export function isGamePlayer(obj: unknown): obj is GamePlayer {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'user_id' in obj &&
    'session_id' in obj &&
    typeof obj.user_id === 'string' &&
    typeof obj.session_id === 'string'
  );
}

export function isValidColor(color: string): boolean {
  return PLAYER_COLORS.some(c => c.color === color);
}

// =============================================================================
// GAME EVENT TYPES FOR RUNTIME GAMEPLAY
// =============================================================================

// Game Phase Types
export type GamePhase = 'waiting' | 'active' | 'paused' | 'ended';

// Last Move Type for tracking recent player actions
export interface LastMove {
  playerId: string;
  position: number;
  row: number;
  col: number;
  timestamp: number;
  cellContent: string;
}

// Marked Fields Type for tracking game progress
export interface MarkedFields {
  total: number;
  byPlayer: Record<string, number>;
}

// Game Error Type for error handling
export interface GameError {
  type: string;
  message: string;
  recoverable: boolean;
  code?: string;
}

// Event Types for Game Flow
export interface BeforeMoveEvent {
  playerId: string;
  position: number;
  cellContent: string;
  timestamp: number;
  isValid: boolean;
  canProceed: boolean;
}

export interface AfterMoveEvent {
  move: LastMove;
  markedFields: MarkedFields;
  completedLines: number;
  gamePhase: GamePhase;
}

export interface GameEndEvent {
  winner: string | null; // null for draws, string for player ID
  reason: 'bingo' | 'majority' | 'timeout' | 'disconnect' | 'line' | 'tie';
  winningLine?: number[];
  finalState?: GameBoardCell[];
  stats?: {
    duration: number;
    totalMoves: number;
    players: GamePlayer[];
  };
}

// Game Statistics
export interface GameStats {
  startTime: number;
  endTime?: number;
  totalMoves: number;
  playerMoves: Record<string, number>;
  completedLines: number;
  winner?: string | null;
  gamePhase: GamePhase;
}

// Performance Metrics
export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  fps: number;
  totalHeapSize?: number;
  usedHeapSize?: number;
  frameTime?: number;
  pageLoad?: number;
  timeToInteractive?: number;
}
