import type { GameCategory, Difficulty } from '@/src/store/types/game.types'

// Gemeinsame Types für alle Bingo-Komponenten
export interface BingoBoardComponentProps {
  boardId?: string
  onClose?: () => void
}

export interface FilterState {
  category: string
  difficulty: string
  sort: string
  search: string
}

export interface CreateBoardFormData {
  board_title: string
  board_description?: string
  board_size: number
  board_game_type: GameCategory
  board_difficulty: Difficulty
  board_tags: string[]
  is_public: boolean
} 