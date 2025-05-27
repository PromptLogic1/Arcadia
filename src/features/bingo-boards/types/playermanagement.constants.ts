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
  },

  TEAMS: {
    MAX_TEAMS: 6,
    MIN_TEAM_SIZE: 1,
    MAX_TEAM_SIZE: 8,
    DEFAULT_COLORS: [
      '#FF6B6B', '#4ECDC4', '#45B7D1', 
      '#96CEB4', '#FFEAA7', '#DDA0DD'
    ],
    DEFAULT_NAMES: ['Team Alpha', 'Team Beta'] as [string, string],
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
  },

  CONNECTION: {
    TIMEOUT: 30000, // 30 seconds
    RECONNECT_ATTEMPTS: 3,
    HEARTBEAT_INTERVAL: 10000, // 10 seconds
    PRESENCE_UPDATE_INTERVAL: 5000, // 5 seconds
  },

  EVENTS: {
    TYPES: [
      'joined', 'left', 'marked_cell', 'completed_line', 
      'won', 'disconnected', 'reconnected', 'kicked'
    ] as const,
    MAX_HISTORY: 100,
    PLAYER_JOIN: 'joined',
    TEAM_CHANGE: 'team_change',
  },
  
  LIMITS: {
    MAX_PLAYERS: 50,
    MAX_TEAM_SIZE: 8,
    MIN_TEAM_SIZE: 1,
  },
} as const

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
} as const 