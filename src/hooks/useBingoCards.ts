import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@/src/store/hooks'
import { bingoCardService } from '@/src/store/services/bingocard-service'
import type { BingoCard, CreateBingoCardDTO } from '@/src/store/types/bingocard.types'
import type { GameCategory, CardCategory, Difficulty } from '@/src/store/types/game.types'
import {
  selectCards,
  selectSelectedCard,
  selectIsLoading,
  selectError
} from '@/src/store/selectors/bingocardsSelectors'
import {
  setSelectedCardId,
  clearSelectedCard
} from '@/src/store/slices/bingocardsSlice'

export function useBingoCards() {
  const dispatch = useAppDispatch()
  
  // Selectors
  const cards = useSelector(selectCards)
  const selectedCard = useSelector(selectSelectedCard)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

  // Card selection
  const selectCard = useCallback((cardId: string) => {
    dispatch(setSelectedCardId(cardId))
  }, [dispatch])

  const clearCard = useCallback(() => {
    dispatch(clearSelectedCard())
  }, [dispatch])

  // Service methods
  const initializeCards = useCallback(async () => {
    return bingoCardService.initializeCards()
  }, [])

  const createCard = useCallback(async (cardData: CreateBingoCardDTO) => {
    return bingoCardService.createCard(cardData)
  }, [])

  const getCardById = useCallback(async (cardId: string) => {
    return bingoCardService.getCardById(cardId)
  }, [])

  const updateCard = useCallback(async (cardId: string, updates: Partial<BingoCard>) => {
    return bingoCardService.updateCard(cardId, updates)
  }, [])

  const deleteCard = useCallback(async (cardId: string) => {
    return bingoCardService.deleteCard(cardId)
  }, [])

  const voteCard = useCallback(async (cardId: string) => {
    return bingoCardService.voteCard(cardId)
  }, [])

  const getCardsByGameCategory = useCallback(async (gameCategory: GameCategory) => {
    return bingoCardService.getCardsByGameCategory(gameCategory)
  }, [])

  const filterCards = useCallback(async (filters: {
    gameCategory?: GameCategory
    cardType?: CardCategory
    difficulty?: Difficulty
    searchTerm?: string
  }) => {
    return bingoCardService.filterCards(filters)
  }, [])

  return {
    // State
    cards,
    selectedCard,
    isLoading,
    error,

    // Actions
    selectCard,
    clearCard,

    // Service methods
    initializeCards,
    createCard,
    getCardById,
    updateCard,
    deleteCard,
    voteCard,
    getCardsByGameCategory,
    filterCards
  }
} 