import { useState, useCallback } from 'react'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import type { BingoBoard } from '@/src/store/types/bingoboard.types'
import type { Difficulty } from '@/src/store/types/game.types'

type FieldKey = 'title' | 'description' | 'tags'

export function useBingoBoardEdit(boardId: string) {
  const { boards, updateBoard } = useBingoBoards()
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

  const handleSave = useCallback(async () => {
    if (!board || !formData) return
    setError(null)

    const validation = bingoBoardService.validateBoardConstraints({
      ...board,
      ...formData
    })

    if (!validation.isValid) {
      setError(validation.error || 'Invalid board data')
      return
    }

    try {
      await updateBoard(board.id, {
        ...board,
        board_title: formData.board_title,
        board_description: formData.board_description,
        board_tags: formData.board_tags,
        board_difficulty: formData.board_difficulty as Difficulty,
        is_public: formData.is_public
      })
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update board')
      return false
    }
  }, [board, formData, updateBoard])

  return {
    board,
    formData,
    setFormData,
    error,
    fieldErrors,
    validateField,
    updateFormField,
    handleSave,
  }
} 