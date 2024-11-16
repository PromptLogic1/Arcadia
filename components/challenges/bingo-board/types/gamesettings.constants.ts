import type { GameSettings } from './gamesettings.types'

export const GAME_SETTINGS = {
  PLAYER_LIMITS: {
    MIN_PLAYERS: 2,
    MAX_PLAYER_LIMIT: 8,
    DEFAULT_PLAYER_LIMIT: 4
  },

  TIME_LIMITS: {
    MIN_TIME: 60000,    // 1 Minute
    MAX_TIME: 3600000,  // 1 Stunde
    DEFAULT_TIME: 300000, // 5 Minuten
    DEFAULT_TURN_TIME: 30000 // 30 Sekunden
  },

  BOARD_SETTINGS: {
    MIN_SIZE: 3,
    MAX_SIZE: 6,
    DEFAULT_SIZE: 5,
    DEFAULT_DIFFICULTY: 'medium' as const
  },

  DEFAULTS: {
    TEAM_MODE: false,
    LOCKOUT: true,
    SOUND_ENABLED: true,
    WIN_CONDITIONS: {
      line: true,
      majority: false
    }
  }
} as const

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  // Game Rules
  teamMode: GAME_SETTINGS.DEFAULTS.TEAM_MODE,
  lockout: GAME_SETTINGS.DEFAULTS.LOCKOUT,
  soundEnabled: GAME_SETTINGS.DEFAULTS.SOUND_ENABLED,
  winConditions: GAME_SETTINGS.DEFAULTS.WIN_CONDITIONS,
  
  // Player Settings
  maxPlayerLimit: GAME_SETTINGS.PLAYER_LIMITS.MAX_PLAYER_LIMIT,
  minPlayers: GAME_SETTINGS.PLAYER_LIMITS.MIN_PLAYERS,
  defaultPlayerLimit: GAME_SETTINGS.PLAYER_LIMITS.DEFAULT_PLAYER_LIMIT,
  
  // Time Settings
  timeLimit: GAME_SETTINGS.TIME_LIMITS.DEFAULT_TIME,
  turnTimeLimit: GAME_SETTINGS.TIME_LIMITS.DEFAULT_TURN_TIME,
  
  // Board Settings
  boardSize: GAME_SETTINGS.BOARD_SETTINGS.DEFAULT_SIZE,
  difficulty: GAME_SETTINGS.BOARD_SETTINGS.DEFAULT_DIFFICULTY
}
