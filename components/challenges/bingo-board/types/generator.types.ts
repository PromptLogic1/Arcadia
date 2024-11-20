export interface GeneratorSettings {
  boardSize: 3 | 4 | 5 | 6
  difficulty: {
    easy: number
    normal: number
    hard: number
  }
  tags: Set<string>
  timeLimit?: number
}

export interface GeneratorStats {
  generationTime: number
  attempts: number
  balanceScore: number
}

export interface BalanceConfig {
  maxSameTierPerLine: number
  minDifferentTags: number
  targetTimeSpread: number
}

// Tier-Definitionen für die Schwierigkeitsgrade
export type Tier = 1 | 2 | 3 | 4 | 5

export interface TierDistribution {
  [key: string]: {
    [key: string]: number
  }
}

// Generierungs-Modi
export type GenerationMode = 'quick' | 'custom'

// Balance-Score Gewichtungen
export interface BalanceWeights {
  tierSpread: number
  tagVariety: number
  timeDistribution: number
}

export interface Template {
  id: string
  text: string
  tags: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  source: 'custom' | 'generated'
  createdAt: string
}

export interface UseBoardGenerator {
  templates: Template[]
  selectedTags: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  generatedTemplates: Template[]
  addTemplate: (template: Template) => void
  removeTemplate: (id: string) => void
  setSelectedTags: (tags: string[]) => void
  setDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void
  generateTemplates: (options: {
    tags: string[]
    difficulty: string
    count: number
  }) => Promise<void>
} 