import { useState, useCallback, useEffect } from 'react'
import type { BingoBoard, BingoCard, DifficultyLevel } from '@/src/lib/stores/types'
import { useBingoBoards, useBingoBoardsActions } from '@/src/lib/stores'
import { useBingoCards } from '@/src/lib/stores'
import { useAuth } from '@/src/lib/stores'

interface FormData {
  board_title: string
  board_description: string
  board_tags: string[]
  board_difficulty: DifficultyLevel
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
  initializeBoard: () => Promise<void>
}

type FieldKey = 'board_title' | 'board_description' | 'board_tags' | 'board_difficulty' | 'is_public';
type FieldValue = string | number | boolean | string[];

export function useBingoBoardEdit(boardId: string): BoardEditReturn {
  // State
  const [isLoadingBoard, setIsLoadingBoard] = useState(true)
  const [isLoadingCards, setIsLoadingCards] = useState(true)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [editingCard, setEditingCard] = useState<{ card: BingoCard; index: number } | null>(null)
  const [gridCards, setGridCards] = useState<BingoCard[]>([])

  // Use Zustand stores
  const { currentBoard, error: boardError } = useBingoBoards()
  const { cards, error: cardsError } = useBingoCards()
  const { userData } = useAuth()
  const { setError } = useBingoBoardsActions()
  
  const error = boardError || cardsError

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

  const createNewCard = async (updates: Partial<BingoCard>, index: number) => {
    try {
      if (!currentBoard || !userData?.id) {
        throw new Error('Board or user not found')
      }

      // Create a basic card structure - this will need to be expanded
      const newCard: BingoCard = {
        id: `card-${Date.now()}`, // Temporary ID generation
        card_content: updates.card_content || '',
        card_explanation: updates.card_explanation || null,
        card_type: updates.card_type || 'action',
        card_difficulty: updates.card_difficulty || 'medium',
        game_category: currentBoard.board_game_type,
        card_tags: updates.card_tags || [],
        creator_id: userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: updates.is_public || false,
        votes: 0,
        generated_by_ai: false
      }

      if (index >= 0) {
        const updatedCards = [...gridCards]
        updatedCards[index] = newCard
        setGridCards(updatedCards)
      }
    } catch (error) {
      console.error('Failed to create card:', error)
      setError(error instanceof Error ? error.message : 'Failed to create card')
    }
  }

  const updateExistingCard = async (updates: Partial<BingoCard>, index: number) => {
    try {
      if (!currentBoard) throw new Error('Board not found')
      if (!updates.id) throw new Error('Card ID is required')

      const currentCard = gridCards[index]
      if (!currentCard) throw new Error('Card not found')

      const updatedCard: BingoCard = {
        ...currentCard,
        ...updates,
        updated_at: new Date().toISOString()
      }

      if (index >= 0) {
        const updatedCards = [...gridCards]
        updatedCards[index] = updatedCard
        setGridCards(updatedCards)
      }
    } catch (error) {
      console.error('Failed to update card:', error)
      setError(error instanceof Error ? error.message : 'Failed to update card')
    }
  }

  const placeCardInGrid = (card: BingoCard, index: number) => {
    try {
      const updatedCards = [...gridCards]
      updatedCards[index] = card
      setGridCards(updatedCards)
    } catch (error) {
      console.error('Failed to place card in grid:', error)
      setError(error instanceof Error ? error.message : 'Failed to place card')
    }
  }

  const handleSave = useCallback(async () => {
    if (!currentBoard || !formData) return false
    try {
      // This will need to be implemented with proper Zustand actions
      console.log('Saving board changes:', formData)
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update board')
      return false
    }
  }, [currentBoard, formData, setError])

  const initializeBoard = useCallback(async () => {
    try {
      setIsLoadingBoard(true)
      setIsLoadingCards(true)

      // Initialize with proper board loading logic
      console.log('Loading board:', boardId)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load board')
    } finally {
      setIsLoadingBoard(false)
      setIsLoadingCards(false)
    }
  }, [boardId, setError])

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
    validateBingoCardField,
    initializeBoard
  }
} 