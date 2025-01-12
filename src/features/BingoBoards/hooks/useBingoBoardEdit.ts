import { useState, useCallback, useEffect } from 'react'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { useBingoCards } from '@/src/hooks/useBingoCards'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import { bingoCardService } from '@/src/store/services/bingocard-service'
import type { BingoBoard } from '@/src/store/types/bingoboard.types'
import type { Difficulty } from '@/src/store/types/game.types'
import { UUID } from 'crypto'
import { useSelector } from 'react-redux'
import { RootState } from '@/src/store/store'
import { BingoCard } from '@/src/store/types/bingocard.types'
import { useRouter } from 'next/router'
import { clearCurrentBoard, setError } from '@/src/store/slices/bingoboardSlice'
import { store } from '@/src/store/store'

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
  handleCardEdit: (index: number, updates: BingoCard | Partial<BingoCard>) => void
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

  // Initialize formData when currentBoard changes
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

  const handleCardEdit = (index: number, updates: BingoCard | Partial<BingoCard>) => {
    try {
      // Ensure updates is a complete BingoCard
      if (!('id' in updates && 'card_content' in updates)) {
        throw new Error('Incomplete card data')
      }

      // Update the gridCards array directly
      const updatedCards = [...gridCards]
      updatedCards[index] = updates as BingoCard

      // Update the state with the new gridCards array
      bingoCardService.setGridCards(updatedCards)
    } catch (error) {
      console.error('Failed to update card:', error)
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
    const loadBoard = async () => {
      setIsLoadingBoard(true)
      setIsLoadingCards(true)
      try {
        await bingoBoardService.loadBoardForEditing(boardId)
        setIsLoadingBoard(false)
        // Add a small delay before loading cards to ensure board is loaded
        await new Promise(resolve => setTimeout(resolve, 100))
        await bingoCardService.initializeCards()
      } catch (error) {
        store.dispatch(setError(error instanceof Error ? error.message : 'Failed to load board'))
      } finally {
        setIsLoadingCards(false)
      }
    }
    
    loadBoard()
    
    return () => {
      store.dispatch(clearCurrentBoard())
      bingoCardService.clearGridCards()
    }
  }, [boardId])

  if (!currentBoard) {
    return {
      isLoadingBoard,
      isLoadingCards,
      error: 'Board not found',
      currentBoard: null,
      formData: null,
      setFormData,
      fieldErrors: {},
      gridCards: [],
      cards,
      updateFormField: () => {},
      handleSave: async () => false,
      handleCardEdit: async () => {},
      gridSize: 0,
      editingCard: null,
      setEditingCard: () => {},
      validateBingoCardField: () => null
    }
  }

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
    handleCardEdit,
    gridSize: currentBoard.board_size,
    editingCard,
    setEditingCard,
    validateBingoCardField
  }
} 