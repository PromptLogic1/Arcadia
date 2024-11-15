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
  } as const
} as const

export type SessionStatus = typeof SESSION_CONSTANTS.STATUS[keyof typeof SESSION_CONSTANTS.STATUS] 