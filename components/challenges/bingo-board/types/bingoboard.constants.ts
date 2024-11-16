export const BOARD_CONSTANTS = {
  VALIDATION: {
    MIN_BOARD_SIZE: 3,
    MAX_BOARD_SIZE: 6,
    MIN_CELL_LENGTH: 1,
    MAX_CELL_LENGTH: 100
  },

  UPDATE: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BATCH_DELAY: 50,
    MAX_BATCH_SIZE: 10
  },

  SYNC: {
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 1000,
    MAX_VERSION_DIFF: 5
  },

  EVENTS: {
    STATE_UPDATE: 'stateUpdate',
    SETTINGS_UPDATE: 'settingsUpdate',
    CONFLICT: 'conflict',
    ERROR: 'error'
  }
} as const

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error',
  INVALID_BOARD: 'Invalid board state',
  UPDATE_FAILED: 'Failed to update board',
  SYNC_FAILED: 'Failed to sync board state'
} as const
