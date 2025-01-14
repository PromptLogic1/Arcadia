import { useState, useCallback, useEffect } from 'react'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import { bingoCardService } from '@/src/store/services/bingocard-service'
import type { BingoBoard } from '@/src/store/types/bingoboard.types'
import type { Difficulty } from '@/src/store/types/game.types'
import { useSelector } from 'react-redux'
import { RootState } from '@/src/store/store'
import { BingoCard } from '@/src/store/types/bingocard.types'
import { clearCurrentBoard, setError } from '@/src/store/slices/bingoboardSlice'
import { store } from '@/src/store/store'
import { CreateBingoCardDTO, UpdateBingoCardDTO } from '@/src/store/types/bingocard.types'

interface FormData {
  board_title: string
  board_description: string
  board_tags: string[]
  board_difficulty: Difficulty
  is_public: boolean
}

interface BoardEditReturn {
  isLoadingBoard: boolean
  isLoadingCards: boolean
  error?: string | null
  currentBoard: BingoBoard | null
  formData: FormData | null
  setFormData: (data: FormData | ((prev: FormData | null) => FormData | null)) => void
  fieldErrors: Record<string, string>
  gridCards: BingoCard[]
  cards: BingoCard[]
  updateFormField: (field: string, value: FieldValue) => void
  handleSave: () => Promise<boolean>
  placeCardInGrid: (card: BingoCard, index: number) => void
  createNewCard: (formData: Partial<BingoCard>, index: number) => Promise<void>
  updateExistingCard: (updates: Partial<BingoCard>, index: number) => Promise<void>
  gridSize: number
  editingCard: { card: BingoCard; index: number } | null
  setEditingCard: (card: { card: BingoCard; index: number } | null) => void
  validateBingoCardField: (field: string, value: string | string[] | boolean) => string | null
}

type FieldKey = 'board_title' | 'board_description' | 'board_tags' | 'board_difficulty' | 'is_public';
type FieldValue = string | number | boolean | string[];

