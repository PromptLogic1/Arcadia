import { UUID } from "crypto"
import { CardCategory, Difficulty, GameCategory } from "./game.types"

export interface BingoCard {
  id: UUID
  creator_id: string
  card_content: string
  card_explanation?: string
  card_tags: string[]
  card_type: CardCategory
  card_difficulty: Difficulty
  game_category: GameCategory
  votes: number
  is_public: boolean
  deleted_at?: string
  generated_by_ai: boolean
  created_at: string
  updated_at: string
}

// DTO for creating a new bingo card
export type CreateBingoCardDTO = Omit<
  BingoCard,
  'id' | 'creator_id' | 'votes' | 'created_at' | 'updated_at'
>

// Constants for validation
export const CONTENT_LENGTH_LIMIT = 255
export const EXPLANATION_LENGTH_LIMIT = 1000
export const MAX_TAGS = 5

// Helper function to validate card data
export const validateCardData = (card: Partial<BingoCard>) => {
  if (card.card_content && (card.card_content.length < 1 || card.card_content.length > CONTENT_LENGTH_LIMIT)) {
    return {
      isValid: false,
      error: `Content must be between 1 and ${CONTENT_LENGTH_LIMIT} characters`
    }
  }

  if (card.card_explanation && card.card_explanation.length > EXPLANATION_LENGTH_LIMIT) {
    return {
      isValid: false,
      error: `Explanation cannot exceed ${EXPLANATION_LENGTH_LIMIT} characters`
    }
  }

  if (card.card_tags && card.card_tags.length > MAX_TAGS) {
    return {
      isValid: false,
      error: `Maximum of ${MAX_TAGS} tags allowed`
    }
  }

  return { isValid: true }
} 