import type { GameCategory, DifficultyLevel, BoardSettings as DatabaseBoardSettings, WinConditions as DatabaseWinConditions } from '@/types/database.types'

// Use the database BoardSettings directly to avoid type conflicts
export type GameSettings = DatabaseBoardSettings

// Additional game configuration types that extend the base settings
export interface GameConfiguration {
  // Core settings from database
  settings: BoardSettings
  
  // Additional configuration not stored in database
  timeLimit?: number
  maxPlayers: number
  allowSpectators: boolean
  enableChat: boolean
  difficulty: DifficultyLevel
  gameCategory: GameCategory
  autoStart: boolean
  pauseOnDisconnect: boolean
  showProgress: boolean
}

export interface TimerSettings {
  enabled: boolean
  duration: number
  showWarning: boolean
  warningTime: number
  autoEnd: boolean
}

export interface PlayerSettings {
  maxPlayers: number
  allowSpectators: boolean
  requireRegistration: boolean
  enableTeams: boolean
  teamSize?: number
}

export interface ChatSettings {
  enabled: boolean
  allowAnonymous: boolean
  moderation: boolean
  wordFilter: boolean
}

export interface GameMode {
  type: 'classic' | 'speed' | 'marathon' | 'custom'
  description: string
  settings: Partial<GameConfiguration>
}

// Re-export database types for convenience
export type BoardSettings = DatabaseBoardSettings
export type WinConditions = DatabaseWinConditions 