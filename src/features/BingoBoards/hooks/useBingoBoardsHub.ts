import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { useAuth } from '@/src/hooks/useAuth'
import type { FilterState, CreateBoardFormData } from '../types'
import type { GameCategory, Difficulty } from '@/src/store/types/game.types'
import { CreateBingoBoardDTO } from '@/src/store/types/bingoboard.types'

// Hub hook for board management and filtering
export function useBingoBoardsHub() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { boards, createBoard } = useBingoBoards()
  
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [filterSelections, setFilterSelections] = useState<FilterState>({
    category: '__all__',
    difficulty: 'all',
    sort: 'newest',
    search: ''
  })

  const handleFilterChange = useCallback((type: string, value: string) => {
    setFilterSelections(prev => ({ ...prev, [type]: value }))
  }, [])

  const handleCreateBoard = useCallback(async (formData: CreateBoardFormData) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    
    try {
      const newBoard = await createBoard(formData as CreateBingoBoardDTO)
      if (newBoard) {
        setIsCreateFormOpen(false)
        router.push(`/challengehub/${newBoard.id}/edit`)
      }
    } catch (error) {
      console.error('Failed to create board:', error)
    }
  }, [isAuthenticated, router, createBoard])

  const filteredAndSortedBoards = useCallback(() => {
    if (!boards) return []
    
    // Filter boards
    const filtered = boards.filter(board => {
      if (filterSelections.category !== '__all__' && board.board_game_type !== filterSelections.category) {
        return false
      }
      if (filterSelections.difficulty !== 'all' && board.board_difficulty !== filterSelections.difficulty) {
        return false
      }
      if (filterSelections.search) {
        const searchTerm = filterSelections.search.toLowerCase()
        const searchableContent = [
          board.board_title,
          board.board_description,
          board.board_game_type,
          board.board_difficulty,
          ...(board.board_tags || []),
          String(board.board_size),
          String(board.votes || 0)
        ].map(item => (item || '').toLowerCase())
        return searchableContent.some(content => content.includes(searchTerm))
      }
      return true
    })

    // Sort filtered boards
    return [...filtered].sort((a, b) => {
      switch (filterSelections.sort) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc':
          return a.board_title.localeCompare(b.board_title)
        case 'name_desc':
          return b.board_title.localeCompare(a.board_title)
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [boards, filterSelections])

  return {
    boards: filteredAndSortedBoards(),
    isCreateFormOpen,
    filterSelections,
    handleFilterChange,
    handleCreateBoard,
    setIsCreateFormOpen,
  }
}

// Export base hook for other components
export { useBingoBoards } 