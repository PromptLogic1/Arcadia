export const PLAYER_CONSTANTS = {
  MAX_PLAYERS: {
    DEFAULT: 8,
    MINIMUM: 1,
    MAXIMUM: 50,
    TEAM_MAX: 6,
  },

  COLORS: {
    DEFAULT: [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Light Yellow
      '#BB8FCE', // Light Purple
      '#85C1E9', // Light Blue
      '#F8C471', // Orange
      '#82E0AA', // Light Green
    ],
    TEAM_COLORS: [
      '#FF0000', // Red Team
      '#0000FF', // Blue Team
      '#00FF00', // Green Team
      '#FFFF00', // Yellow Team
      '#FF00FF', // Purple Team
      '#00FFFF', // Cyan Team
    ],
    RED: '#ef4444',
    BLUE: '#3b82f6',
    GREEN: '#22c55e',
    YELLOW: '#eab308',
    PURPLE: '#a855f7',
    ORANGE: '#f97316',
    PINK: '#ec4899',
    CYAN: '#06b6d4',
    LIME: '#84cc16',
    INDIGO: '#6366f1',
    AMBER: '#f59e0b',
    EMERALD: '#10b981',
  },

  TEAMS: {
    MAX_TEAMS: 6,
    MIN_TEAM_SIZE: 1,
    MAX_TEAM_SIZE: 8,
    DEFAULT_COLORS: [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
    ],
    DEFAULT_NAMES: ['Team Alpha', 'Team Beta'] as [string, string],
    AUTO_BALANCE: true,
    ALLOW_TEAM_SWITCHING: false,
    DEFAULT_TEAM_NAMES: [
      'Team Alpha',
      'Team Beta',
      'Team Gamma',
      'Team Delta',
      'Team Epsilon',
      'Team Zeta',
    ],
  },

  PERMISSIONS: {
    DEFAULT: {
      can_mark_cells: true,
      can_chat: true,
      can_invite: false,
      can_kick: false,
      can_change_settings: false,
      is_moderator: false,
    },
    HOST: {
      can_mark_cells: true,
      can_chat: true,
      can_invite: true,
      can_kick: true,
      can_change_settings: true,
      is_moderator: true,
    },
    MODERATOR: {
      can_mark_cells: true,
      can_chat: true,
      can_invite: true,
      can_kick: true,
      can_change_settings: false,
      is_moderator: true,
    },
    CAN_KICK_PLAYERS: ['host'],
    CAN_BAN_PLAYERS: ['host'],
    CAN_CHANGE_SETTINGS: ['host'],
    CAN_START_GAME: ['host'],
    CAN_PAUSE_GAME: ['host'],
    CAN_END_GAME: ['host'],
    CAN_ASSIGN_TEAMS: ['host'],
  },

  CONNECTION: {
    TIMEOUT: 30000, // 30 seconds
    RECONNECT_ATTEMPTS: 3,
    HEARTBEAT_INTERVAL: 10000, // 10 seconds
    PRESENCE_UPDATE_INTERVAL: 5000, // 5 seconds
  },

  EVENTS: {
    TYPES: [
      'joined',
      'left',
      'marked_cell',
      'completed_line',
      'won',
      'disconnected',
      'reconnected',
      'kicked',
    ] as const,
    MAX_HISTORY: 100,
    PLAYER_JOIN: 'joined',
    TEAM_CHANGE: 'team_change',
  },

  LIMITS: {
    MAX_PLAYERS: 12,
    MIN_PLAYERS: 1,
    MAX_TEAMS: 6,
    MAX_PLAYERS_PER_TEAM: 6,
    MAX_NAME_LENGTH: 50,
    MIN_NAME_LENGTH: 2,
  },

  ROLES: {
    HOST: 'host' as const,
    PLAYER: 'player' as const,
    SPECTATOR: 'spectator' as const,
  },

  STATUS: {
    ACTIVE: 'active' as const,
    INACTIVE: 'inactive' as const,
    DISCONNECTED: 'disconnected' as const,
    BANNED: 'banned' as const,
  },

  ACTIONS: {
    JOIN: 'join' as const,
    LEAVE: 'leave' as const,
    KICK: 'kick' as const,
    BAN: 'ban' as const,
    PROMOTE: 'promote' as const,
    DEMOTE: 'demote' as const,
    CHANGE_COLOR: 'change_color' as const,
    CHANGE_TEAM: 'change_team' as const,
  },

  TIMEOUTS: {
    INACTIVITY_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    DISCONNECT_GRACE_PERIOD: 30 * 1000, // 30 seconds
    HEARTBEAT_INTERVAL: 30 * 1000, // 30 seconds
    PRESENCE_UPDATE_INTERVAL: 10 * 1000, // 10 seconds
  },

  ERRORS: {
    SESSION_FULL: 'SESSION_FULL',
    INVALID_NAME: 'INVALID_NAME',
    NAME_TAKEN: 'NAME_TAKEN',
    COLOR_TAKEN: 'COLOR_TAKEN',
    INVALID_COLOR: 'INVALID_COLOR',
    TEAM_FULL: 'TEAM_FULL',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    PLAYER_BANNED: 'PLAYER_BANNED',
    ALREADY_IN_SESSION: 'ALREADY_IN_SESSION',
    NOT_IN_SESSION: 'NOT_IN_SESSION',
  },
} as const;

export const PLAYER_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    ALLOWED_CHARS: /^[a-zA-Z0-9_\-\s]+$/,
  },
  TEAM_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 15,
    ALLOWED_CHARS: /^[a-zA-Z0-9_\-\s]+$/,
  },
} as const;

// Type exports
export type PlayerColor =
  (typeof PLAYER_CONSTANTS.COLORS)[keyof typeof PLAYER_CONSTANTS.COLORS];
export type PlayerRole =
  (typeof PLAYER_CONSTANTS.ROLES)[keyof typeof PLAYER_CONSTANTS.ROLES];
export type PlayerStatus =
  (typeof PLAYER_CONSTANTS.STATUS)[keyof typeof PLAYER_CONSTANTS.STATUS];
export type PlayerAction =
  (typeof PLAYER_CONSTANTS.ACTIONS)[keyof typeof PLAYER_CONSTANTS.ACTIONS];
export type PlayerErrorCode =
  (typeof PLAYER_CONSTANTS.ERRORS)[keyof typeof PLAYER_CONSTANTS.ERRORS];
