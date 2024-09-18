'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThumbsUp, Search, PlusCircle, Bookmark, BookmarkCheck, X, Users, Grid, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Mocking the BingoBoardDetail component for this example
interface BingoBoardDetailProps {
  board: Board;
  onClose: () => void;
  onBookmark: () => void;
}

const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({ board, onClose, onBookmark }) => (
  <div className="p-4">
    <h3 className="text-2xl font-bold mb-4">{board.name}</h3>
    <p>This is a placeholder for the BingoBoardDetail component.</p>
    <Button onClick={onClose} className="mt-4">Close</Button>
  </div>
)

// Define the Board type
interface Board {
  id: number;
  name: string;
  players: number;
  size: number;
  timeLeft: number;
  votes: number;
  game: string;
  createdAt: Date;
  votedBy: Set<string>;
  bookmarked: boolean;
  creator: string;
  avatar: string;
}

// Define available games
const games: string[] = [
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
]

export default function Component() {
  const [boards, setBoards] = useState<Board[]>([])
  const [filterGame, setFilterGame] = useState<string>("All Games")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null)
  const [bookmarkedBoards, setBookmarkedBoards] = useState<Board[]>([])

  useEffect(() => {
    // Simulating fetching boards from an API
    const fetchedBoards: Board[] = [
      {
        id: 1,
        name: "WoW Classic Bingo",
        players: 4,
        size: 5,
        timeLeft: 300,
        votes: 10,
        game: "World of Warcraft",
        createdAt: new Date("2023-06-01"),
        votedBy: new Set(),
        bookmarked: false,
        creator: "ElderScrolls",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 2,
        name: "Fortnite Season X Bingo",
        players: 2,
        size: 4,
        timeLeft: 600,
        votes: 5,
        game: "Fortnite",
        createdAt: new Date("2023-06-02"),
        votedBy: new Set(),
        bookmarked: false,
        creator: "BuildMaster",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 3,
        name: "Minecraft Speedrun Bingo",
        players: 3,
        size: 3,
        timeLeft: 450,
        votes: 15,
        game: "Minecraft",
        createdAt: new Date("2023-06-03"),
        votedBy: new Set(),
        bookmarked: false,
        creator: "CraftKing",
        avatar: "/placeholder.svg?height=32&width=32",
      },
    ]
    setBoards(fetchedBoards)
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
    }
    setBoards(prevBoards => [newBoard, ...prevBoards])
    setSelectedBoard(newBoard)
  }, [boards.length])

  const voteBoard = useCallback((boardId: number, userId: string) => {
    setBoards(prevBoards => prevBoards.map(board => {
      if (board.id === boardId) {
        if (!board.votedBy.has(userId)) {
          const newVotedBy = new Set(board.votedBy)
          newVotedBy.add(userId)
          return { ...board, votes: board.votes + 1, votedBy: newVotedBy }
        }
      }
      return board
    }))
  }, [])

  const toggleBookmark = useCallback((boardId: number) => {
    setBoards(prevBoards => prevBoards.map(board => {
      if (board.id === boardId) {
        const updatedBoard = { ...board, bookmarked: !board.bookmarked }
        setBookmarkedBoards(prev => updatedBoard.bookmarked
          ? [...prev, updatedBoard]
          : prev.filter(b => b.id !== boardId)
        )
        return updatedBoard
      }
      return board
    }))
  }, [])

  const selectBoard = useCallback((board: Board) => {
    setSelectedBoard(board)
  }, [])

  const closeBoardDetail = useCallback(() => {
    setSelectedBoard(null)
  }, [])

  const sortedAndFilteredBoards = useMemo(() => {
    return boards
      .filter(board =>
        (filterGame === "All Games" || board.game === filterGame) &&
        board.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "newest") {
          return b.createdAt.getTime() - a.createdAt.getTime()
        } else if (sortBy === "votes") {
          return b.votes - a.votes
        }
        return 0
      })
  }, [boards, filterGame, searchTerm, sortBy])

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen text-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6"
      >
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Bingo Battles</h2>
        <Button onClick={createNewBoard} className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white">
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
            <Select value={filterGame} onValueChange={setFilterGame}>
              <SelectTrigger className="w-full bg-gray-800 border-cyan-500 text-cyan-100">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                {games.map(game => (
                  <SelectItem key={game} value={game} className="text-cyan-100">{game}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/3">
            <Label htmlFor="sort-by" className="text-cyan-300 mb-2 block">Sort by:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full bg-gray-800 border-cyan-500 text-cyan-100">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                <SelectItem value="newest" className="text-cyan-100">Newest</SelectItem>
                <SelectItem value="votes" className="text-cyan-100">Most Votes</SelectItem>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkedBoards.map(board => (
              <Card key={board.id} className="bg-gray-800 border-2 border-cyan-500 hover:border-fuchsia-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={board.avatar} alt={board.creator} />
                      <AvatarFallback>{board.creator[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">{board.name}</CardTitle>
                      <CardDescription className="text-cyan-300">Created by {board.creator}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-cyan-500 text-white">{board.game}</Badge>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-cyan-400 mr-2" />
                      <span className="text-cyan-100">{board.players}</span>
                    </div>
                    <div className="flex items-center">
                      <Grid className="h-5 w-5 text-cyan-400 mr-2" />
                      <span className="text-cyan-100">{board.size}x{board.size}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-cyan-400 mr-2" />
                      <span className="text-cyan-100">
                        {Math.floor(board.timeLeft / 60)}:{(board.timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => selectBoard(board)} className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white">
                    View
                  </Button>
                </CardContent>
              </Card>
            ))}
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
        {sortedAndFilteredBoards.map(board => (
          <motion.div
            key={board.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-800 border-2 border-cyan-500 hover:border-fuchsia-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={board.avatar} alt={board.creator} />
                    <AvatarFallback>{board.creator[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">{board.name}</CardTitle>
                    <CardDescription className="text-cyan-300">Created by {board.creator}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-cyan-500 text-white">{board.game}</Badge>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-cyan-400 mr-2" />
                    <span className="text-cyan-100">{board.players}</span>
                  </div>
                  <div className="flex items-center">
                    <Grid className="h-5 w-5 text-cyan-400 mr-2" />
                    <span className="text-cyan-100">{board.size}x{board.size}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-cyan-400 mr-2" />
                    <span className="text-cyan-100">
                      {Math.floor(board.timeLeft / 60)}:{(board.timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => voteBoard(board.id, "user123")} className="bg-cyan-500 text-white hover:bg-cyan-600">
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {board.votes}
                  </Button>
                  <Button onClick={() => toggleBookmark(board.id)} variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                    {board.bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  </Button>
                  <Button onClick={() => selectBoard(board)} className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white">
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedBoard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 rounded-lg shadow-xl border-2 border-cyan-500">
              <Button
                className="absolute top-4 right-4 z-10"
                variant="ghost"
                onClick={closeBoardDetail}
              >
                <X className="h-6 w-6 text-cyan-400" />
              </Button>
              <BingoBoardDetail
                board={selectedBoard}
                onClose={closeBoardDetail}
                onBookmark={() => toggleBookmark(selectedBoard.id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
