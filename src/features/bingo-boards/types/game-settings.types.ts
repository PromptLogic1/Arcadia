// import type { z } from 'zod'; // Removed unused import
// import type { Tables, Enums, Database } from '@/types/database-types'; // Removed unused imports

import type { GameCategory, Difficulty, CompositeTypes } from '@/types';

// Type aliases for database composite types
type DatabaseBoardSettings = CompositeTypes<'board_settings'>;
type DatabaseWinConditions = CompositeTypes<'win_conditions'>;
type DifficultyLevel = Difficulty;

// GameSettings combines board settings, session settings, and additional app-specific settings
export interface GameSettings extends DatabaseBoardSettings {
  // Session settings
  timeLimit?: number;
  maxPlayers?: number;
  allowSpectators?: boolean;
  autoStart?: boolean;
  requireApproval?: boolean;

  // Additional app settings
  enableChat?: boolean;
  difficulty?: DifficultyLevel;
  gameCategory?: GameCategory;
  pauseOnDisconnect?: boolean;
  showProgress?: boolean;

  // Backward compatibility aliases
  teamMode?: boolean; // maps to team_mode
}

// Additional game configuration types that extend the base settings
export interface GameConfiguration {
  // Core settings from database
  settings?: BoardSettings;

  // Board settings that can be directly configured
  team_mode?: boolean;
  lockout?: boolean;
  sound_enabled?: boolean;
  win_conditions?: DatabaseWinConditions;

  // Additional configuration not stored in database
  timeLimit?: number;
  maxPlayers?: number;
  allowSpectators?: boolean;
  enableChat?: boolean;
  difficulty?: DifficultyLevel;
  gameCategory?: GameCategory;
  autoStart?: boolean;
  pauseOnDisconnect?: boolean;
  showProgress?: boolean;
}

export interface TimerSettings {
  enabled: boolean;
  duration: number;
  showWarning: boolean;
  warningTime: number;
  autoEnd: boolean;
}

export interface PlayerSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  requireRegistration: boolean;
  enableTeams: boolean;
  teamSize?: number;
}

export interface ChatSettings {
  enabled: boolean;
  allowAnonymous: boolean;
  moderation: boolean;
  wordFilter: boolean;
}

export interface GameMode {
  type: 'classic' | 'speed' | 'marathon' | 'custom';
  description: string;
  settings: Partial<GameConfiguration>;
}

// Re-export database types for convenience
export type BoardSettings = DatabaseBoardSettings;
export type WinConditions = DatabaseWinConditions;
