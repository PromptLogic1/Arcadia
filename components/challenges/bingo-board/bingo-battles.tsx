'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, PlusCircle } from 'lucide-react'
import { BoardCard } from './components/cards/BoardCard'
import { GAMES, type Game, type Board, isSet } from './components/shared/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import BingoBoardDetail from './BingoBoardDetail'

const SORT_OPTIONS = {
  NEWEST: 'newest',
  VOTES: 'votes',
} as const

type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS]

interface BingoBattlesProps {
  initialBoards?: Board[]
}

export default function BingoBattles({ initialBoards = [] }: BingoBattlesProps) {
  // Convert initialBoards votedBy from plain object to Set
  const processedInitialBoards = initialBoards.map(board => ({
    ...board,
    votedBy: new Set(board.votedBy)
  }))
  
  // Update state initialization with processed boards
  const [boards, setBoards] = useState<Board[]>(processedInitialBoards)
  const [filterGame, setFilterGame] = useState<Game>("All Games")
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.NEWEST)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [expandedBoardId, setExpandedBoardId] = useState<{ id: number | null, section: string | null }>({ id: null, section: null })
  const [bookmarkedBoards, setBookmarkedBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [supabase.auth])

  // Fetch boards
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/boards')
        if (!response.ok) {
          throw new Error('Failed to fetch boards')
        }
        const fetchedBoards: Board[] = await response.json()
        // Convert votedBy to Set for each board
        const processedBoards = fetchedBoards.map(board => ({
          ...board,
          votedBy: new Set(board.votedBy)
        }))
        setBoards(processedBoards)
      } catch (error) {
        console.error('Failed to fetch boards:', error)
        setError('Failed to load boards. Please try again later.')
        setBoards([])
      } finally {
        setIsLoading(false)
      }
    }

    if (boards.length === 0) {
      fetchBoards()
    }
  }, [boards.length])

  // Board actions
  const createNewBoard = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

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
      },
      difficulty: 'medium',
      isPublic: true,
    }
    setBoards(prevBoards => [newBoard, ...prevBoards])
    setExpandedBoardId({ id: newBoard.id, section: 'all' })
  }, [boards.length, isAuthenticated, router])

  const voteBoard = useCallback((boardId: number, userId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    
    setBoards(prevBoards => prevBoards.map(board => {
      if (board.id === boardId) {
        const hasVoted = isSet(board.votedBy) 
          ? board.votedBy.has(userId)
          : board.votedBy.includes(userId)
        
        const newVotedBy = new Set(board.votedBy)
        
        if (hasVoted) {
          // Remove vote
          newVotedBy.delete(userId)
          return { ...board, votes: board.votes - 1, votedBy: newVotedBy }
        } else {
          // Add vote
          newVotedBy.add(userId)
          return { ...board, votes: board.votes + 1, votedBy: newVotedBy }
        }
      }
      return board
    }))
  }, [isAuthenticated, router])

  const toggleBookmark = useCallback((boardId: number) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    
    setBoards(prevBoards => {
      const updatedBoards = prevBoards.map(board => 
        board.id === boardId ? { ...board, bookmarked: !board.bookmarked } : board
      )
      const updatedBookmarkedBoards = updatedBoards.filter(board => board.bookmarked)
      setBookmarkedBoards(updatedBookmarkedBoards)
      return updatedBoards
    })
  }, [isAuthenticated, router])

  const selectBoard = useCallback((board: Board, section: string) => {
    console.log('Selecting board:', board.id, 'Section:', section)
    setExpandedBoardId(current => {
      const newState = current.id === board.id && current.section === section 
        ? { id: null, section: null }
        : { id: board.id, section }
      console.log('New expanded state:', newState)
      return newState
    })
  }, [])

  // Add saveAsCopy function
  const saveAsCopy = useCallback((boardId: number) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    const originalBoard = boards.find(b => b.id === boardId)
    if (!originalBoard) return

    const newBoard: Board = {
      ...originalBoard,
      id: Date.now(),
      name: `Copy of ${originalBoard.name}`,
      bookmarked: false,
      votedBy: new Set(),
      votes: 0,
      creator: "CurrentUser", // Should be replaced with actual user
      clonedFrom: originalBoard.id,
      isPublic: false,
    }

    setBoards(prevBoards => [newBoard, ...prevBoards])
    setBookmarkedBoards(prev => [...prev, newBoard])
  }, [boards, isAuthenticated, router])

  // Filtered and sorted boards
  const sortedAndFilteredBoards = useMemo(() => {
    return boards
      .filter(board => {
        const matchesFilter = filterGame === "All Games" || board.game === filterGame
        const matchesSearch = board.name.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === SORT_OPTIONS.NEWEST) {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        }
        return b.votes - a.votes
      })
  }, [boards, filterGame, searchTerm, sortBy])

  // Render board card
  const renderBoardCard = useCallback((board: Board, section: 'bookmarked' | 'all') => {
    const debugInfo = () => {
      console.log('Expanded Board ID:', expandedBoardId, 'Current Board:', board.id, 'Section:', section)
    }
    debugInfo()

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
          section={section}
          onVote={voteBoard}
          onBookmark={toggleBookmark}
          onSelect={selectBoard}
          onSaveAsCopy={saveAsCopy}
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
    )
  }, [expandedBoardId, selectBoard, toggleBookmark, voteBoard, saveAsCopy])

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
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
            <Select value={filterGame} onValueChange={(value: Game) => setFilterGame(value)}>
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
    </div>
  )
}