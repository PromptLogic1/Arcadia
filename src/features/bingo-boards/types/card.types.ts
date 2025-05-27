// =============================================================================
// BINGO CARD SPECIFIC TYPES
// =============================================================================
// Card types that align with database schema

import type { Tables, DifficultyLevel, GameCategory } from '@/types/database.types'

// Re-export the database-aligned card type from lib
export type { BingoCard, BingoCardFilter, DEFAULT_BINGO_CARD } from '@/lib/types/bingocard.types'

// Base database card type
export type BingoCardDb = Tables<'bingo_cards'>

// Additional card metadata for components
export interface BingoCardWithMetadata extends Tables<'bingo_cards'> {
  card_type?: 'action' | 'completion' | 'location' | 'social'
  total_uses?: number
  success_rate?: number
}

// Card filtering and sorting types for components
export interface ExtendedBingoCardFilter {
  game_category?: GameCategory
  difficulty?: DifficultyLevel
  card_type?: BingoCardWithMetadata['card_type']
  search?: string
  tags?: string[]
  is_public?: boolean
  creator_id?: string
  date_range?: {
    start: string
    end: string
  }
}

export interface BingoCardSort {
  field: 'created_at' | 'votes' | 'title' | 'difficulty'
  direction: 'asc' | 'desc'
}

// Card creation/editing types
export interface CreateBingoCardInput {
  title: string
  description?: string
  difficulty: DifficultyLevel
  game_type: GameCategory
  tags?: string[]
  is_public?: boolean
}

export interface UpdateBingoCardInput extends Partial<CreateBingoCardInput> {
  id: string
}

// Card statistics and analytics
export interface BingoCardStats {
  total_cards: number
  by_difficulty: Record<DifficultyLevel, number>
  by_game_type: Record<GameCategory, number>
  recent_cards: number
  popular_tags: Array<{ tag: string; count: number }>
} 