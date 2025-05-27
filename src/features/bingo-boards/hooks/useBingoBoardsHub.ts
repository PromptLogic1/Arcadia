import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { useAuth } from '@/src/hooks/useAuth'
import type { 
  GameCategory, 
  Difficulty, 
  BingoBoard,
  CreateBoardForm,
  BoardFilter
} from '@/types'
import { ROUTES } from '@/src/config/routes'

// Hub hook for board management and filtering
export function useBingoBoardsHub() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { boards } = useBingoBoards()
  
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [filterSelections, setFilterSelections] = useState<BoardFilter>({
    game_type: 'All Games',
    difficulty: 'all',
    sort: 'newest',
    search: ''
  })

  const handleFilterChange = useCallback((type: string, value: string) => {
    setFilterSelections(prev => ({ ...prev, [type]: value }))
  }, [])

  const handleCreateBoard = useCallback(async (formData: CreateBoardForm) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    
    try {
      // TODO: Implement board creation through proper API
      console.log('Board creation requested:', formData)
      setIsCreateFormOpen(false)
      // Temporary: redirect to board edit page
      // router.push(`/challengehub/${newBoard.id}`)
    } catch (error) {
      console.error('Failed to create board:', error)
    }
  }, [isAuthenticated, router])

  const filteredAndSortedBoards = useCallback(() => {
    if (!boards) return []
    
    // Filter boards
    const filtered = boards.filter(board => {
      if (filterSelections.game_type !== 'All Games' && board.game_type !== filterSelections.game_type) {
        return false
      }
      if (filterSelections.difficulty !== 'all' && board.difficulty !== filterSelections.difficulty) {
        return false
      }
      if (filterSelections.search) {
        const searchTerm = filterSelections.search.toLowerCase()
        const searchableContent = [
          board.title,
          board.description,
          board.game_type,
          board.difficulty,
          String(board.size || 0),
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
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case 'popular':
          return (b.votes || 0) - (a.votes || 0)
        case 'difficulty':
          const difficultyOrder = { 'beginner': 1, 'easy': 2, 'medium': 3, 'hard': 4, 'expert': 5 }
          return (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0)
        case 'size':
          return (a.size || 0) - (b.size || 0)
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
    })
  }, [boards, filterSelections])

  const handleBoardSelect = (boardId: string) => {
    router.push(`${ROUTES.CHALLENGE_HUB}/${boardId}/edit`)
  }

  return {
    boards: filteredAndSortedBoards(),
    isCreateFormOpen,
    filterSelections,
    handleFilterChange,
    handleCreateBoard,
    setIsCreateFormOpen,
    handleBoardSelect,
  }
}

// Export base hook for other components
export { useBingoBoards } 