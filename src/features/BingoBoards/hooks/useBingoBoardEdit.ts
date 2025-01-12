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

type FieldKey = 'title' | 'description' | 'tags'

export function useBingoBoardEdit(boardId: string) {
  const currentBoard = useSelector((state: RootState) => state.bingoBoard.currentBoard)
  const gridCards = useSelector((state: RootState) => state.bingoCards.gridcards)
  const isLoading = useSelector((state: RootState) => 
    state.bingoBoard.isLoading || state.bingoCards.isLoading
  )
  const error = useSelector((state: RootState) => 
    state.bingoBoard.error || state.bingoCards.error
  )

  // Initialize form data when currentBoard changes
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

  if (isLoading) {
    return { isLoading: true }
  }

  if (!currentBoard) {
    return { error: 'Board not found' }
  }

  // Load board data
  useEffect(() => {
    bingoBoardService.loadBoardForEditing(boardId)
    return () => {
      store.dispatch(clearCurrentBoard())
      bingoCardService.clearGridCards()
    }
  }, [boardId])

  const { boards, updateBoard } = useBingoBoards()
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string
    description?: string
    tags?: string
  }>({})

  const board = boards.find(b => b.id === boardId)
  
  const [formData, setFormData] = useState(board ? {
    board_title: board.board_title,
    board_description: board.board_description || '',
    board_tags: board.board_tags || [],
    board_difficulty: board.board_difficulty,
    is_public: board.is_public,
  } : null)

  // Field validation
  const validateBingoBoardField = useCallback((field: string, value: string | string[] | boolean): string | null => {
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

  // Add new validation function for card fields
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

  const updateFormField = useCallback((field: string, value: string | string[] | boolean) => {
    const error = validateBingoBoardField(field, value)
    
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      const key = field.replace('board_', '') as FieldKey
      
      if (error) {
        newErrors[key] = error
      } else {
        delete newErrors[key]
      }
      return newErrors
    })
    
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null)
  }, [validateBingoBoardField])

  // Handle card editing
  const handleCardEdit = useCallback(async (index: number, updates: Partial<BingoCard>) => {
    if (!board) return

    try {
      setIsLoadingCards(true)
      const currentCard = gridCards[index]
      if (!currentCard) return

      if (currentCard.id === '') {
        // Create new card
        const newCard = await bingoCardService.createCard({
          ...updates,
          game_category: board.board_game_type,
          creator_id: board.creator_id as UUID,
          generated_by_ai: false,
          is_public: updates.is_public ?? false,
          card_content: updates.card_content ?? '',
          card_type: updates.card_type ?? 'collecting',
          card_difficulty: updates.card_difficulty ?? 'medium',
          card_tags: updates.card_tags ?? []
        })

        if (!newCard) throw new Error('Failed to create card')
        await bingoCardService.updateGridCard(index, newCard)

      } else {
        // Update existing card
        const updatedCard = await bingoCardService.updateCard(currentCard.id, updates)
        if (updatedCard) {
          await bingoCardService.updateGridCard(index, updatedCard)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save card')
    } finally {
      setIsLoadingCards(false)
    }
  }, [board, gridCards])

  // Save board metadata
  const handleSave = useCallback(async () => {
    if (!board || !formData) return false
    try {
      const success = await bingoBoardService.saveBoardChanges(board.id, {
        ...board,
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
  }, [board, formData])

  return {
    board,
    formData,
    setFormData,
    error,
    fieldErrors,
    gridCards,
    isLoadingCards,
    validateField: validateBingoBoardField,
    updateFormField,
    handleSave,
    handleCardEdit,
    gridSize: board?.board_size || 0
  }
} 