export const ANALYTICS_CONSTANTS = {
  // Tracking Intervals
  INTERVALS: {
    PERFORMANCE_CHECK: 1000, // 1 second
    EVENT_BATCH_SEND: 5000, // 5 seconds
    SESSION_UPDATE: 10000, // 10 seconds
    CLEANUP_OLD_DATA: 300000, // 5 minutes
  },

  // Data Retention
  RETENTION: {
    EVENTS_MAX_COUNT: 1000,
    PERFORMANCE_MAX_COUNT: 100,
    SESSION_HISTORY_MAX: 50,
    MAX_EVENT_AGE: 86400000, // 24 hours in ms
  },

  // Performance Thresholds
  PERFORMANCE_THRESHOLDS: {
    RENDER_TIME_WARNING: 16, // 60fps
    RENDER_TIME_CRITICAL: 32, // 30fps
    MEMORY_WARNING: 50 * 1024 * 1024, // 50MB
    MEMORY_CRITICAL: 100 * 1024 * 1024, // 100MB
    FPS_WARNING: 45,
    FPS_CRITICAL: 30,
  },

  // Event Priorities
  EVENT_PRIORITY: {
    HIGH: ['game_ended', 'error_occurred', 'player_left'],
    MEDIUM: ['game_started', 'line_completed', 'player_joined'],
    LOW: ['move_made', 'board_generated'],
  },

  // Batch Limits
  BATCH_LIMITS: {
    MAX_EVENTS_PER_BATCH: 50,
    MAX_PERFORMANCE_PER_BATCH: 20,
    MAX_BATCH_SIZE_KB: 100,
  }
} as const

export const EVENT_TYPES = {
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended', 
  MOVE_MADE: 'move_made',
  LINE_COMPLETED: 'line_completed',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  BOARD_GENERATED: 'board_generated',
  ERROR_OCCURRED: 'error_occurred',
} as const

export const PERFORMANCE_METRICS = {
  RENDER_TIME: 'render_time',
  UPDATE_TIME: 'update_time',
  MEMORY_USAGE: 'memory_usage',
  FPS: 'fps',
  TOTAL_HEAP_SIZE: 'total_heap_size',
  USED_HEAP_SIZE: 'used_heap_size',
} as const

// Analytics collection status
export const ANALYTICS_STATUS = {
  IDLE: 'idle',
  COLLECTING: 'collecting',
  PROCESSING: 'processing',
  SENDING: 'sending',
  ERROR: 'error',
} as const

export type AnalyticsConstant = typeof ANALYTICS_CONSTANTS
export type EventType = keyof typeof EVENT_TYPES  
export type PerformanceMetric = keyof typeof PERFORMANCE_METRICS
export type AnalyticsStatus = keyof typeof ANALYTICS_STATUS 