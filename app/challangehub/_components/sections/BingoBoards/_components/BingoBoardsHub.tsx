'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, PlusCircle } from 'lucide-react'
import { BoardCard } from './BoardCard'
import { GameCategory } from '@/src/store/types/game.types'
import { useAuth } from '@/src/hooks/useAuth'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { CreateBoardForm } from '@/components/challenges/bingo-board/components/Board/CreateBoardForm'
import type { BingoBoard, Difficulty } from '@/src/store/types/bingoboard.types'
import { GAMES } from '@/src/store/types/game.types'
import { BingoBoardDetail } from './BingoBoardDetail'

const SORT_OPTIONS = {
  NEWEST: 'newest',
  VOTES: 'votes',
} as const

type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS]

export default function BingoBoardsHub() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { 
    boards, 
    isLoading, 
    error, 
    createBoard, 
    voteBoard, 
    cloneBoard,
    selectedBoardId,
    selectBoard,
    clearBoard 
  } = useBingoBoards()
  
  const [filterGame, setFilterGame] = useState<GameCategory>("All Games")
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.NEWEST)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)

  // Filter and sort boards from Redux store
  const sortedAndFilteredBoards = useMemo(() => {
    return [...boards]
      .filter(board => {
        const matchesFilter = filterGame === "All Games" || board.board_game_type === filterGame
        const matchesSearch = board.board_title.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === SORT_OPTIONS.NEWEST) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        return (b.votes || 0) - (a.votes || 0)
      })
  }, [boards, filterGame, searchTerm, sortBy])

  // Get user's bookmarked boards
  const bookmarkedBoards = useMemo(() => {
    return boards.filter(board => board.is_public === false)
  }, [boards])

  // Render board card
  const renderBoardCard = useCallback((board: BingoBoard, section: 'bookmarked' | 'all') => {
    return (
      <motion.div 
        key={`${section}-${board.id}`} 
        layout 
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <BoardCard
          board={board}
          onVote={() => voteBoard(board.id)}
          onSelect={() => selectBoard(board.id)}
          onClone={() => cloneBoard(board.id)}
        />
      </motion.div>
    )
  }, [voteBoard, cloneBoard, selectBoard])

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

  // Rest of the component remains the same...
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* Game Filter */}
          <div className="w-full md:w-1/3">
            <Label htmlFor="filter-game" className="text-cyan-300 mb-2 block">Filter by Game:</Label>
            <Select value={filterGame} onValueChange={(value: GameCategory) => setFilterGame(value)}>
              <SelectTrigger className="w-full bg-gray-800 border-cyan-500 text-cyan-100">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                {GAMES.map((game) => (
                  <SelectItem key={game} value={game} className="text-cyan-100">
                    {game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="w-full md:w-1/3">
            <Label htmlFor="sort-by" className="text-cyan-300 mb-2 block">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-full bg-gray-800 border-cyan-500 text-cyan-100">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                <SelectItem value={SORT_OPTIONS.NEWEST} className="text-cyan-100">Newest</SelectItem>
                <SelectItem value={SORT_OPTIONS.VOTES} className="text-cyan-100">Most Votes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="w-full md:w-1/3">
            <Label htmlFor="search" className="text-cyan-300 mb-2 block">Search:</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-cyan-500" />
              <Input
                id="search"
                type="text"
                placeholder="Search boards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-gray-800 border-cyan-500 text-cyan-100 placeholder-cyan-300"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bookmarked Boards */}
      {bookmarkedBoards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="text-2xl font-bold text-cyan-400 mb-4">My Boards</h3>
          <div className="grid grid-cols-1 gap-4">
            {bookmarkedBoards.map(board => renderBoardCard(board, 'bookmarked'))}
          </div>
        </motion.div>
      )}

      {/* All Boards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="space-y-4"
      >
        <h3 className="text-2xl font-bold text-cyan-400 mb-4">All Boards</h3>
        <Button 
          onClick={() => setIsCreateFormOpen(true)} 
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Board
        </Button>
        <div className="grid grid-cols-1 gap-4">
          {sortedAndFilteredBoards.map(board => renderBoardCard(board, 'all'))}
        </div>
      </motion.div>

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
          onClose={clearBoard}
        />
      )}
    </div>
  )
}