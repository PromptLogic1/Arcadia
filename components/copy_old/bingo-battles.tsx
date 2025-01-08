'use client'

import React from 'react'
import { BingoBoardDetail } from './BingoBoardDetail'
import { BoardCard } from '@/components/challenges/bingo-board/components/ui/BoardCard'
import { useBoards, useUser } from '@/hooks'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Filter } from 'lucide-react'
import { GAMES } from './types/types'
import type { Board } from './types/types'
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import { setSelectedBoard, setSelectedGame, setSelectedDifficulty } from '@/lib/store/slices/filterSlice'

const DIFFICULTIES = ['All', 'Beginner', 'Easy', 'Medium', 'Hard', 'Expert'] as const

const BingoBattles = () => {
  const { boards, bookmarkedBoards, handleVote, handleBookmark } = useBoards()
  const { user } = useUser()
  const dispatch = useAppDispatch()
  const { selectedBoard, selectedGame, selectedDifficulty } = useAppSelector(state => state.filter)

  const handleBoardSelect = (board: Board, section: string) => {
    dispatch(setSelectedBoard({ board, section }))
  }

  const handleBoardClose = () => {
    dispatch(setSelectedBoard({ board: null, section: null }))
  }

  // Wrap handleVote to match expected signature
  const handleVoteWrapper = async (boardId: number) => {
    if (user?.id) {
      await handleVote(boardId, user.id)
    }
  }

  // Wrap handleBookmark to match expected signature
  const handleBookmarkWrapper = async (boardId: number) => {
    if (user?.id) {
      await handleBookmark(boardId, user.id)
    }
  }

  // Filter boards based on selected game and difficulty
  const filteredBoards = boards.filter(board => {
    const gameMatch = selectedGame === 'All Games' || board.game === selectedGame
    const difficultyMatch = selectedDifficulty === 'All' || 
      board.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
    return gameMatch && difficultyMatch
  })

  const filteredBookmarkedBoards = bookmarkedBoards.filter(board => {
    const gameMatch = selectedGame === 'All Games' || board.game === selectedGame
    const difficultyMatch = selectedDifficulty === 'All' || 
      board.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
    return gameMatch && difficultyMatch
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-cyan-300">
            Bingo Battles
          </h1>
          <p className="text-cyan-300/70 mt-2">
            Create and play custom bingo boards
          </p>
        </div>

        {/* Create Board Button */}
        <Button 
          onClick={() => dispatch(setSelectedBoard({ 
            board: {
              id: 0, // Will be set by backend
              name: 'New Board',
              game: 'All Games',
              size: 5,
              timeLeft: 3600,
              players: 2,
              votedBy: new Set(),
              bookmarked: false,
              creator: user?.id || '',
              createdAt: new Date(),
              winConditions: { line: true, majority: false },
              difficulty: 'medium',
              isPublic: true
            }, 
            section: 'new' 
          }))}
          className="bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Board
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-cyan-300/70" />
          <span className="text-sm text-cyan-300/70">Filters:</span>
        </div>

        {/* Game Filter */}
        <Select
          value={selectedGame}
          onValueChange={(value) => dispatch(setSelectedGame(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Game" />
          </SelectTrigger>
          <SelectContent>
            {GAMES.map((game) => (
              <SelectItem key={game} value={game}>
                {game}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty Filter */}
        <Select
          value={selectedDifficulty}
          onValueChange={(value) => dispatch(setSelectedDifficulty(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((difficulty) => (
              <SelectItem key={difficulty} value={difficulty}>
                {difficulty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bookmarked Boards */}
      {filteredBookmarkedBoards.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-cyan-300 mb-4">
            Bookmarked Boards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookmarkedBoards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                _section="bookmarked"
                onVote={handleVoteWrapper}
                onBookmark={handleBookmarkWrapper}
                onSelect={handleBoardSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Boards */}
      <div>
        <h2 className="text-lg font-semibold text-cyan-300 mb-4">
          All Boards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              _section="all"
              onVote={handleVoteWrapper}
              onBookmark={handleBookmarkWrapper}
              onSelect={handleBoardSelect}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredBoards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-cyan-300/70">No boards available</p>
          </div>
        )}
      </div>

      {/* Board Detail Modal */}
      {selectedBoard.board && (
        <BingoBoardDetail
          board={selectedBoard.board}
          onBookmark={() => selectedBoard.board && handleBookmarkWrapper(selectedBoard.board.id)}
          onClose={handleBoardClose}
        />
      )}
    </div>
  )
}

export default BingoBattles