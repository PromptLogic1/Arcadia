export type GameCategory = 
  | 'World of Warcraft'
  | 'Fortnite'
  | 'Minecraft'
  | 'Among Us'
  | 'Apex Legends'
  | 'League of Legends'
  | 'Overwatch'
  | 'Call of Duty: Warzone'
  | 'Valorant'

export type Difficulty = 
  | 'beginner'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'

export type CardCategory = 
  | 'collecting'
  | 'killing'
  | 'building'
  | 'escaping'
  | 'surviving'
  | 'winning'

export interface BingoBoard {
  id: string
  creator_id: string
  board_title: string
  board_description?: string
  board_size: number
  board_layoutbingocards: BingoBoardCell[] // Now properly typed
  board_tags: string[]
  board_game_type: GameCategory
  board_difficulty: Difficulty
  cloned_from?: string
  votes: number
  is_public: boolean
  deleted_at?: string
  generated_by_ai: boolean
  created_at: string
  updated_at: string
}

export interface BingoBoardCell {
  id: string
  text: string
  category: CardCategory
  difficulty: Difficulty
}

export interface CreateBingoBoardDTO {
  board_title: string
  board_description?: string
  board_size: number
  board_game_type: GameCategory
  board_difficulty: Difficulty

  is_public: boolean
  board_tags?: string[]
  generated_by_ai?: boolean
}

export interface UpdateBingoBoardDTO extends Partial<CreateBingoBoardDTO> {
  id: string
}

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
export const MAX_TAGS = 5 