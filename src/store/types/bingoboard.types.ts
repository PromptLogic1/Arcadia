import { UUID } from "crypto"
import { GameCategory, Difficulty } from "./game.types"

export interface BingoBoard {
  id: string
  creator_id: string
  board_title: string
  board_description?: string
  board_size: number
  board_layoutbingocards: UUID[]
  board_tags: string[]
  board_game_type: GameCategory
  board_difficulty: Difficulty
  cloned_from?: string
  votes?: number
  is_public: boolean
  deleted_at?: string
  generated_by_ai?: boolean
  created_at: string
  updated_at: string
}

// Add this type for board creation
export type CreateBingoBoardDTO = Omit<BingoBoard, 'id' | 'creator_id' | 'created_at' | 'updated_at' | 'board_layoutbingocards'> 

// Helper constants for validation
export const BOARD_SIZE_LIMITS = {
  MIN: 3,
  MAX: 6
} as const

export const TITLE_LENGTH_LIMITS = {
  MIN: 3,
  MAX: 50
} as const

export const DESCRIPTION_LENGTH_LIMIT = 255
export const TITLE_LENGTH_LIMIT = 50
export const MAX_TAGS = 5 