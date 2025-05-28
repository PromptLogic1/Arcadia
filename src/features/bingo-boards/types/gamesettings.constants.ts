import type {
  GameSettings,
  GameMode,
  WinConditions,
} from './gamesettings.types';

export const DEFAULT_WIN_CONDITIONS: WinConditions = {
  line: true,
  majority: false,
  diagonal: true,
  corners: false,
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  // From BoardSettings interface
  team_mode: false,
  lockout: false,
  sound_enabled: true,
  win_conditions: DEFAULT_WIN_CONDITIONS,

  // Session settings
  timeLimit: 3600, // 1 hour in seconds
  maxPlayers: 8,
  allowSpectators: true,
  enableChat: true,
  difficulty: 'medium',
  gameCategory: 'All Games',
  autoStart: false,
  pauseOnDisconnect: true,
  showProgress: true,
};

export const GAME_MODES: Record<string, GameMode> = {
  classic: {
    type: 'classic',
    description: 'Traditional bingo gameplay',
    settings: {
      timeLimit: 3600,
      maxPlayers: 8,
      win_conditions: DEFAULT_WIN_CONDITIONS,
    },
  },
  speed: {
    type: 'speed',
    description: 'Fast-paced quick rounds',
    settings: {
      timeLimit: 900, // 15 minutes
      maxPlayers: 4,
      win_conditions: {
        line: true,
        majority: false,
        diagonal: false,
        corners: false,
      },
    },
  },
  marathon: {
    type: 'marathon',
    description: 'Long endurance sessions',
    settings: {
      timeLimit: 7200, // 2 hours
      maxPlayers: 12,
      win_conditions: {
        line: true,
        majority: true,
        diagonal: true,
        corners: true,
      },
    },
  },
};

export const GAME_SETTINGS = {
  TIME_LIMITS: {
    VALUES: [300, 600, 900, 1800, 3600, 7200], // 5min, 10min, 15min, 30min, 1h, 2h
    MIN_TIME: 60, // 1 minute
    MAX_TIME: 14400, // 4 hours
  },
  MAX_PLAYERS_OPTIONS: [2, 4, 6, 8, 10, 12, 16],
  DIFFICULTY_MULTIPLIERS: {
    beginner: 0.8,
    easy: 0.9,
    medium: 1.0,
    hard: 1.2,
    expert: 1.5,
  },
  DEFAULT_TIMER_WARNING: 300, // 5 minutes
  MIN_PLAYERS: 1,
  MAX_PLAYERS_LIMIT: 50,
} as const;
