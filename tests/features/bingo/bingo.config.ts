/**
 * Bingo-specific test configuration and constants
 */

export const BINGO_CONFIG = {
  // Board size constraints
  MIN_BOARD_SIZE: 3,
  MAX_BOARD_SIZE: 6,
  DEFAULT_BOARD_SIZE: 5,

  // Card constraints
  MIN_CARD_TEXT_LENGTH: 1,
  MAX_CARD_TEXT_LENGTH: 200,
  MIN_CARDS_PER_BOARD: 9, // 3x3
  MAX_CARDS_PER_BOARD: 36, // 6x6

  // Session limits
  MAX_PLAYERS_PER_SESSION: 20,
  SESSION_CODE_LENGTH: 6,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes

  // Performance thresholds
  PERFORMANCE: {
    BOARD_CREATION_MAX_MS: 3000,
    CELL_MARK_MAX_MS: 100,
    WIN_DETECTION_MAX_MS: 50,
    SESSION_JOIN_MAX_MS: 1500,
    REALTIME_SYNC_MAX_MS: 200,
    PAGE_LOAD_MAX_MS: 5000,
  },

  // Test timeouts
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000,
    NETWORK_IDLE: 3000,
    ANIMATION: 1000,
  },

  // Real-time testing
  REALTIME: {
    SYNC_DELAY_MS: 100,
    RECONNECT_DELAY_MS: 2000,
    MAX_SYNC_ATTEMPTS: 3,
  },

  // Game categories for testing
  GAME_TYPES: ['valorant', 'minecraft', 'league-of-legends', 'custom'] as const,

  // Card categories
  CARD_CATEGORIES: [
    'action',
    'weapon',
    'map',
    'agent',
    'item',
    'objective',
  ] as const,

  // Difficulty levels
  DIFFICULTIES: ['easy', 'medium', 'hard', 'expert'] as const,

  // Win patterns
  WIN_PATTERNS: {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
    DIAGONAL: 'diagonal',
    FOUR_CORNERS: 'four-corners',
    X_PATTERN: 'x-pattern',
    PLUS_PATTERN: 'plus-pattern',
    FULL_HOUSE: 'full-house',
  } as const,

  // Test data sets
  TEST_CARDS: {
    VALORANT: [
      'Get a kill with Vandal',
      'Plant the spike',
      'Defuse the bomb',
      'Ace the round',
      'Clutch 1v3 situation',
      'Use Jett ultimate',
      'Win pistol round',
      'Get a headshot',
      'Save weapon after eco',
      'Flash an enemy',
      'Smoke a site entrance',
      'Wallbang kill',
      'Ninja defuse',
      'Team kill with abilities',
      'Buy full armor',
      'Drop weapon for teammate',
      'Win eco round',
      'Force buy round',
      'Trade kill teammate',
      'Get first blood',
      'Entry frag on site',
      'Support teammate with utility',
      'Successful lurk',
      'Fast rotate',
      'Check all corners',
    ],
    MINECRAFT: [
      'Mine 64 diamonds',
      'Build a castle',
      'Defeat the Ender Dragon',
      'Find a stronghold',
      'Tame a wolf',
      'Create a redstone contraption',
      'Find a village',
      'Build a farm',
      'Craft diamond armor',
      'Explore the Nether',
      'Find ancient debris',
      'Build a portal',
      'Enchant a sword',
      'Fish for treasure',
      'Ride a pig',
      'Sleep in a bed',
      'Trade with villagers',
      'Find a dungeon',
      'Build with different wood types',
      'Create a map',
      'Breed animals',
      'Make a cake',
      'Find emeralds',
      'Build underwater',
      'Use an elytra',
    ],
    GENERIC: [
      'Complete objective A',
      'Achieve milestone B',
      'Collect resource C',
      'Defeat enemy D',
      'Unlock ability E',
      'Reach location F',
      'Solve puzzle G',
      'Find secret H',
      'Upgrade equipment I',
      'Form alliance J',
    ],
  } as const,

  // Mock user data
  TEST_USERS: {
    HOST: {
      email: 'host@test.com',
      username: 'TestHost',
      color: '#FF0000',
    },
    PLAYER_1: {
      email: 'player1@test.com',
      username: 'Player1',
      color: '#00FF00',
    },
    PLAYER_2: {
      email: 'player2@test.com',
      username: 'Player2',
      color: '#0000FF',
    },
    SPECTATOR: {
      email: 'spectator@test.com',
      username: 'Spectator',
      color: '#808080',
    },
  } as const,

  // Error messages for validation
  ERROR_MESSAGES: {
    BOARD_TITLE_REQUIRED: /title.*required/i,
    BOARD_TITLE_TOO_LONG: /title.*100 characters/i,
    GAME_TYPE_REQUIRED: /game type.*required/i,
    INVALID_BOARD_SIZE: /board size.*between 3 and 6/i,
    CARD_TEXT_REQUIRED: /card text.*required/i,
    CARD_TEXT_TOO_LONG: /card text.*200 characters/i,
    DUPLICATE_CARD: /card already exists/i,
    SESSION_NOT_FOUND: /session not found/i,
    SESSION_FULL: /session is full/i,
    SESSION_CODE_REQUIRED: /session code.*required/i,
    BOARD_INCOMPLETE: /board must be complete/i,
    NETWORK_ERROR: /connection.*error/i,
    PERMISSION_DENIED: /permission denied/i,
  } as const,

  // Success messages
  SUCCESS_MESSAGES: {
    BOARD_CREATED: /board created successfully/i,
    BOARD_SAVED: /board saved/i,
    CARD_ADDED: /card added/i,
    CARD_UPDATED: /card updated/i,
    CARD_DELETED: /card deleted/i,
    GAME_STARTED: /game started/i,
    PLAYER_JOINED: /joined game/i,
    BINGO_DETECTED: /bingo/i,
    BOARD_SHARED: /board shared/i,
    TEMPLATE_SUBMITTED: /template submitted/i,
  } as const,

  // CSS selectors for common elements
  SELECTORS: {
    BOARD_TITLE: '[data-testid="board-title"]',
    BINGO_GRID: '[data-testid="bingo-grid"]',
    CARD_LIBRARY: '[data-testid="card-library"]',
    GRID_CELL: (row: number, col: number) =>
      `[data-testid="grid-cell-${row}-${col}"]`,
    LIBRARY_CARD: '[data-testid="library-card"]',
    SESSION_CODE: '[data-testid="session-code"]',
    PLAYER_COUNT: '[data-testid="player-count"]',
    GAME_STATUS: '[data-testid="game-status"]',
    WIN_DIALOG: '[role="dialog"][aria-label*="winner"]',
    VICTORY_ANIMATION: '.victory-animation',
    CONFETTI_CONTAINER: '.confetti-container',
    WINNING_CELL: '.winning-cell',
    MARKED_CELL: '[data-marked="true"]',
    PLAYER_LIST: '[data-testid="player-list"]',
    GAME_CONTROLS: '[data-testid="game-controls"]',
    BOARD_SETTINGS: '[data-testid="board-settings"]',
    SHARE_DIALOG: '[data-testid="share-dialog"]',
    COLLABORATION_PANEL: '[data-testid="collaboration-panel"]',
  } as const,

  // Accessibility requirements
  A11Y: {
    MIN_CONTRAST_RATIO: 4.5,
    MIN_TOUCH_TARGET_SIZE: 44, // pixels
    MAX_TAB_STOPS: 50,
    REQUIRED_ARIA_LABELS: [
      'Board title',
      'Game grid',
      'Card library',
      'Player list',
      'Game controls',
    ],
  } as const,

  // Visual regression test settings
  VISUAL: {
    THRESHOLD: 0.1,
    MAX_DIFF_PIXELS: 100,
    ANIMATION_MODE: 'disabled' as const,
    IGNORE_AREAS: ['.timestamp', '.player-cursor', '.realtime-indicator'],
  } as const,
} as const;

export type BingoGameType = (typeof BINGO_CONFIG.GAME_TYPES)[number];
export type CardCategory = (typeof BINGO_CONFIG.CARD_CATEGORIES)[number];
export type DifficultyLevel = (typeof BINGO_CONFIG.DIFFICULTIES)[number];
export type WinPattern =
  (typeof BINGO_CONFIG.WIN_PATTERNS)[keyof typeof BINGO_CONFIG.WIN_PATTERNS];
