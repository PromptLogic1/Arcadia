// =============================================================================
// CENTRALIZED TYPE SYSTEM - Single Source of Truth
// =============================================================================

// Database types are the source of truth (generated from actual DB schema)
export type {
  // Core database types
  Database,
  Tables,
  TablesInsert, 
  TablesUpdate,
  Enums,
  CompositeTypes,
  
  // Core enums and types
  BoardStatus,
  ChallengeStatus,
  GameCategory,        // <- Single source, from database
  QueueStatus,
  SessionStatus,
  SubmissionStatus,
  TagAction,
  TagStatus,
  TagType,
  UserRole,
  VisibilityType,
  VoteType,
  
  // Core composite types
  BoardCell,           // <- Database representation
  BoardSettings,
  SessionSettings,
  TagCategory,
  WinConditions,
  Json
} from '../../types/database.types'

// Alias for consistency (eliminate Difficulty vs DifficultyLevel confusion)
export type { DifficultyLevel as Difficulty } from '../../types/database.core'

// Application-specific product types
export * from './product.types'

// Import types we need to reference
import type { DifficultyLevel, GameCategory as DbGameCategory } from '../../types/database.core'

// Type aliases for internal use
type Difficulty = DifficultyLevel
type GameCategory = DbGameCategory

// =============================================================================
// APPLICATION LAYER TYPES (extend database types for business logic)
// =============================================================================

// Application representation of a bingo card (different from database BoardCell)
export interface BingoCard {
  id: string
  text: string
  difficulty: Difficulty  // Use aliased type
  category: string
  game: GameCategory     // Use database type
  description?: string
  tags?: string[]
  isCompleted?: boolean
  completedBy?: string
  completedAt?: Date
}

// =============================================================================
// CONSTANTS (derived from database types)
// =============================================================================

// Re-export database constants
export { Constants } from '../../types/database.types'

// Application constants derived from database types  
export const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert']

export const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  easy: 'bg-blue-100 text-blue-800 border-blue-200', 
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200'
}

export const GAME_CATEGORIES: GameCategory[] = [
  'All Games',
  'World of Warcraft', 
  'Fortnite',
  'Minecraft',
  'Among Us',
  'Apex Legends',
  'League of Legends',
  'Overwatch',
  'Call of Duty: Warzone',
  'Valorant'
]

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// API Response types
export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PaginationParams {
  page: number
  limit: number
  offset?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    pages: number
    current: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// =============================================================================
// APPLICATION-SPECIFIC INTERFACES
// =============================================================================

export interface BingoCardFilter {
  game?: GameCategory
  difficulty?: Difficulty
  category?: string
  search?: string
}

export interface BingoCardStats {
  total: number
  completed: number
  byDifficulty: Record<Difficulty, number>
  byCategory: Record<string, number>
}

// Default bingo card
export const DEFAULT_BINGO_CARD: Omit<BingoCard, 'id'> = {
  text: '',
  difficulty: 'medium',
  category: 'General',
  game: 'All Games',
  description: '',
  tags: [],
  isCompleted: false
} 