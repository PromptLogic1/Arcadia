export const BINGO_GAME_CONSTANTS = {
  VALIDATION: {
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 8,
    MIN_BOARD_SIZE: 3,
    MAX_BOARD_SIZE: 6
  },

  GAME_PHASES: {
    ACTIVE: 'active',
    ENDED: 'ended'
  } as const,

  EVENTS: {
    BEFORE_MOVE: 'beforeMove',
    AFTER_MOVE: 'afterMove',
    GAME_END: 'gameEnd',
    ERROR: 'error'
  } as const,

  ERROR_TYPES: {
    INVALID_MOVE: 'invalidMove',
    UNAUTHORIZED_PLAYER: 'unauthorizedPlayer',
    FIELD_OCCUPIED: 'fieldOccupied',
    INVALID_GAME_STATE: 'invalidGameState'
  } as const,

  RECOVERY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    AUTO_RESET_DELAY: 5000
  }
} as const
