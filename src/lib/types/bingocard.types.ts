import type { DifficultyLevel, GameCategory } from '@/types/database.types'

export interface BingoCard {
  id: string
  title: string
  description?: string
  game_type: GameCategory
  difficulty: DifficultyLevel
  tags?: string[]
  is_public: boolean
  votes: number
  creator_id: string
  created_at: string
  updated_at: string
}

export interface BingoCardFilter {
  game?: GameCategory
  difficulty?: DifficultyLevel
  tags?: string[]
  search?: string
}

export const DEFAULT_BINGO_CARD: Omit<BingoCard, 'id' | 'creator_id' | 'created_at' | 'updated_at'> = {
  title: '',
  description: '',
  game_type: 'All Games',
  difficulty: 'medium',
  tags: [],
  is_public: true,
  votes: 0
} 