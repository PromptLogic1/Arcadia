export const PLAYER_CONSTANTS = {
  LIMITS: {
    MAX_PLAYERS: 4,
    MAX_TEAM_SIZE: 2,
    MIN_TEAM_SIZE: 1,
    MAX_NAME_LENGTH: 20
  },

  TEAMS: {
    MAX_TEAMS: 2,
    DEFAULT_NAMES: ['Team 1', 'Team 2'] as [string, string],
    DEFAULT_COLORS: ['bg-cyan-500', 'bg-fuchsia-500'] as [string, string]
  },

  VALIDATION: {
    MAX_TEAM_SIZE_DIFFERENCE: 1,
    MIN_PLAYERS_FOR_TEAM_MODE: 2
  },

  EVENTS: {
    PLAYER_JOIN: 'playerJoin',
    PLAYER_LEAVE: 'playerLeave',
    TEAM_CHANGE: 'teamChange',
    TEAM_UPDATE: 'teamUpdate'
  }
} as const

export type TeamSizeLimits = typeof PLAYER_CONSTANTS.LIMITS
