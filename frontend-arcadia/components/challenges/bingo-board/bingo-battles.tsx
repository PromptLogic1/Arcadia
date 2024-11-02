'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, PlusCircle } from 'lucide-react'
import BingoBoardDetail from './BingoBoardDetail'
import { BoardCard } from './components/cards/BoardCard'
import { Board } from './components/shared/types'

const GAMES = [
  "All Games",
  "World of Warcraft",
  "Fortnite",
  "Minecraft",
  "Among Us",
  "Apex Legends",
  "League of Legends",
  "Overwatch",
  "Call of Duty: Warzone",
  "Valorant",
] as const

type Game = typeof GAMES[number]

const SORT_OPTIONS = {
  NEWEST: 'newest',
  VOTES: 'votes',
} as const

type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS]

export default function BingoBattles() {
  const [boards, setBoards] = useState<Board[]>([])
  const [filterGame, setFilterGame] = useState<Game>("All Games")
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.NEWEST)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [expandedBoardId, setExpandedBoardId] = useState<{ id: number | null, section: string | null }>({ id: null, section: null });
  const [bookmarkedBoards, setBookmarkedBoards] = useState<Board[]>([])

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await fetch('/api/boards')
        const fetchedBoards: Board[] = await response.json()
        setBoards(fetchedBoards)
      } catch (error) {
        console.error('Failed to fetch boards:', error)
      }
    }
    fetchBoards()
  }, [])

  const createNewBoard = useCallback(() => {
    const newBoard: Board = {
      id: Date.now(),
      name: `Bingo Board ${boards.length + 1}`,
      players: 0,
      size: 5,
      timeLeft: 300,
      votes: 0,
      game: "World of Warcraft",
      createdAt: new Date(),
      votedBy: new Set(),
      bookmarked: false,
      creator: "NewUser",
      avatar: "/placeholder.svg?height=32&width=32",
      winConditions: {
        line: true,
        majority: false
      }
    }
    setBoards(prevBoards => [newBoard, ...prevBoards])
    setExpandedBoardId({ id: newBoard.id, section: 'all' })
  }, [boards.length])

  const voteBoard = useCallback((boardId: number, userId: string) => {
    setBoards(prevBoards => prevBoards.map(board => {
      if (board.id === boardId && !board.votedBy.has(userId)) {
        const newVotedBy = new Set(board.votedBy)
        newVotedBy.add(userId)
        return { ...board, votes: board.votes + 1, votedBy: newVotedBy }
      }
      return board
    }))
  }, [])

  const toggleBookmark = useCallback((boardId: number) => {
    setBoards(prevBoards => {
      const updatedBoards = prevBoards.map(board => 
        board.id === boardId ? { ...board, bookmarked: !board.bookmarked } : board
      )
      const updatedBookmarkedBoards = updatedBoards.filter(board => board.bookmarked)
      setBookmarkedBoards(updatedBookmarkedBoards)
      return updatedBoards
    })
  }, [])

  const selectBoard = useCallback((board: Board, section: string) => {
    setExpandedBoardId(current => 
      current.id === board.id && current.section === section 
        ? { id: null, section: null }
        : { id: board.id, section }
    );
  }, []);

  const sortedAndFilteredBoards = useMemo(() => {
    return boards
      .filter(board =>
        (filterGame === "All Games" || board.game === filterGame) &&
        board.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === SORT_OPTIONS.NEWEST) {
          return b.createdAt.getTime() - a.createdAt.getTime()
        } else if (sortBy === SORT_OPTIONS.VOTES) {
          return b.votes - a.votes
        }
        return 0
      })
  }, [boards, filterGame, searchTerm, sortBy])

  const renderBoardCard = useCallback((board: Board, section: 'bookmarked' | 'all') => (
    <motion.div key={`${section}-${board.id}`} layout className="w-full">
      <BoardCard
        board={board}
        section={section}
        onVote={voteBoard}
        onBookmark={toggleBookmark}
        onSelect={selectBoard}
      />
      <AnimatePresence>
        {expandedBoardId.id === board.id && expandedBoardId.section === section && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-800 border-2 border-t-0 border-cyan-500 rounded-b-lg overflow-hidden"
          >
            <BingoBoardDetail
              board={board}
              onBookmark={() => toggleBookmark(board.id)}
              onClose={() => setExpandedBoardId({ id: null, section: null })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  ), [expandedBoardId, selectBoard, toggleBookmark, voteBoard]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <motion.div
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Bingo Battles
        </h2>
        <Button 
          onClick={createNewBoard} 
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Board
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/3">
            <Label htmlFor="filter-game" className="text-cyan-300 mb-2 block">Filter by Game:</Label>
            <Select value={filterGame} onValueChange={(value: Game) => setFilterGame(value)}>
              <SelectTrigger className="w-full bg-gray-800 border-cyan-500 text-cyan-100">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                {GAMES.map(game => (
                  <SelectItem key={game} value={game} className="text-cyan-100">{game}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="space-y-4"
      >
        <h3 className="text-2xl font-bold text-cyan-400 mb-4">All Boards</h3>
        <div className="grid grid-cols-1 gap-4">
          {sortedAndFilteredBoards.map(board => renderBoardCard(board, 'all'))}
        </div>
      </motion.div>
    </div>
  )
}