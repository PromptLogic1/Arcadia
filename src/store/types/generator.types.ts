import { GameCategory, CardCategory, Difficulty } from "./game.types"

export type CardSource = 'public' | 'private' | 'publicprivate'

export interface GeneratorSettings {
  difficulty: GeneratorDifficulty
  cardPoolSize: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS
  minVotes: number
  selectedCategories: CardCategory[]
  gameCategory: GameCategory
  cardSource: CardSource
}

export interface LineBalance {
  tierDistribution: Record<Difficulty, number>
  categoryDistribution: Record<CardCategory, number>
}

export const GENERATOR_CONFIG = {
    DIFFICULTY_LEVELS: {
      Beginner: { beginner: 0.9, easy: 0.1 },
      Easy: { beginner: 0.4, easy: 0.6 },
      Medium: {beginner: 0.01, easy: 0.15, medium: 0.65, hard: 0.15 },
      Hard: { medium: 0.2, hard: 0.7, expert: 0.1 },
      Expert: { hard: 0.1, expert: 0.9 }
    },
    CARDPOOLSIZE_LIMITS: {
      Small: 100,
      Medium: 200,
      Large: 300,
      XLarge: 400
    },
    BALANCE_WEIGHTS: {
      tierSpread: 0.4,
      tagVariety: 0.3,
      timeDistribution: 0.3
    }
  } as const 

export type GeneratorDifficulty = keyof typeof GENERATOR_CONFIG.DIFFICULTY_LEVELS 