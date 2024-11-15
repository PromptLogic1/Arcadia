export const GENERATOR_CONFIG = {
  DIFFICULTY_LEVELS: {
    EASY: { T5: 0.9, T4: 0.1 },
    NORMAL: { T4: 0.25, T3: 0.45, T2: 0.25, T1: 0.05 },
    HARD: { T3: 0.3, T2: 0.45, T1: 0.25 }
  },
  LIMITS: {
    MAX_ATTEMPTS: 10,
    MIN_BALANCE_SCORE: 0.7,
    MAX_SAME_TIER_PER_LINE: 2,
    MIN_DIFFERENT_TAGS: 2,
    MAX_TAGS: 10
  },
  BALANCE_WEIGHTS: {
    tierSpread: 0.4,
    tagVariety: 0.3,
    timeDistribution: 0.3
  },
  TIME_LIMITS: {
    MIN: 60,    // 1 Minute
    MAX: 3600,  // 1 Stunde
    DEFAULT: 300 // 5 Minuten
  },
  BOARD_SIZES: {
    MIN: 3,
    MAX: 6,
    DEFAULT: 5
  }
} as const 