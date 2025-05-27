export const SESSION_CONSTANTS = {
  STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
  } as const,

  TABLES: {
    EVENTS: 'bingo_session_events',
    PLAYERS: 'bingo_session_players',
    CELLS: 'bingo_session_cells',
    BOARDS: 'bingo_boards'
  } as const,

  RECONNECT: {
    MAX_ATTEMPTS: 3,
    DELAY: 500,
    TIMEOUT: 3000
  } as const,

  SYNC: {
    INITIAL_DELAY: 50,
    STATE_UPDATE_DELAY: 25
  } as const
} as const

export type SessionStatus = typeof SESSION_CONSTANTS.STATUS[keyof typeof SESSION_CONSTANTS.STATUS] 