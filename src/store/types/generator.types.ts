import { GameCategory, CardCategory, Difficulty } from "./game.types"

export interface GeneratorSettings {
  difficulty: keyof typeof GENERATOR_CONFIG.DIFFICULTY_LEVELS
  cardPoolSize: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS
  minVotes: number
  selectedCategories: CardCategory[]
  gameCategory: GameCategory
  publicCards?: boolean | 'all'
}

export interface LineBalance {
  tierDistribution: Record<Difficulty, number>
  categoryDistribution: Record<CardCategory, number>
}

export const GENERATOR_CONFIG = {
    DIFFICULTY_LEVELS: {
      BEGINNER: { beginner: 0.9, easy: 0.1 },
      EASY: { beginner: 0.4, easy: 0.6 },
      MEDIUM: {beginner: 0.01, easy: 0.15, medium: 0.65, hard: 0.15 },
      HARD: { medium: 0.2, hard: 0.7, expert: 0.1 },
      EXPERT: { hard: 0.1, expert: 0.9 }
    },
    CARDPOOLSIZE_LIMITS: {
      SMALL: 100,
      MEDIUM: 200,
      LARGE: 300,
      XLARGE: 400
    },
    BALANCE_WEIGHTS: {
      tierSpread: 0.4,
      tagVariety: 0.3,
      timeDistribution: 0.3
    }
  } as const 

export type GeneratorDifficulty = keyof typeof GENERATOR_CONFIG.DIFFICULTY_LEVELS 