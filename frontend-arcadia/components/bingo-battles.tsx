'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Share2, Monitor, Save, Upload, Clock, Volume2, VolumeX, Users, PlusCircle, Trophy, Play, Grid, Lock, HelpCircle, Edit2, X, Check, RefreshCw, Download, ChevronDown, ChevronUp, ThumbsUp, GamepadIcon, Menu, Copy, Puzzle, Zap, Target, Bookmark, BookmarkCheck } from 'lucide-react'

import BingoBoardDetail from "@/components/bingo-battles/BingoBoardDetail"
import NeonButton from "@/components/ui/NeonButton"

const colorPalette = [
  { name: 'Cyan', color: 'bg-cyan-500', hoverColor: 'hover:bg-cyan-600' },
  { name: 'Fuchsia', color: 'bg-fuchsia-500', hoverColor: 'hover:bg-fuchsia-600' },
  { name: 'Lime', color: 'bg-lime-500', hoverColor: 'hover:bg-lime-600' },
  { name: 'Yellow', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600' },
  { name: 'Red', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
  { name: 'Blue', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { name: 'Green', color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
  { name: 'Purple', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
]

const wowChallenges = [
  "Defeat the Lich King",
  "Collect 10 Peacebloom",
  "Complete a Mythic+ dungeon",
  "Win a PvP battleground",
  "Tame a rare pet",
  "Craft an epic item",
  "Reach level 60",
  "Defeat Ragnaros",
  "Complete a raid",
  "Explore all zones in Azeroth",
  "Earn 1000 gold",
  "Defeat a world boss",
  "Complete a daily quest",
  "Win a duel",
  "Earn an achievement",
  "Collect a mount",
  "Complete a timewalking dungeon",
  "Defeat C'Thun",
  "Win an arena match",
  "Collect all dragon aspects",
  "Complete the Darkmoon Faire",
  "Defeat Deathwing",
  "Earn exalted reputation",
  "Complete a scenario",
  "Defeat the Jailer"
]

const games = [
  "All Games",
  "Elden Ring",
  "World of Warcraft",
  "Fortnite",
  "Cyberpunk 2077"
]

const challenges = [
  { name: "Bingo Battles", icon: <Grid className="w-6 h-6" />, description: "Create and play custom bingo boards" },
  { name: "Speed Runs", icon: <Zap className="w-6 h-6" />, description: "Race against the clock in timed challenges" },
  { name: "Achievement Hunt", icon: <Trophy className="w-6 h-6" />, description: "Compete to unlock the most achievements" },
  { name: "Puzzle Quests", icon: <Puzzle className="w-6 h-6" />, description: "Solve intricate puzzles and riddles" },
]

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-500 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2 text-2xl font-bold text-cyan-400">
          <GamepadIcon className="h-8 w-8" />
          <span className="font-extrabold tracking-tight">Arcadia</span>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">Home</a>
          <a href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">Games & Challenges</a>
          <a href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">Community</a>
          <a href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">About</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Button className="hidden md:flex bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-semibold">
            <Download className="mr-2 h-4 w-4" />
            Download App
          </Button>
        </div>
        <Button
          className="md:hidden"
          variant="ghost"
          size="icon"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>
    </header>
  )
}

const Footer = () => {
  return (
    <footer className="w-full border-t border-cyan-500 bg-gray-900 py-8">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <GamepadIcon className="h-8 w-8 text-cyan-400" />
          <p className="text-lg text-cyan-400 font-semibold">© 2023 Arcadia. All rights reserved.</p>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-lg text-cyan-200 hover:text-cyan-400 transition-colors">Privacy Policy</a>
          <a href="#" className="text-lg text-cyan-200 hover:text-cyan-400 transition-colors">Terms of Service</a>
          <a href="#" className="text-lg text-cyan-200 hover:text-cyan-400 transition-colors">Contact Us</a>
        </div>
      </div>
    </footer>
  )
}

export function BingoBattles() {
  const [boards, setBoards] = useState([
    { id: 1, name: "WoW Classic Bingo", players: 4, size: 5, timeLeft: 300, votes: 10, game: "World of Warcraft", createdAt: new Date("2023-06-01"), votedBy: new Set(), bookmarked: false },
    { id: 2, name: "Raid Night Bingo", players: 2, size: 4, timeLeft: 600, votes: 5, game: "World of Warcraft", createdAt: new Date("2023-06-02"), votedBy: new Set(), bookmarked: false },
    { id: 3, name: "Dungeon Crawl Bingo", players: 3, size: 3, timeLeft: 450, votes: 15, game: "Elden Ring", createdAt: new Date("2023-06-03"), votedBy: new Set(), bookmarked: false },
  ])
  const [expandedBoard, setExpandedBoard] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState("newest")
  const [filterGame, setFilterGame] = useState("All Games")
  const [currentUserId, setCurrentUserId] = useState("user1") // Simulating a logged-in user
  const [selectedChallenge, setSelectedChallenge] = useState("Bingo Battles")
  const [savedBoards, setSavedBoards] = useState<typeof boards>([])

  const toggleBoardExpansion = (boardId: number) => {
    setExpandedBoard(expandedBoard === boardId ? null : boardId)
  }

  const createNewBoard = () => {
    const newBoard = {
      id: boards.length + 1,
      name: "New Bingo Board",
      players: 2,
      size: 5,
      timeLeft: 300,
      votes: 0,
      game: "All Games",
      createdAt: new Date(),
      votedBy: new Set(),
      bookmarked: false
    }
    setBoards([...boards, newBoard])
    setExpandedBoard(newBoard.id)
  }

  const voteBoard = (boardId: number) => {
    setBoards(boards.map(board => {
      if (board.id === boardId && !board.votedBy.has(currentUserId)) {
        const newVotedBy = new Set(board.votedBy)
        newVotedBy.add(currentUserId)
        return { ...board, votes: board.votes + 1, votedBy: newVotedBy }
      }
      return board
    }))
  }

  const toggleBookmark = (boardId: number) => {
    setBoards(boards.map(board => {
      if (board.id === boardId) {
        const updatedBoard = { ...board, bookmarked: !board.bookmarked }
        if (updatedBoard.bookmarked) {
          setSavedBoards(prev => [...prev, updatedBoard])
        } else {
          setSavedBoards(prev => prev.filter(b => b.id !== boardId))
        }
        return updatedBoard
      }
      return board
    }))
  }

  const sortedAndFilteredBoards = boards
    .filter(board => filterGame === "All Games" || board.game === filterGame)
    .sort((a, b) => {
      if (sortBy === "newest") {
        return b.createdAt.getTime() - a.createdAt.getTime()
      } else {
        return b.votes - a.votes
      }
    })

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 text-center tracking-tight">
            Arcadia Challenges
          </h1>
          <p className="text-xl text-cyan-200 text-center mb-8">
            Choose your challenge and compete with gamers worldwide!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {challenges.map((challenge) => (
              <NeonButton
                key={challenge.name}
                onClick={() => setSelectedChallenge(challenge.name)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  selectedChallenge === challenge.name
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg scale-105'
                    : 'bg-gray-700 text-cyan-300 hover:bg-gray-600'
                }`}
              >
                {challenge.icon}
                <span>{challenge.name}</span>
              </NeonButton>
            ))}
          </div>
        </motion.div>

        {selectedChallenge === "Bingo Battles" && (
          <>
            <motion.h2 
              className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-center tracking-tight"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Bingo Battles
            </motion.h2>

            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-cyan-500 text-cyan-100">
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="hottest">Hottest</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterGame} onValueChange={setFilterGame}>
                  <SelectTrigger className="w-[180px] bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                    <SelectValue placeholder="Filter by game" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-cyan-500 text-cyan-100">
                    {games.map(game => (
                      <SelectItem key={game} value={game}>{game}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NeonButton onClick={createNewBoard} className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white transition-all duration-300">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Board
              </NeonButton>
            </div>

            {savedBoards.length > 0 && (
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">Your Boards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedBoards.map((board) => (
                    <Card key={board.id} className="bg-gray-700 hover:bg-gray-600 transition-colors duration-200 border-cyan-500/50">
                      <CardHeader className="cursor-pointer" onClick={() => toggleBoardExpansion(board.id)}>
                        <CardTitle className="text-xl font-semibold text-cyan-300 flex justify-between items-center">
                          {board.name}
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-0 text-cyan-400 hover:text-cyan-300 hover:bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation()
                                voteBoard(board.id)
                              }}
                              aria-label={`Vote for ${board.name}`}
                              disabled={board.votedBy.has(currentUserId)}
                            >
                              <ThumbsUp className="h-5 w-5 mr-1" />
                              {board.votes}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-0 text-cyan-400 hover:text-cyan-300 hover:bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleBookmark(board.id)
                              }}
                              aria-label={board.bookmarked ? "Remove bookmark" : "Bookmark board"}
                            >
                              {board.bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription className="text-cyan-200">
                          {board.players} players | {board.size}x{board.size} | {Math.floor(board.timeLeft / 3600).toString().padStart(2, '0')}:{Math.floor((board.timeLeft % 3600) / 60).toString().padStart(2, '0')}:{(board.timeLeft % 60).toString().padStart(2, '0')} left | {board.game}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex flex-col gap-6">
              <motion.div 
                className="w-full"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="bg-gray-800 border-2 border-cyan-500">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-cyan-400">
                      Bingo Boards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sortedAndFilteredBoards.map((board) => (
                        <Card key={board.id} className="bg-gray-700 hover:bg-gray-600 transition-colors duration-200 border-cyan-500/50">
                          <CardHeader 
                            className="cursor-pointer" 
                            onClick={() => toggleBoardExpansion(board.id)}
                          >
                            <CardTitle className="text-xl font-semibold text-cyan-300 flex justify-between items-center">
                              {board.name}
                              <div className="flex items-center space-x-2">
                                <NeonButton 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 text-cyan-400 hover:text-cyan-300 hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    voteBoard(board.id)
                                  }}
                                  aria-label={`Vote for ${board.name}`}
                                  disabled={board.votedBy.has(currentUserId)}
                                >
                                  <ThumbsUp className="h-5 w-5 mr-1" />
                                  {board.votes}
                                </NeonButton>
                                <NeonButton 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 text-cyan-400 hover:text-cyan-300 hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleBookmark(board.id)
                                  }}
                                  aria-label={board.bookmarked ? "Remove bookmark" : "Bookmark board"}
                                >
                                  {board.bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                                </NeonButton>
                                <NeonButton 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 text-cyan-400 hover:text-cyan-300 hover:bg-transparent"
                                  aria-label={expandedBoard === board.id ? "Collapse board details" : "Expand board details"}
                                >
                                  {expandedBoard === board.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </NeonButton>
                              </div>
                            </CardTitle>
                            <CardDescription className="text-cyan-200">
                              {board.players} players | {board.size}x{board.size} | {Math.floor(board.timeLeft / 3600).toString().padStart(2, '0')}:{Math.floor((board.timeLeft % 3600) / 60).toString().padStart(2, '0')}:{(board.timeLeft % 60).toString().padStart(2, '0')} left | {board.game}
                            </CardDescription>
                          </CardHeader>
                          <AnimatePresence>
                            {expandedBoard === board.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <CardContent>
                                  <BingoBoardDetail board={board} onClose={() => setExpandedBoard(null)} onBookmark={() => toggleBookmark(board.id)} />
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}

        {selectedChallenge !== "Bingo Battles" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mt-12"
          >
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">{selectedChallenge}</h2>
            <p className="text-xl text-cyan-200">
              {challenges.find(c => c.name === selectedChallenge)?.description}
            </p>
            <p className="text-lg text-cyan-300 mt-4">Coming soon! Stay tuned for exciting new challenges.</p>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function BingoBoardDetail({ board, onClose, onBookmark }: { board: any, onClose: () => void, onBookmark: () => void }) {
  const [boardState, setBoardState] = useState<Array<{ text: string; colors: string[] }>>([])
  const [players, setPlayers] = useState(colorPalette.slice(0, 4).map((p, i) => ({ ...p, name: `Player ${i + 1}`, team: i % 2 })))
  const [winner, setWinner] = useState<number | null>(null)
  const [time, setTime] = useState(board.timeLeft)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [boardSize, setBoardSize] = useState(board.size)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [teamMode, setTeamMode] = useState(false)
  const [winConditions, setWinConditions] = useState({
    line: true,
    majority: false,
  })
  const [lockout, setLockout] = useState(true)
  const [isOwner, setIsOwner] = useState(true)
  const [boardId, setBoardId] = useState('')
  const [editingCell, setEditingCell] = useState<number | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [boardName, setBoardName] = useState(board.name)
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [teamNames, setTeamNames] = useState(["Team 1", "Team 2"])
  const [editingTeamName, setEditingTeamName] = useState<number | null>(null)
  const [teamColors, setTeamColors] = useState(colorPalette.slice(0, 2).map(p => p.color))
  const [showBoardId, setShowBoardId] = useState(false)

  useEffect(() => {
    resetBoard()
  }, [boardSize])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isTimerRunning && time > 0) {
      timer = setInterval(() => {
        setTime(prevTime => prevTime - 1)
      }, 1000)
    } else if (time === 0) {
      checkWinningCondition(true)
    }
    return () => clearInterval(timer)
  }, [isTimerRunning, time])

  const generateBoard = useCallback(() => {
    return Array(boardSize * boardSize).fill('').map(() => ({
      text: wowChallenges[Math.floor(Math.random() * wowChallenges.length)],
      colors: []
    }))
  }, [boardSize])

  const checkWinningCondition = useCallback((timerEnded = false) => {
    if (timerEnded) {
      setWinner(-1) // -1 indicates a tie when the timer ends
      setIsTimerRunning(false)
      return
    }

    // Implement win condition checks here
    // This is a placeholder and should be replaced with actual win condition logic
    setWinner(null)
  }, [])

  const resetBoard = useCallback(() => {
    const newBoard = generateBoard()
    setBoardState(newBoard)
    setWinner(null)
    setTime(300) // Reset to 5 minutes
    setIsTimerRunning(false)
    setCurrentPlayer(0)
  }, [boardSize, generateBoard])

  const shareBoard = () => {
    const boardState = JSON.stringify({ boardState, players, boardSize, teamMode, winConditions, lockout })
    const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    setBoardId(id)
    setShowBoardId(true)
  }

  const updatePlayerInfo = (index: number, name: string, color: string, team?: number) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers]
      newPlayers[index] = { ...newPlayers[index], name: name.slice(0, 20), color, ...(team !== undefined && { team }) }
      return newPlayers
    })
  }

  const addPlayer = () => {
    if (players.length < 4) {
      const newPlayer = {
        ...colorPalette[players.length % colorPalette.length],
        name: teamMode ? `${teamNames[players.length % 2]} Player ${Math.floor(players.length / 2) + 1}` : `Player ${players.length + 1}`,
        team: players.length % 2
      }
      setPlayers(prevPlayers => [...prevPlayers, newPlayer])
    }
  }

  const removePlayer = (index: number) => {
    setPlayers(prevPlayers => prevPlayers.filter((_, i) => i !== index))
    setBoardState(prevBoard => {
      return prevBoard.map(cell => ({
        ...cell,
        colors: cell.colors.filter(color => color !== players[index].color)
      }))
    })
  }

  const handleCellChange = (index: number, value: string) => {
    if (!isOwner || winner !== null) return
    setBoardState(prevBoard => {
      const newBoard = [...prevBoard]
      newBoard[index] = { ...newBoard[index], text: value.slice(0, 50) }
      return newBoard
    })
  }

  const handleCellSubmit = (index: number) => {
    setEditingCell(null)
  }

  const handleCellClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault()
    if (editingCell === null) {
      setBoardState(prevBoard => {
        const newBoard = [...prevBoard]
        const currentColor = players[currentPlayer].color
        if (event.type === 'contextmenu') {
          // Right-click: remove color
          newBoard[index] = { ...newBoard[index], colors: [] }
        } else if (lockout) {
          newBoard[index] = { ...newBoard[index], colors: [currentColor] }
        } else {
          if (!newBoard[index].colors.includes(currentColor)) {
            newBoard[index] = { ...newBoard[index], colors: [...newBoard[index].colors, currentColor] }
          }
        }
        return newBoard
      })
      setCurrentPlayer((currentPlayer + 1) % players.length)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes, seconds] = e.target.value.split(':').map(Number)
    const newTime = hours * 3600 + minutes * 60 + seconds
    setTime(newTime)
  }

  const handleBoardNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBoardName(e.target.value)
  }

  const handleTeamNameChange = (index: number, name: string) => {
    setTeamNames(prevNames => {
      const newNames = [...prevNames]
      newNames[index] = name
      return newNames
    })
    // Update player names to reflect new team name
    setPlayers(prevPlayers => prevPlayers.map(player => 
      player.team === index ? { ...player, name: `${name} Player ${player.name.split(' ').pop()}` } : player
    ))
  }

  const handleTeamColorChange = (index: number, color: string) => {
    setTeamColors(prevColors => {
      const newColors = [...prevColors]
      newColors[index] = color
      return newColors
    })
    // Update player colors to reflect new team color
    setPlayers(prevPlayers => prevPlayers.map(player => 
      player.team === index ? { ...player, color } : player
    ))
  }

  const toggleTeamMode = (checked: boolean) => {
    setTeamMode(checked)
    if (checked) {
      // Switch to team mode
      setPlayers(prevPlayers => prevPlayers.map((player, index) => ({
        ...player,
        name: `${teamNames[index % 2]} Player ${Math.floor(index / 2) + 1}`,
        team: index % 2,
        color: teamColors[index % 2]
      })))
    } else {
      // Switch to individual mode
      setPlayers(prevPlayers => prevPlayers.map((player, index) => ({
        ...player,
        name: `Player ${index + 1}`,
        team: index % 2,
        color: colorPalette[index].color
      })))
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={onClose} className="mb-4 bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300">
        <X className="mr-2 h-4 w-4" />
        Close Board
      </Button>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div 
          className="flex-grow"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gray-800 border-2 border-cyan-500 flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-cyan-400 flex justify-between items-center">
                {editingBoardName ? (
                  <Input
                    value={boardName}
                    onChange={handleBoardNameChange}
                    onBlur={() => setEditingBoardName(false)}
                    onKeyPress={(e) => e.key === 'Enter' && setEditingBoardName(false)}
                    className="text-2xl font-bold text-cyan-400 bg-transparent border-none focus:ring-2 focus:ring-cyan-500"
                    autoFocus
                    aria-label="Edit board name"
                  />
                ) : (
                  <span onClick={() => isOwner && setEditingBoardName(true)} className="cursor-pointer">
                    {boardName}
                  </span>
                )}
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={shareBoard} aria-label="Share Board" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share Board</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => alert('Pushed to overlay!')} aria-label="Push to Overlay" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                          <Monitor className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Push to Overlay</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={onBookmark} aria-label={board.bookmarked ? "Remove bookmark" : "Bookmark board"} className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                          {board.bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{board.bookmarked ? "Remove bookmark" : "Bookmark board"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className={`grid grid-cols-${boardSize} gap-2 p-4 bg-gray-700 rounded-lg`}>
                {boardState.map((cell, index) => (
                  <motion.div
                    key={index}
                    className={`relative aspect-square flex items-center justify-center rounded-md border-2 border-gray-600 overflow-hidden ${cell.colors.length > 0 ? '' : 'bg-gray-800'} group cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md`}
                    onClick={(e) => handleCellClick(index, e)}
                    onContextMenu={(e) => handleCellClick(index, e)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cell.colors.length > 0 && (
                      <div className="absolute inset-0 flex">
                        {cell.colors.map((color, colorIndex) => (
                          <div key={colorIndex} className={`flex-1 ${color}`} />
                        ))}
                      </div>
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${editingCell === index ? 'top-0' : 'top-1/2 transform -translate-y-1/2'}`}>
                      <textarea
                        value={cell.text}
                        onChange={(e) => handleCellChange(index, e.target.value)}
                        className={`w-full h-full text-center bg-transparent border-none text-white text-xs md:text-sm focus:ring-2 focus:ring-cyan-500 resize-none overflow-hidden font-bold shadow-sm ${editingCell === index ? '' : 'pointer-events-none'}`}
                        readOnly={!isOwner || winner !== null || editingCell !== index}
                        maxLength={50}
                        style={{ wordWrap: 'break-word', textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                        aria-label={`Bingo cell ${index + 1}`}
                      />
                    </div>
                    {isOwner && editingCell !== index && (
                      <button
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCell(index)
                        }}
                        aria-label={`Edit cell ${index + 1}`}
                      >
                        <Edit2 className="h-4 w-4 text-cyan-400" />
                      </button>
                    )}
                    {isOwner && editingCell === index &&
                      <button
                        className="absolute bottom-1 right-1 bg-cyan-500 rounded-full p-1 hover:bg-cyan-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCellSubmit(index)
                        }}
                        aria-label={`Submit edit for cell ${index + 1}`}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </button>
                    }
                  </motion.div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between mt-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Quick Start Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-2 border-cyan-500">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-cyan-400">Quick Start Guide</DialogTitle>
                  </DialogHeader>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-cyan-200">
                    <li>Set up your board and players</li>
                    <li>Click "Add to Ingame-Overlay"</li>
                    <li>Adjust overlay position in-game</li>
                    <li>Click "Start Board" to begin</li>
                  </ol>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                <Download className="mr-2 h-4 w-4" />
                Download App
              </Button>
            </CardFooter>
          </Card>
          {showBoardId && (
            <Card className="mt-4 bg-gray-800 border-2 border-cyan-500">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-cyan-400 font-semibold">Board ID: {boardId}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(boardId)
                    alert('Board ID copied to clipboard!')
                  }}
                  className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy ID
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        <motion.div 
          className="w-full lg:w-80"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-gray-800 border-2 border-cyan-500 h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-cyan-400">Game Controls</CardTitle>
              <CardDescription className="text-cyan-200">Manage players, settings, and game rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-cyan-400 flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  {teamMode ? 'Teams' : 'Players'}
                </Label>
                {teamMode && (
                  <div className="space-y-2">
                    {teamNames.map((name, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-700 p-2 rounded-md">
                        {editingTeamName === index ? (
                          <Input
                            value={name}
                            onChange={(e) => handleTeamNameChange(index, e.target.value)}
                            onBlur={() => setEditingTeamName(null)}
                            onKeyPress={(e) => e.key === 'Enter' && setEditingTeamName(null)}
                            className="text-sm text-white bg-transparent border-none focus:ring-2 focus:ring-cyan-500"
                            autoFocus
                            aria-label={`Edit team ${index + 1} name`}
                          />
                        ) : (
                          <span onClick={() => isOwner && setEditingTeamName(index)} className="cursor-pointer text-sm text-white flex-grow">
                            {name}
                          </span>
                        )}
                        <div className={`w-4 h-4 rounded-full ${teamColors[index]}`}></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {players.map((player, i) => (
                    <Popover key={i}>
                      <PopoverTrigger asChild>
                        <Button className={`w-12 h-12 ${player.color} rounded-full text-white font-bold text-lg relative transition-transform duration-200 ease-in-out hover:scale-110`} aria-label={`Edit ${player.name}`}>
                          {player.name[0]}
                          {isOwner && (
                            <button
                              className="absolute -top-1 -right-1 bg-gray-700 rounded-full p-1 hover:bg-gray-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                removePlayer(i)
                              }}
                              aria-label={`Remove ${player.name}`}
                            >
                              <X className="h-3 w-3 text-white" />
                            </button>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-gray-800 border-2 border-cyan-500">
                        <div className="space-y-4">
                          <h4 className="font-medium text-lg text-cyan-400">Edit {teamMode ? 'Team' : 'Player'}</h4>
                          <div className="space-y-2">
                            <Label htmlFor={`name-${i}`} className="text-cyan-200">Name</Label>
                            <Input
                              id={`name-${i}`}
                              value={player.name}
                              onChange={(e) => updatePlayerInfo(i, e.target.value, player.color, player.team)}
                              maxLength={20}
                              aria-label={`Edit ${teamMode ? 'team' : 'player'} name`}
                              className="bg-gray-700 border-cyan-500 text-white"
                            />
                          </div>
                          {teamMode && (
                            <div className="space-y-2">
                              <Label className="text-cyan-200">Team</Label>
                              <Select
                                value={player.team.toString()}
                                onValueChange={(value) => updatePlayerInfo(i, player.name,
teamColors[parseInt(value)], parseInt(value))}
                              >
                                <SelectTrigger className="bg-gray-700 border-cyan-500 text-white">
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-cyan-500 text-cyan-100">
                                  <SelectItem value="0">Team 1</SelectItem>
                                  <SelectItem value="1">Team 2</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-cyan-200">Color</Label>
                            <div className="flex flex-wrap gap-2">
                              {colorPalette.map((color) => (
                                <Button
                                  key={color.color}
                                  className={`w-8 h-8 ${color.color} ${color.hoverColor} rounded-full transition-transform duration-200 ease-in-out hover:scale-110`}
                                  onClick={() => {
                                    if (teamMode) {
                                      handleTeamColorChange(player.team, color.color)
                                    } else {
                                      updatePlayerInfo(i, player.name, color.color, player.team)
                                    }
                                  }}
                                  disabled={teamMode && teamColors.includes(color.color) && teamColors.indexOf(color.color) !== player.team}
                                  aria-label={`Select ${color.name} color`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {players.length < 4 && isOwner && (
                    <Button
                      className="w-12 h-12 bg-gray-600 hover:bg-gray-500 rounded-full transition-transform duration-200 ease-in-out hover:scale-110"
                      onClick={addPlayer}
                      aria-label="Add Player"
                    >
                      <PlusCircle className="h-6 w-6" />
                      <span className="sr-only">Add Player</span>
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="bg-cyan-500/50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold text-cyan-400 flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-cyan-400" />
                    Time
                  </Label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={formatTime(time)}
                      onChange={handleTimeChange}
                      className="w-32 text-right bg-transparent border-none text-white"
                      step="1"
                      aria-label="Set game time"
                    />
                  </div>
                </div>

                {isOwner && (
                  <Button 
                    className={`w-full ${isTimerRunning ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : 'bg-cyan-600 hover:bg-cyan-700'} text-white transition-colors duration-200 text-lg font-semibold`}
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    aria-label={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                  </Button>
                )}
              </div>

              <Separator className="bg-cyan-500/50" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold text-cyan-400 flex items-center">
                    <Trophy className="mr-2 h-5 w-5" />
                    Win Conditions
                  </Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-cyan-500/20 text-cyan-400" aria-label="Win Conditions Help">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-white border-2 border-cyan-500">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-cyan-400">Win Conditions and Settings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <h3 className="font-semibold text-lg text-cyan-400">Line</h3>
                          <p className="text-cyan-200">The player or team that first forms a line horizontally, vertically, or diagonally wins.</p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-cyan-400">Majority</h3>
                          <p className="text-cyan-200">The team with the most completed fields in their color when time runs out wins.</p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-cyan-400">Lockout (Game Setting)</h3>
                          <p className="text-cyan-200">When enabled, fields completed by one team or player cannot be completed by others. If disabled, other players can still check off these fields in their colors. By default, this setting is enabled.</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="line"
                      checked={winConditions.line}
                      onCheckedChange={(checked) => setWinConditions(prev => ({ ...prev, line: checked as boolean }))}
                      disabled={!isOwner}
                      className="border-cyan-500 text-cyan-500"
                    />
                    <Label htmlFor="line" className="text-cyan-200">Line</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="majority"
                      checked={winConditions.majority}
                      onCheckedChange={(checked) => setWinConditions(prev => ({ ...prev, majority: checked as boolean }))}
                      disabled={!isOwner}
                      className="border-cyan-500 text-cyan-500"
                    />
                    <Label htmlFor="majority" className="text-cyan-200">Majority</Label>
                  </div>
                </div>
              </div>

              <Separator className="bg-cyan-500/50" />

              <div className="space-y-2">
                <Label className="text-lg font-semibold text-cyan-400">Game Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="board-size" className="text-sm text-cyan-200">Board Size</Label>
                    <Select value={boardSize.toString()} onValueChange={(value) => setBoardSize(Number(value))} disabled={!isOwner}>
                      <SelectTrigger id="board-size" className="bg-gray-700 border-cyan-500 text-white">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-cyan-500 text-cyan-100">
                        <SelectItem value="3" className="hover:bg-cyan-500/20">3x3</SelectItem>
                        <SelectItem value="4" className="hover:bg-cyan-500/20">4x4</SelectItem>
                        <SelectItem value="5" className="hover:bg-cyan-500/20">5x5</SelectItem>
                        <SelectItem value="6" className="hover:bg-cyan-500/20">6x6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sound" className="text-sm text-cyan-200">Sound</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sound"
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                        disabled={!isOwner}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                      {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-cyan-400" />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="team-mode" className="text-sm text-cyan-200">Team Mode</Label>
                  <Switch
                    id="team-mode"
                    checked={teamMode}
                    onCheckedChange={toggleTeamMode}
                    disabled={!isOwner}
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="lockout" className="text-sm text-cyan-200 flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Lockout
                  </Label>
                  <Switch
                    id="lockout"
                    checked={lockout}
                    onCheckedChange={setLockout}
                    disabled={!isOwner}
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>
              </div>

              {isOwner && (
                <div className="flex flex-col gap-2">
                  <NeonButton className="bg-gradient-to-r from-fuchsia-500 to-yellow-400 hover:from-fuchsia-600 hover:to-yellow-500 text-white font-semibold transition-transform duration-200 ease-in-out hover:scale-105" aria-label="Start Board">
                    <Play className="mr-2 h-4 w-4" />
                    Start Board
                  </NeonButton>
                  <NeonButton className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl" aria-label="Add to Ingame-Overlay">
                    <Monitor className="mr-2 h-4 w-4" />
                    Add to Ingame-Overlay
                  </NeonButton>
                  <NeonButton onClick={resetBoard} className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-transform duration-200 ease-in-out hover:scale-105" aria-label="Reset Board">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Board
                  </NeonButton>
                </div>
              )}

              <Separator className="bg-cyan-500/50" />

              <div className="space-y-2">
                <NeonButton onClick={() => alert('Board saved!')} className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-transform duration-200 ease-in-out hover:scale-105" aria-label="Save Board">
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </NeonButton>
                <NeonButton onClick={() => alert('Load functionality not available in preview')} className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-transform duration-200 ease-in-out hover:scale-105" aria-label="Load Board">
                  <Upload className="mr-2 h-4 w-4" />
                  Load
                </NeonButton>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {winner !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <Card className="bg-gray-800 p-6 border-2 border-cyan-500">
              <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 mb-4 flex items-center">
                <Trophy className="mr-2 h-8 w-8 text-yellow-400" />
                {winner === -1 ? "Time's up!" : `${players[winner].name} Wins!`}
              </CardTitle>
              <CardContent>
                <p className="text-cyan-200 mb-4 text-lg">
                  {winner === -1
                    ? "The game has ended in a tie!"
                    : `Congratulations to ${players[winner].name} for winning the Bingo Battle!`}
                </p>
                <NeonButton onClick={resetBoard} className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white text-lg font-semibold transition-transform duration-200 ease-in-out hover:scale-105" aria-label="Play Again">
                  Play Again
                </NeonButton>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}