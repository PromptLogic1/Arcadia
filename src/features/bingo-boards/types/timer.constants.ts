export const TIMER_CONSTANTS = {
  DEFAULT_DURATION: 3600, // 1 hour in seconds
  MIN_DURATION: 60, // 1 minute
  MAX_DURATION: 14400, // 4 hours

  WARNING_THRESHOLDS: {
    CRITICAL: 60, // 1 minute
    WARNING: 300, // 5 minutes
    NOTICE: 600, // 10 minutes
  },

  UPDATE_INTERVAL: 1000, // 1 second

  FORMATS: {
    FULL: 'HH:mm:ss',
    SHORT: 'mm:ss',
    MINIMAL: 'm:ss',
  },

  STATES: {
    STOPPED: 'stopped',
    RUNNING: 'running',
    PAUSED: 'paused',
    EXPIRED: 'expired',
  } as const,

  PRESETS: {
    QUICK: 300, // 5 minutes
    SHORT: 900, // 15 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    EXTENDED: 7200, // 2 hours
  },

  SOUND_ALERTS: {
    WARNING: true,
    CRITICAL: true,
    EXPIRED: true,
  },

  // Performance monitoring
  TICK_INTERVAL: 1000,
  MAX_TICK_HISTORY: 100,
  MAX_DRIFT_THRESHOLD: 100,
  PERFORMANCE_CHECK_INTERVAL: 10000,

  // Storage
  STORAGE_KEY: 'timer_state',

  // Time validation
  MIN_TIME: 1,

  // Events
  EVENTS: {
    TIMER_UPDATE: 'timer_update',
    TIMER_WARNING: 'timer_warning',
    TIMER_CRITICAL: 'timer_critical',
    TIMER_EXPIRED: 'timer_expired',
  },
} as const;

export const TIMER_MESSAGES = {
  STARTED: 'Timer started',
  PAUSED: 'Timer paused',
  RESUMED: 'Timer resumed',
  STOPPED: 'Timer stopped',
  EXPIRED: "Time's up!",
  WARNING: 'Warning: Time running low',
  CRITICAL: 'Critical: Time almost up',
} as const;
