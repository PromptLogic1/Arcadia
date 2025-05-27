// =============================================================================
// BINGO CARD SPECIFIC TYPES
// =============================================================================
// Proper card types that match component expectations and database schema

import type { Tables, DifficultyLevel, GameCategory } from '@/types/database.types'

// Base database card type
export type BingoCardDb = Tables<'bingo_cards'>

// Extended card type for components (maps database fields to expected component props)
export interface BingoCard {
  id: string
  card_content: string // maps to 'title' in DB
  card_explanation?: string // maps to 'description' in DB  
  card_difficulty: DifficultyLevel // maps to 'difficulty' in DB
  card_type: 'action' | 'completion' | 'location' | 'social'
  game_category: GameCategory // maps to 'game_type' in DB
  card_tags?: string[] // maps to 'tags' in DB
  is_public: boolean
  votes: number
  creator_id: string
  created_at: string
  updated_at?: string
}

// Utility functions to convert between DB and component types
export function dbCardToComponentCard(dbCard: BingoCardDb): BingoCard {
  return {
    id: dbCard.id,
    card_content: dbCard.title,
    card_explanation: dbCard.description || undefined,
    card_difficulty: dbCard.difficulty,
    card_type: 'action', // Default type, should be determined by logic
    game_category: dbCard.game_type,
    card_tags: dbCard.tags || undefined,
    is_public: dbCard.is_public || false,
    votes: dbCard.votes || 0,
    creator_id: dbCard.creator_id || '',
    created_at: dbCard.created_at || new Date().toISOString(),
    updated_at: dbCard.updated_at || undefined,
  }
}

export function componentCardToDbCard(card: Partial<BingoCard>): Partial<BingoCardDb> {
  return {
    id: card.id,
    title: card.card_content,
    description: card.card_explanation,
    difficulty: card.card_difficulty,
    game_type: card.game_category,
    tags: card.card_tags,
    is_public: card.is_public,
    votes: card.votes,
    creator_id: card.creator_id,
    created_at: card.created_at,
    updated_at: card.updated_at,
  }
}

// Card filtering and sorting types
export interface BingoCardFilter {
  game_category?: GameCategory
  difficulty?: DifficultyLevel
  card_type?: BingoCard['card_type']
  search?: string
  tags?: string[]
  is_public?: boolean
}

export interface BingoCardSort {
  field: 'created_at' | 'votes' | 'card_content' | 'card_difficulty'
  direction: 'asc' | 'desc'
} 