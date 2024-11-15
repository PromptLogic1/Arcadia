export const ANALYTICS_CONSTANTS = {
  // Performance thresholds
  PERFORMANCE: {
    MAX_MOVE_LATENCY: 100, // ms
    TARGET_FRAME_TIME: 16.67, // ms (60fps)
    PERFORMANCE_CHECK_INTERVAL: 1000, // ms
    MAX_HISTORY_LENGTH: 1000
  },

  // Pattern detection
  PATTERNS: {
    MIN_PATTERN_LENGTH: 3,
    MAX_PATTERN_LENGTH: 10,
    PATTERN_CONFIDENCE_THRESHOLD: 0.7
  },

  // Event tracking
  EVENTS: {
    BATCH_SIZE: 10,
    FLUSH_INTERVAL: 5000, // ms
    MAX_QUEUE_SIZE: 100
  },

  // Analysis
  ANALYSIS: {
    MIN_MOVES_FOR_PATTERN: 5,
    MIN_WINS_FOR_STRATEGY: 3,
    TREND_DETECTION_THRESHOLD: 0.6
  },

  // Storage
  STORAGE: {
    STATS_KEY: 'game_stats',
    PATTERNS_KEY: 'game_patterns',
    MAX_STORED_GAMES: 50
  },

  // Report generation
  REPORT: {
    MAX_RECOMMENDATIONS: 5,
    MAX_ISSUES: 3,
    UPDATE_INTERVAL: 10000 // ms
  }
} as const

// Event type mapping
export const EVENT_TYPES = {
  MOVE: 'move',
  WIN: 'win',
  LINE_COMPLETE: 'line_complete',
  PATTERN_DETECTED: 'pattern_detected',
  PERFORMANCE_MARK: 'performance_mark',
  ERROR: 'error'
} as const

// Performance metric names
export const PERFORMANCE_METRICS = {
  PAGE_LOAD: 'pageLoadTime',
  TIME_TO_INTERACTIVE: 'timeToInteractive',
  FRAME_TIME: 'averageFrameTime',
  UPDATE_TIME: 'lastUpdateTime',
  MOVE_LATENCY: 'moveLatency',
  RENDER_TIME: 'renderTime'
} as const

// Analysis categories
export const ANALYSIS_CATEGORIES = {
  MOVE_PATTERNS: 'movePatterns',
  WINNING_STRATEGIES: 'winningStrategies',
  PLAYER_TENDENCIES: 'playerTendencies',
  PERFORMANCE: 'performanceMetrics'
} as const 