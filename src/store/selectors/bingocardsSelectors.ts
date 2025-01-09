import { RootState } from '../store'
import type { BingoCard } from '../types/bingocard.types'
import type { GameCategory, CardCategory, Difficulty } from '../types/game.types'

// Base selectors
export const selectBingoCardsState = (state: RootState) => state.bingoCards

// Derived selectors
export const selectCards = (state: RootState): BingoCard[] => 
  selectBingoCardsState(state).cards

export const selectSelectedCardId = (state: RootState): string | null => 
  selectBingoCardsState(state).selectedCardId

export const selectIsLoading = (state: RootState): boolean => 
  selectBingoCardsState(state).isLoading

export const selectError = (state: RootState): string | null => 
  selectBingoCardsState(state).error

// Computed selectors
export const selectSelectedCard = (state: RootState): BingoCard | null => {
  const cards = selectCards(state)
  const selectedId = selectSelectedCardId(state)
  return selectedId ? cards.find(card => card.id === selectedId) ?? null : null
} 

// Add these new selectors

export const selectCardsByGameCategory = (state: RootState, gameCategory: GameCategory): BingoCard[] => 
  selectCards(state).filter(card => card.game_category === gameCategory)

export const selectPublicCards = (state: RootState): BingoCard[] =>
  selectCards(state).filter(card => card.is_public)

export const selectCardsByType = (state: RootState, cardType: CardCategory): BingoCard[] =>
  selectCards(state).filter(card => card.card_type === cardType)

export const selectCardsByDifficulty = (state: RootState, difficulty: Difficulty): BingoCard[] =>
  selectCards(state).filter(card => card.card_difficulty === difficulty)

// Complex selector for filtered cards
export const selectFilteredCards = (
  state: RootState,
  filters: {
    gameCategory?: GameCategory
    cardType?: CardCategory
    difficulty?: Difficulty
    searchTerm?: string
  }
): BingoCard[] => {
  return selectCards(state).filter(card => {
    if (filters.gameCategory && filters.gameCategory !== 'All Games' && card.game_category !== filters.gameCategory) return false
    if (filters.cardType && card.card_type !== filters.cardType) return false
    if (filters.difficulty && card.card_difficulty !== filters.difficulty) return false
    if (filters.searchTerm && !card.card_content.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false
    return true
  })
} 