export function useBingoBoardEdit(boardId: string): BoardEditReturn {
  // First, declare all state
  const [isLoadingBoard, setIsLoadingBoard] = useState(true)
  const [isLoadingCards, setIsLoadingCards] = useState(true)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [editingCard, setEditingCard] = useState<{ card: BingoCard; index: number } | null>(null)

  // Then, get Redux state
  const currentBoard = useSelector((state: RootState) => state.bingoBoard.currentBoard)
  const gridCards = useSelector((state: RootState) => state.bingoCards.gridcards)
  const error = useSelector((state: RootState) => state.bingoBoard.error || state.bingoCards.error)
  const cards = useSelector((state: RootState) => state.bingoCards.cards)

  // Add auth state selector
  const authState = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (currentBoard) {
      setFormData({
        board_title: currentBoard.board_title,
        board_description: currentBoard.board_description || '',
        board_tags: currentBoard.board_tags || [],
        board_difficulty: currentBoard.board_difficulty,
        is_public: currentBoard.is_public,
      })
    }
  }, [currentBoard])

  const validateBingoBoardField = useCallback((field: string, value: FieldValue): string | null => {
    switch (field) {
      case 'board_title':
        if (typeof value === 'string' && (value.length < 3 || value.length > 50)) {
          return 'Title must be between 3 and 50 characters'
        }
        break
      case 'board_description':
        if (typeof value === 'string' && value.length > 255) {
          return 'Description cannot exceed 255 characters'
        }
        break
      case 'board_tags':
        if (Array.isArray(value) && value.length > 5) {
          return 'Maximum of 5 tags allowed'
        }
        break
    }
    return null
  }, [])

  const validateBingoCardField = useCallback((field: string, value: string | string[] | boolean): string | null => {
    switch (field) {
      case 'card_content':
        if (typeof value === 'string' && (value.length === 0 || value.length > 50)) {
          return 'Content must be between 1 and 50 characters'
        }
        break
      case 'card_explanation':
        if (typeof value === 'string' && value.length > 255) {
          return 'Explanation cannot exceed 255 characters'
        }
        break
      case 'card_tags':
        if (Array.isArray(value) && value.length > 5) {
          return 'Maximum of 5 tags allowed'
        }
        break
    }
    return null
  }, [])

  const updateFormField = useCallback((field: string, value: FieldValue) => {
    const error = validateBingoBoardField(field, value)
    
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      if (error) {
        newErrors[field as FieldKey] = error
      } else {
        delete newErrors[field as FieldKey]
      }
      return newErrors
    })
    
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null)
  }, [validateBingoBoardField])

  // Separate functions for card operations
  const createNewCard = async (updates: Partial<BingoCard>, index: number) => {
    try {
      if (!currentBoard || !authState.userdata?.id) {
        throw new Error('Board or user not found')
      }

      const createDTO: CreateBingoCardDTO = {
        card_content: updates.card_content || '',
        card_explanation: updates.card_explanation,
        card_type: updates.card_type || 'collecting',
        card_difficulty: updates.card_difficulty || 'medium',
        card_tags: updates.card_tags || [],
        game_category: currentBoard.board_game_type,
        creator_id: authState.userdata.id,
        is_public: updates.is_public || false,
        generated_by_ai: false
      }

      const newCard = await bingoCardService.createCard(createDTO)
      if (!newCard) throw new Error('Failed to create card')

      // If index is provided (creating directly in grid), update grid
      if (index >= 0) {
        const updatedCards = [...gridCards]
        updatedCards[index] = newCard
        bingoCardService.setGridCards(updatedCards)
      }
    } catch (error) {
      console.error('Failed to create card:', error)
    }
  }

  const updateExistingCard = async (updates: Partial<BingoCard>, index: number) => {
    try {
      if (!currentBoard) throw new Error('Board not found')
      if (!updates.id) throw new Error('Card ID is required')

      const currentCard = gridCards[index]
      if (!currentCard) throw new Error('Card not found')

      const updateDTO: UpdateBingoCardDTO = {
        card_content: updates.card_content || currentCard.card_content,
        card_explanation: updates.card_explanation,
        card_type: updates.card_type || currentCard.card_type,
        card_difficulty: updates.card_difficulty || currentCard.card_difficulty,
        card_tags: updates.card_tags || currentCard.card_tags,
        game_category: currentBoard.board_game_type,
        is_public: updates.is_public ?? currentCard.is_public,
        generated_by_ai: currentCard.generated_by_ai
      }

      const updatedCard = await bingoCardService.updateCard(updates.id, updateDTO)
      if (!updatedCard) throw new Error('Failed to update card')

      // Update grid if card is in grid
      if (index >= 0) {
        const updatedCards = [...gridCards]
        updatedCards[index] = updatedCard
        bingoCardService.setGridCards(updatedCards)
      }
    } catch (error) {
      console.error('Failed to update card:', error)
    }
  }

  const placeCardInGrid = (card: BingoCard, index: number) => {
    try {
      const updatedCards = [...gridCards]
      updatedCards[index] = card
      bingoCardService.setGridCards(updatedCards)
    } catch (error) {
      console.error('Failed to place card in grid:', error)
    }
  }

  const handleSave = useCallback(async () => {
    if (!currentBoard || !formData) return false
    try {
      const success = await bingoBoardService.saveBoardChanges(currentBoard.id, {
        ...currentBoard,
        board_title: formData.board_title,
        board_description: formData.board_description,
        board_tags: formData.board_tags,
        board_difficulty: formData.board_difficulty as Difficulty,
        is_public: formData.is_public
      })
      return success
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update board')
      return false
    }
  }, [currentBoard, formData])

  // Load board data
  useEffect(() => {
    const initializeBoard = async () => {
      setIsLoadingBoard(true)
      setIsLoadingCards(true)

      try {
        // 1. Load board and initialize cards
        await bingoBoardService.loadBoardForEditing(boardId)
        await bingoCardService.initializeCards()
        
      } catch (error) {
        store.dispatch(setError(error instanceof Error ? error.message : 'Failed to load board'))
      } finally {
        setIsLoadingBoard(false)
        setIsLoadingCards(false)
      }
    }

    initializeBoard()

    return () => {
      store.dispatch(clearCurrentBoard())
      bingoCardService.clearGridCards()
    }
  }, [boardId])

  return {
    isLoadingBoard,
    isLoadingCards,
    error,
    currentBoard,
    formData,
    setFormData,
    fieldErrors,
    gridCards,
    cards,
    updateFormField,
    handleSave,
    placeCardInGrid,
    createNewCard,
    updateExistingCard,
    gridSize: currentBoard?.board_size || 0,
    editingCard,
    setEditingCard,
    validateBingoCardField
  }
} 