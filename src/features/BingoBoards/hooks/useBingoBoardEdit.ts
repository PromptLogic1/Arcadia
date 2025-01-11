import { useState, useCallback, useEffect } from 'react'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { useBingoCards } from '@/src/hooks/useBingoCards'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import type { BingoBoard } from '@/src/store/types/bingoboard.types'
import type { Difficulty } from '@/src/store/types/game.types'
import type { BingoCard } from '@/src/store/types/bingocard.types'
import { DEFAULT_CARD_ID, DEFAULT_BINGO_CARD } from '@/src/store/types/bingocard.types'
import { UUID } from 'crypto'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/src/store/store'
import { clearGrid } from '@/src/store/slices/bingocardsSlice'
import { bingoCardService } from '@/src/store/services/bingocard-service'
import { initializeGrid } from '@/src/store/slices/bingocardsSlice'
import { updateGridCard } from '@/src/store/slices/bingocardsSlice'
import { updateBoardLayoutId } from '@/src/store/slices/bingoboardSlice'

type FieldKey = 'title' | 'description' | 'tags'

export function useBingoBoardEdit(boardId: string) {
  const { boards, updateBoard } = useBingoBoards()
  const { getCardsByIds } = useBingoCards()
  const dispatch = useDispatch()
  const gridState = useSelector((state: RootState) => state.bingoCards.grid)
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [gridError, setGridError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  const validateField = useCallback((field: string, value: string | string[] | boolean): string | null => {
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

  const updateFormField = useCallback((field: string, value: string | string[] | boolean) => {
    const error = validateField(field, value)
    
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
  }, [validateField])

  const handleCardEdit = useCallback(async (index: number, content: string) => {
    dispatch(updateGridCard({ index, content }))
  }, [dispatch])

  const handleSave = useCallback(async () => {
    if (!board || !formData) return
    
    try {
      // Erst Board-Metadaten speichern
      await updateBoard(board.id, {
        ...board,
        board_title: formData.board_title,
        board_description: formData.board_description,
        board_tags: formData.board_tags,
        board_difficulty: formData.board_difficulty as Difficulty,
        is_public: formData.is_public
      })

      // Dann geänderte Karten speichern
      const updatedLayout = [...board.board_layoutbingocards]
      
      for (let i = 0; i < gridState.cards.length; i++) {
        const card = gridState.cards[i]
        if (!card) continue  // Skip undefined cards

        if (card.isNew) {
          const newCard = await bingoCardService.createCard({
            card_content: card.card_content,
            game_category: board.board_game_type,
            card_difficulty: board.board_difficulty,
            creator_id: board.creator_id as UUID,
            is_public: board.is_public,
            card_tags: [],
            card_type: 'collecting',
            generated_by_ai: false,
            deleted_at: undefined
          })

          if (!newCard) {
            throw new Error('Failed to create new card')
          }

          updatedLayout[i] = newCard.id
        } 
        else if (card.isEdited && card.originalId) {
          // Existierende Karte updaten
          await bingoCardService.updateCard(card.originalId, {
            card_content: card.card_content
          })
        }
      }

      // Layout updaten wenn nötig
      if (gridState.isDirty) {
        await bingoBoardService.updateBoardLayout(board.id, updatedLayout)
      }

      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update board')
      return false
    }
  }, [board, formData, gridState, updateBoard])

  const initializeBoardLayout = useCallback(() => {
    if (!board) return
    
    // Wenn kein Layout existiert, erstelle ein neues mit leeren Strings
    if (!board.board_layoutbingocards || board.board_layoutbingocards.length === 0) {
      const totalCells = board.board_size * board.board_size
      const defaultLayout = Array(totalCells).fill('')
      
      // Update board layout in database
      bingoBoardService.updateBoardLayout(board.id, defaultLayout)
      return defaultLayout
    }
    
    return board.board_layoutbingocards
  }, [board])

  const loadBingoBoardGrid = useCallback(async () => {
    if (!board) return
    
    setIsLoadingCards(true)
    setGridError(null)

    try {
      const cards = await bingoCardService.initializeGridCards(
        board.board_layoutbingocards,
        board.board_size
      )
      dispatch(initializeGrid({ size: board.board_size, cards }))
    } catch (error) {
      setGridError('Failed to load bingo cards')
      console.error('Error loading bingo cards:', error)
    } finally {
      setIsLoadingCards(false)
    }
  }, [board, dispatch])

  const handleCardSave = useCallback(async (
    index: number, 
    content: string
  ): Promise<void> => {
    if (!board) return

    const card = gridState.cards[index]
    if (!card) return

    try {
      if (card.id === '') {
        // Es ist ein Platzhalter
        if (content === DEFAULT_BINGO_CARD.card_content) {
          // Inhalt wurde nicht geändert
          return
        }

        // Neue Karte erstellen
        const newCard = await bingoCardService.createCard({
          card_content: content,
          game_category: board.board_game_type,
          card_difficulty: board.board_difficulty,
          creator_id: board.creator_id as UUID,
          is_public: board.is_public,
          card_tags: [],
          card_type: 'collecting',
          generated_by_ai: false
        })

        if (!newCard) {
          throw new Error('Failed to create new card')
        }

        // Layout im Store aktualisieren
        dispatch(updateBoardLayoutId({
          boardId: board.id as UUID,
          position: index,
          newCardId: newCard.id as UUID
        }))

      } else {
        // Existierende Karte aktualisieren
        await bingoCardService.updateCard(card.id, {
          card_content: content
        })
      }

      // Grid neu laden
      await loadBingoBoardGrid()

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save card')
    }
  }, [board, gridState, dispatch])

  // Cleanup when unmounting
  useEffect(() => {
    return () => {
      dispatch(clearGrid())
    }
  }, [dispatch])

  // Load grid cards when board changes
  useEffect(() => {
    loadBingoBoardGrid()
  }, [loadBingoBoardGrid])

  return {
    board,
    formData,
    setFormData,
    error,
    fieldErrors,
    gridCards: gridState.cards,
    isGridDirty: gridState.isDirty,
    gridSize: gridState.size,
    isLoadingCards,
    gridError,
    validateField,
    updateFormField,
    handleSave,
    loadBingoBoardGrid,
    handleCardEdit,
    handleCardSave
  }
} 