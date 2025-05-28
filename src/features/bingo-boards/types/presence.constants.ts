import type { PresenceConfig } from './presence.types';

export const PRESENCE_CONSTANTS = {
  // Timing Configuration
  TIMING: {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    TIMEOUT_THRESHOLD: 60000, // 1 minute
    AWAY_THRESHOLD: 300000, // 5 minutes
    CLEANUP_INTERVAL: 120000, // 2 minutes
    RECONNECT_DELAY: 1000, // 1 second
    PRESENCE_BUFFER_TIME: 5000, // 5 seconds
  },

  // Connection Settings
  CONNECTION: {
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_BACKOFF_MULTIPLIER: 1.5,
    MAX_RECONNECT_DELAY: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 10000, // 10 seconds
  },

  // Status Types
  STATUS: {
    ONLINE: 'online',
    AWAY: 'away',
    BUSY: 'busy',
    OFFLINE: 'offline',
  },

  // Activity Types
  ACTIVITY: {
    VIEWING: 'viewing',
    EDITING: 'editing',
    PLAYING: 'playing',
    IDLE: 'idle',
  },

  // Event Types
  EVENTS: {
    JOIN: 'join',
    LEAVE: 'leave',
    UPDATE: 'update',
    STATUS_CHANGE: 'status_change',
    ACTIVITY_CHANGE: 'activity_change',
  },

  // Device Types
  DEVICE_TYPES: {
    DESKTOP: 'desktop',
    TABLET: 'tablet',
    MOBILE: 'mobile',
  },

  // Throttling
  THROTTLE: {
    PRESENCE_UPDATE: 1000, // 1 second
    STATUS_BROADCAST: 2000, // 2 seconds
    ACTIVITY_UPDATE: 500, // 0.5 seconds
  },

  // Batch Processing
  BATCH: {
    MAX_EVENTS_PER_BATCH: 10,
    BATCH_FLUSH_INTERVAL: 1000, // 1 second
    MAX_BATCH_SIZE_KB: 50,
  },
} as const;

// Default presence configuration
export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  heartbeatInterval: PRESENCE_CONSTANTS.TIMING.HEARTBEAT_INTERVAL,
  timeoutThreshold: PRESENCE_CONSTANTS.TIMING.TIMEOUT_THRESHOLD,
  awayThreshold: PRESENCE_CONSTANTS.TIMING.AWAY_THRESHOLD,
  reconnectAttempts: PRESENCE_CONSTANTS.CONNECTION.MAX_RECONNECT_ATTEMPTS,
  reconnectDelay: PRESENCE_CONSTANTS.TIMING.RECONNECT_DELAY,
};

// Status priority for conflict resolution
export const STATUS_PRIORITY = {
  [PRESENCE_CONSTANTS.STATUS.ONLINE]: 4,
  [PRESENCE_CONSTANTS.STATUS.BUSY]: 3,
  [PRESENCE_CONSTANTS.STATUS.AWAY]: 2,
  [PRESENCE_CONSTANTS.STATUS.OFFLINE]: 1,
} as const;

// Activity priority for display purposes
export const ACTIVITY_PRIORITY = {
  [PRESENCE_CONSTANTS.ACTIVITY.PLAYING]: 4,
  [PRESENCE_CONSTANTS.ACTIVITY.EDITING]: 3,
  [PRESENCE_CONSTANTS.ACTIVITY.VIEWING]: 2,
  [PRESENCE_CONSTANTS.ACTIVITY.IDLE]: 1,
} as const;

export type PresenceConstant = typeof PRESENCE_CONSTANTS;
export type PresenceStatus = keyof typeof PRESENCE_CONSTANTS.STATUS;
export type ActivityType = keyof typeof PRESENCE_CONSTANTS.ACTIVITY;
export type PresenceEvent = keyof typeof PRESENCE_CONSTANTS.EVENTS;
export type DeviceType = keyof typeof PRESENCE_CONSTANTS.DEVICE_TYPES;
