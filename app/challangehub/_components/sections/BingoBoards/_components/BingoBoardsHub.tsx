'use client'

import { useCallback, useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { PlusCircle } from 'lucide-react'
import { BingoBoardDetail } from './BingoBoardDetail'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { useAuth } from '@/src/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Filter } from '@/components/filter/filter'
import type { FilterType, FilterSelections } from '@/components/filter/types'
import { DIFFICULTY_OPTIONS, DEFAULT_SORT_OPTIONS } from '@/components/filter/types'
import { GameCategory, Difficulty, GAMES } from '@/src/store/types/game.types'
import { BoardCard } from './BoardCard'
import { CreateBoardForm } from '@/components/challenges/bingo-board/components/Board/CreateBoardForm'

export default function BingoBoardsHub() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { 
    boards, 
    createBoard,
    isLoading,
    error,
  } = useBingoBoards()
  
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)

  // Convert game categories to filter options format, ensuring unique keys
  const categoryOptions = [
    { value: '__all__', label: 'All Games' }, // Use a unique value for "All Games"
    ...Object.values(GAMES)
      .filter(game => game !== 'All Games') // Filter out "All Games" from GAMES enum
      .map(game => ({
        value: game,
        label: game
      }))
  ]

  // Filter state
  const [filterSelections, setFilterSelections] = useState<FilterSelections>({
    category: '__all__', // Update initial value to match the new "All Games" value
    difficulty: 'all',
    sort: 'newest',
    search: ''
  })

  const handleFilterChange = (type: FilterType, value: string) => {
    setFilterSelections(prev => ({ ...prev, [type]: value }))
  }

  // Apply filters to boards
  const filteredBoards = boards.filter(board => {
    // Category filter
    if (filterSelections.category !== '__all__' && board.board_game_type !== filterSelections.category) {
      return false
    }

    // Difficulty filter
    if (filterSelections.difficulty !== 'all' && board.board_difficulty !== filterSelections.difficulty) {
      return false
    }

    // Enhanced Search filter
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

      // Check if any of the content matches the search term
      return searchableContent.some(content => content.includes(searchTerm))
    }

    return true
  })

  // Sort boards
  const sortedBoards = [...filteredBoards].sort((a, b) => {
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

  // Get user's bookmarked boards
  const bookmarkedBoards = useMemo(() => {
    return boards.filter(board => board.is_public === false)
  }, [boards])

  const handleCreateBoard = useCallback(async (formData: {
    board_title: string
    board_description?: string
    board_size: number
    board_game_type: GameCategory
    board_difficulty: Difficulty
    is_public: boolean
  }) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    try {
      await createBoard({
        board_title: formData.board_title,
        board_description: formData.board_description || '',
        board_size: formData.board_size,
        board_game_type: formData.board_game_type,
        board_difficulty: formData.board_difficulty,
        board_tags: [],
        is_public: formData.is_public,
        votes: 0,
        generated_by_ai: false,
      })
      setIsCreateFormOpen(false)
    } catch (error) {
      console.error('Failed to create board:', error)
    }
  }, [isAuthenticated, router, createBoard])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Bingo Boards
        </h1>
        {isAuthenticated && (
          <Button
            onClick={() => setIsCreateFormOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Board
          </Button>
        )}
      </div>

      <Filter
        filterOptions={{
          categories: categoryOptions,
          difficulties: DIFFICULTY_OPTIONS,
          sortOptions: DEFAULT_SORT_OPTIONS,
          enableSearch: true
        }}
        selections={filterSelections}
        onFilterChange={handleFilterChange}
      />

      {/* All Boards */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-cyan-400">All Boards</h3>
        {sortedBoards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onClick={() => setSelectedBoardId(board.id)}
          />
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
          {error}
        </div>
      ) : null}

      <CreateBoardForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSubmit={handleCreateBoard}
      />

      {selectedBoardId && (
        <BingoBoardDetail 
          boardId={selectedBoardId} 
          onClose={() => setSelectedBoardId(null)}
        />
      )}
    </div>
  )
}