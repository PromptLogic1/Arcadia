// =============================================================================
// BINGO BOARDS FEATURE CONSTANTS
// =============================================================================

// Player Management Constants
export const PLAYER_CONSTANTS = {
  LIMITS: {
    MAX_NAME_LENGTH: 20,
    MIN_NAME_LENGTH: 2,
    MAX_PLAYERS_PER_SESSION: 8,
    MIN_PLAYERS_PER_SESSION: 1,
  },
  TEAMS: {
    DEFAULT_COLORS: [
      'bg-cyan-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-blue-500',
      'bg-yellow-500',
    ],
    MAX_TEAMS: 4,
    MIN_TEAM_SIZE: 1,
  },
  SESSION: {
    JOIN_TIMEOUT: 30000, // 30 seconds
    HEARTBEAT_INTERVAL: 5000, // 5 seconds
    MAX_IDLE_TIME: 300000, // 5 minutes
  },
} as const;

// Generator Constants
export const GENERATOR_CONFIG = {
  CARDPOOLSIZE_LIMITS: {
    Small: 50,
    Medium: 100,
    Large: 200,
  } as const,
  MAX_CUSTOM_PROMPTS: 10,
  MIN_BOARD_SIZE: 3,
  MAX_BOARD_SIZE: 6,
  DEFAULT_BOARD_SIZE: 5,
} as const;

// Board Constants
export const BOARD_CONSTANTS = {
  MIN_SIZE: 3,
  MAX_SIZE: 6,
  DEFAULT_SIZE: 5,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  STORAGE: {
    MAX_BOARDS_PER_USER: 50,
    MAX_BOOKMARKS_PER_USER: 100,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  BOARD_NOT_FOUND: 'Board not found',
  SESSION_NOT_FOUND: 'Session not found',
  PLAYER_NAME_TOO_SHORT: `Player name must be at least ${PLAYER_CONSTANTS.LIMITS.MIN_NAME_LENGTH} characters`,
  PLAYER_NAME_TOO_LONG: `Player name cannot exceed ${PLAYER_CONSTANTS.LIMITS.MAX_NAME_LENGTH} characters`,
  SESSION_FULL: 'Session is full',
  SESSION_NOT_ACTIVE: 'Session is not active',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NETWORK_ERROR: 'Network error. Please try again.',
  VALIDATION_FAILED: 'Validation failed. Please check your input.',
} as const;

// Analytics Constants
export const ANALYTICS_CONSTANTS = {
  EVENTS: {
    BOARD_CREATED: 'board_created',
    BOARD_PLAYED: 'board_played',
    CELL_MARKED: 'cell_marked',
    GAME_WON: 'game_won',
    PLAYER_JOINED: 'player_joined',
  },
  METRICS: {
    COMPLETION_TIME: 'completion_time',
    ACCURACY: 'accuracy',
    ENGAGEMENT: 'engagement',
  },
} as const;

// Timer Constants
export const TIMER_CONSTANTS = {
  DEFAULT_TIME_LIMIT: 1800000, // 30 minutes
  WARNING_TIME: 300000, // 5 minutes
  CRITICAL_TIME: 60000, // 1 minute
  UPDATE_INTERVAL: 1000, // 1 second
} as const;

// Presence Constants
export const PRESENCE_CONSTANTS = {
  HEARTBEAT_INTERVAL: 5000,
  TIMEOUT_THRESHOLD: 15000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// Session Queue Constants
export const QUEUE_CONSTANTS = {
  MAX_QUEUE_SIZE: 20,
  AUTO_APPROVE_DELAY: 5000,
  REQUEST_TIMEOUT: 30000,
  CLEANUP_INTERVAL: 60000,
} as const;

// Layout Constants
export const LAYOUT_CONSTANTS = {
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  } as const,
  GRID: {
    COLS_SM: 1,
    COLS_MD: 2,
    COLS_LG: 3,
    COLS_XL: 4,
  },
} as const;

export type Breakpoint = keyof typeof LAYOUT_CONSTANTS.BREAKPOINTS;

// Event Types
export const EVENT_TYPES = {
  CELL_MARKED: 'cell_marked',
  CELL_UNMARKED: 'cell_unmarked',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  BINGO_ACHIEVED: 'bingo_achieved',
} as const;

// Performance Metrics
export const PERFORMANCE_METRICS = {
  LOAD_TIME: 'load_time',
  RENDER_TIME: 'render_time',
  INTERACTION_TIME: 'interaction_time',
  ERROR_RATE: 'error_rate',
} as const;

// Tag System Constants
export const TAG_SYSTEM = {
  MAX_TAGS_PER_CARD: 10,
  MAX_TAG_LENGTH: 50,
  MIN_TAG_LENGTH: 2,
  VALIDATION_RULES: {
    FORBIDDEN_TERMS: ['spam', 'test', 'invalid'],
    REQUIRED_CATEGORIES: ['game', 'difficulty'],
    MAX_VOTES_PER_USER: 1,
  },
} as const;
