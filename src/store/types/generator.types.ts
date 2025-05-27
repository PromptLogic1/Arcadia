import type { GameCategory, DifficultyLevel } from '@/types/database.types'

export type CardCategory = 
  | 'action'
  | 'achievement' 
  | 'collection'
  | 'combat'
  | 'exploration'
  | 'social'
  | 'crafting'
  | 'quest'
  | 'misc'

export const CARD_CATEGORIES: CardCategory[] = [
  'action',
  'achievement',
  'collection', 
  'combat',
  'exploration',
  'social',
  'crafting',
  'quest',
  'misc'
]

export interface GeneratorSettings {
  gameCategory: GameCategory
  difficulty: DifficultyLevel
  cardPoolSize: 'Small' | 'Medium' | 'Large'
  categories: CardCategory[]
  allowDuplicates: boolean
  enableCustomCards: boolean
  gridSize: number
}

export interface GeneratorOptions {
  gameCategory: GameCategory
  difficulty: DifficultyLevel
  excludeCategories?: CardCategory[]
  includeCategories?: CardCategory[]
  customPrompts?: string[]
  seed?: string
}

export interface GeneratedCard {
  id: string
  text: string
  category: CardCategory
  difficulty: DifficultyLevel
  gameCategory: GameCategory
  tags: string[]
  isCustom: boolean
  generatedAt: Date
}

export interface GenerationResult {
  cards: GeneratedCard[]
  metadata: {
    totalGenerated: number
    duplicatesRemoved: number
    categoriesUsed: CardCategory[]
    generationTime: number
    seed: string
  }
}

export const GENERATOR_CONFIG = {
  CARDPOOLSIZE_LIMITS: {
    Small: { min: 25, max: 50, recommended: 35 },
    Medium: { min: 50, max: 100, recommended: 75 },
    Large: { min: 100, max: 500, recommended: 200 },
  },
  GRID_SIZES: [3, 4, 5, 6, 7] as const,
  DEFAULT_GRID_SIZE: 5,
  MAX_CUSTOM_CARDS: 10,
  MIN_CARDS_PER_CATEGORY: 3,
} as const

export interface GeneratorState {
  isGenerating: boolean
  progress: number
  currentStep: string
  error: string | null
  lastGenerated: GenerationResult | null
}

export interface GeneratorConfig {
  apiEndpoint: string
  maxRetries: number
  timeout: number
  batchSize: number
} 