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

  // Game Events
  EVENTS: {
    MOVE_MADE: 'move_made',
    GAME_STARTED: 'game_started',
    GAME_ENDED: 'game_ended',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    BOARD_UPDATED: 'board_updated',
    ERROR_OCCURRED: 'error_occurred',
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

  // Game Status
  STATUS: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    PAUSED: 'paused', 
    ENDED: 'ended',
    CANCELLED: 'cancelled',
  },

  // Cell States
  CELL_STATES: {
    EMPTY: 'empty',
    MARKED: 'marked',
    BLOCKED: 'blocked',
    COMPLETED: 'completed',
  }
} as const

export type BingoGameConstant = typeof BINGO_GAME_CONSTANTS
export type ErrorType = keyof typeof BINGO_GAME_CONSTANTS.ERROR_TYPES
export type GameEvent = keyof typeof BINGO_GAME_CONSTANTS.EVENTS
export type WinCondition = keyof typeof BINGO_GAME_CONSTANTS.WIN_CONDITIONS
export type GameStatus = keyof typeof BINGO_GAME_CONSTANTS.STATUS
export type CellState = keyof typeof BINGO_GAME_CONSTANTS.CELL_STATES 