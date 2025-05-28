export const BOARD_CONSTANTS = {
  SIZE: {
    MIN: 3,
    MAX: 7,
    DEFAULT: 5,
    SUPPORTED: [3, 4, 5, 6, 7] as const,
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
    MAX_CELLS: 49, // 7x7
    DEFAULT_CELLS: 25, // 5x5
  },

  VALIDATION: {
    TITLE_REQUIRED: true,
    MIN_FILLED_CELLS: 5,
    MAX_TAGS: 10,
  },

  STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ARCHIVED: 'archived',
  } as const,

  VISIBILITY: {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    PRIVATE: 'private',
  } as const,
} as const;

export const ERROR_MESSAGES = {
  BOARD_NOT_FOUND: 'Board not found',
  INVALID_BOARD_SIZE: 'Invalid board size',
  TITLE_TOO_SHORT: 'Title must be at least 3 characters',
  TITLE_TOO_LONG: 'Title cannot exceed 50 characters',
  DESCRIPTION_TOO_LONG: 'Description cannot exceed 500 characters',
  INSUFFICIENT_CELLS: 'Board must have at least 5 filled cells',
  INVALID_DIFFICULTY: 'Invalid difficulty level',
  INVALID_GAME_CATEGORY: 'Invalid game category',
  UNAUTHORIZED: 'You do not have permission to perform this action',
  NETWORK_ERROR: 'Network error occurred',
  SAVE_FAILED: 'Failed to save board',
  DELETE_FAILED: 'Failed to delete board',
  DUPLICATE_FAILED: 'Failed to duplicate board',
} as const;

export const DIFFICULTY_SETTINGS = {
  beginner: {
    label: 'Beginner',
    color: '#4ADE80', // green-400
    timeMultiplier: 1.5,
    pointsMultiplier: 0.8,
  },
  easy: {
    label: 'Easy',
    color: '#60A5FA', // blue-400
    timeMultiplier: 1.2,
    pointsMultiplier: 0.9,
  },
  medium: {
    label: 'Medium',
    color: '#FBBF24', // amber-400
    timeMultiplier: 1.0,
    pointsMultiplier: 1.0,
  },
  hard: {
    label: 'Hard',
    color: '#F97316', // orange-500
    timeMultiplier: 0.8,
    pointsMultiplier: 1.2,
  },
  expert: {
    label: 'Expert',
    color: '#EF4444', // red-500
    timeMultiplier: 0.6,
    pointsMultiplier: 1.5,
  },
} as const;

export const BOARD_TEMPLATES = {
  classic: {
    name: 'Classic 5x5',
    size: 5,
    description: 'Standard bingo board layout',
    centerFree: true,
  },
  mini: {
    name: 'Mini 3x3',
    size: 3,
    description: 'Quick games',
    centerFree: false,
  },
  large: {
    name: 'Large 7x7',
    size: 7,
    description: 'Extended gameplay',
    centerFree: true,
  },
} as const;
