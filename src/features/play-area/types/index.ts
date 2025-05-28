import type { Tables, Enums, CompositeTypes } from '@/types/database.types';

// Database types
export type BingoSession = Tables<'bingo_sessions'>;
export type BingoBoard = Tables<'bingo_boards'>;
export type BingoSessionPlayer = Tables<'bingo_session_players'>;
export type BingoSessionEvent = Tables<'bingo_session_events'>;
export type BingoSessionCell = Tables<'bingo_session_cells'>;

export type SessionStatus = Enums<'session_status'>;
export type GameCategory = Enums<'game_category'>;
export type BoardCell = CompositeTypes<'board_cell'>;
export type SessionSettings = CompositeTypes<'session_settings'>;
export type WinConditions = CompositeTypes<'win_conditions'>;

// Extended play area types
export interface PlayAreaSession extends BingoSession {
  board?: BingoBoard;
  players: PlayAreaPlayer[];
  host?: PlayAreaPlayer;
  winner?: PlayAreaPlayer;
  spectators?: PlayAreaSpectator[];
  current_player_count: number;
  max_players: number;
}

export interface PlayAreaPlayer extends BingoSessionPlayer {
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    level?: number;
  };
  is_host: boolean;
  is_current_user: boolean;
  is_online: boolean;
  last_action?: string;
  points?: number;
  completed_cells: number;
  completion_time?: number;
}

export interface PlayAreaSpectator {
  user_id: string;
  username: string;
  avatar_url?: string;
  joined_at: string;
}

// Game state types
export interface GameState {
  cells: GameCell[];
  version: number;
  last_updated: string;
  active_players: string[];
  current_turn?: string;
  time_remaining?: number;
  paused: boolean;
}

export interface GameCell extends BoardCell {
  row: number;
  col: number;
  index: number;
  hover_player?: string;
  animation?: CellAnimation;
}

export interface CellAnimation {
  type: 'mark' | 'unmark' | 'conflict' | 'win';
  player_id: string;
  timestamp: number;
  duration?: number;
}

// Real-time game events
export interface GameEvent {
  id: string;
  type: GameEventType;
  session_id: string;
  player_id?: string;
  data: Record<string, unknown>;
  timestamp: number;
  sequence: number;
}

export type GameEventType =
  | 'cell_marked'
  | 'cell_unmarked'
  | 'player_joined'
  | 'player_left'
  | 'player_disconnected'
  | 'player_reconnected'
  | 'game_started'
  | 'game_paused'
  | 'game_resumed'
  | 'game_ended'
  | 'win_detected'
  | 'conflict_detected'
  | 'chat_message'
  | 'host_changed'
  | 'settings_updated';

// Chat system
export interface ChatMessage {
  id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system' | 'achievement';
  metadata?: Record<string, unknown>;
}

export interface ChatState {
  messages: ChatMessage[];
  unread_count: number;
  is_open: boolean;
  is_typing: Record<string, boolean>;
}

// Player interactions
export interface PlayerAction {
  type: 'mark_cell' | 'unmark_cell' | 'send_chat' | 'leave_game' | 'pause_game';
  cell_index?: number;
  message?: string;
  timestamp: number;
}

export interface CellMarkRequest {
  session_id: string;
  cell_index: number;
  player_id: string;
  timestamp: number;
}

export interface CellMarkResponse {
  success: boolean;
  conflict?: boolean;
  winner?: string;
  game_ended?: boolean;
  error?: string;
}

// Game controls
export interface GameControls {
  can_start: boolean;
  can_pause: boolean;
  can_resume: boolean;
  can_end: boolean;
  can_kick_players: boolean;
  can_change_settings: boolean;
  is_host: boolean;
}

export interface GameSettings {
  max_players: number;
  allow_spectators: boolean;
  auto_start: boolean;
  time_limit?: number;
  require_approval: boolean;
  lockout_mode: boolean;
  team_mode: boolean;
  sound_enabled: boolean;
  win_conditions: WinConditions;
}

// Progress tracking
export interface GameProgress {
  cells_completed: number;
  total_cells: number;
  completion_percentage: number;
  lines_completed: number;
  time_elapsed: number;
  player_rank: number;
  points_earned: number;
}

export interface WinCondition {
  type: 'line' | 'diagonal' | 'corners' | 'majority' | 'full_board';
  pattern?: number[];
  required_count?: number;
  description: string;
}

// UI state types
export interface PlayAreaState {
  session: PlayAreaSession | null;
  game_state: GameState | null;
  chat_state: ChatState;
  controls: GameControls;
  progress: GameProgress | null;
  loading: boolean;
  error?: string;
  connected: boolean;
  reconnecting: boolean;
}

export interface BoardDisplaySettings {
  show_grid: boolean;
  show_player_colors: boolean;
  show_hover_effects: boolean;
  cell_size: 'small' | 'medium' | 'large';
  animation_speed: 'slow' | 'normal' | 'fast';
  sound_volume: number;
}

// Component props
export interface PlayAreaBoardProps {
  cells: GameCell[];
  onCellClick: (index: number) => void;
  onCellHover: (index: number) => void;
  onCellLeave: () => void;
  disabled?: boolean;
  size?: number;
  settings: BoardDisplaySettings;
}

export interface PlayerListProps {
  players: PlayAreaPlayer[];
  spectators?: PlayAreaSpectator[];
  onKickPlayer?: (playerId: string) => void;
  onMakeHost?: (playerId: string) => void;
  showControls?: boolean;
}

export interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  unreadCount: number;
}

export interface GameStatusProps {
  session: PlayAreaSession;
  progress: GameProgress;
  timeRemaining?: number;
  isPaused: boolean;
}

// Error types
export interface PlayAreaError {
  code: string;
  message: string;
  retry?: boolean;
  fatal?: boolean;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  session_id: string;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  last_ping?: number;
  retry_count: number;
  max_retries: number;
}

// Constants
export const GAME_EVENTS = {
  CELL_MARKED: 'cell_marked',
  CELL_UNMARKED: 'cell_unmarked',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  WIN_DETECTED: 'win_detected',
  CHAT_MESSAGE: 'chat_message',
} as const;

export const WIN_PATTERNS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  DIAGONAL: 'diagonal',
  CORNERS: 'corners',
  MAJORITY: 'majority',
} as const;

export const PLAYER_COLORS = [
  { name: 'Blue', primary: '#3B82F6', secondary: '#93C5FD' },
  { name: 'Red', primary: '#EF4444', secondary: '#FCA5A5' },
  { name: 'Green', primary: '#10B981', secondary: '#6EE7B7' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#C4B5FD' },
  { name: 'Orange', primary: '#F59E0B', secondary: '#FCD34D' },
  { name: 'Pink', primary: '#EC4899', secondary: '#F9A8D4' },
  { name: 'Teal', primary: '#14B8A6', secondary: '#7DD3FC' },
  { name: 'Indigo', primary: '#6366F1', secondary: '#A5B4FC' },
] as const;

export const BOARD_SIZES = [3, 4, 5, 6] as const;
export const DEFAULT_BOARD_SIZE = 5;
export const MAX_PLAYERS = 8;
export const MAX_SPECTATORS = 50;
export const CHAT_MESSAGE_LIMIT = 100;
export const RECONNECT_TIMEOUT = 30000;
export const HEARTBEAT_INTERVAL = 30000;

export const SOUND_EFFECTS = {
  CELL_MARK: 'cell_mark',
  CELL_UNMARK: 'cell_unmark',
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  GAME_START: 'game_start',
  GAME_WIN: 'game_win',
  CHAT_MESSAGE: 'chat_message',
  ERROR: 'error',
} as const;
