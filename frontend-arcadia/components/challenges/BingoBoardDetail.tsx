'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Share2,
  Monitor,
  Save,
  Upload,
  Clock,
  Volume2,
  VolumeX,
  Users,
  PlusCircle,
  Trophy,
  Play,
  Lock,
  HelpCircle,
  Edit2,
  X,
  Check,
  RefreshCw,
  Download,
  Copy,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import NeonButton from '@/components/ui/NeonButton'

// Define the color palette with a TypeScript interface for better type safety
interface ColorOption {
  name: string
  color: string
  hoverColor: string
}

const colorPalette: ColorOption[] = [
  { name: 'Cyan', color: 'bg-cyan-500', hoverColor: 'hover:bg-cyan-600' },
  { name: 'Fuchsia', color: 'bg-fuchsia-500', hoverColor: 'hover:bg-fuchsia-600' },
  { name: 'Lime', color: 'bg-lime-500', hoverColor: 'hover:bg-lime-600' },
  { name: 'Yellow', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600' },
  { name: 'Red', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
  { name: 'Blue', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { name: 'Green', color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
  { name: 'Purple', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
]

// Define the list of challenges as a readonly array for immutability
const wowChallenges: ReadonlyArray<string> = [
  'Defeat the Lich King',
  'Collect 10 Peacebloom',
  'Complete a Mythic+ dungeon',
  'Win a PvP battleground',
  'Tame a rare pet',
  'Craft an epic item',
  'Reach level 60',
  'Defeat Ragnaros',
  'Complete a raid',
  'Explore all zones in Azeroth',
  'Earn 1000 gold',
  'Defeat a world boss',
  'Complete a daily quest',
  'Win a duel',
  'Earn an achievement',
  'Collect a mount',
  'Complete a timewalking dungeon',
  'Defeat C\'Thun',
  'Win an arena match',
  'Collect all dragon aspects',
  'Complete the Darkmoon Faire',
  'Defeat Deathwing',
  'Earn exalted reputation',
  'Complete a scenario',
  'Defeat the Jailer',
] as const

// Define TypeScript types for Player and BoardCell
interface Player {
  name: string
  color: string
  hoverColor: string
  team: number
}

interface BoardCell {
  text: string
  colors: string[]
}

// Props Interface for BingoBoardDetail Component
interface BingoBoardDetailProps {
  board: {
    readonly id: number
    readonly name: string
    readonly players: number
    readonly size: number
    readonly timeLeft: number
    readonly votes: number
    readonly game: string
    readonly createdAt: Date
    readonly votedBy: ReadonlySet<string>
    readonly bookmarked: boolean
  }
  onClose: () => void
  onBookmark: () => void
}

// NeonText Component for Gradient Text
const NeonText: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <span
    className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-bold ${className}`}
  >
    {children}
  </span>
)

// Main BingoBoardDetail Component
const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({
  board,
  onClose,
  onBookmark,
}) => {
  // Initialize players with useMemo to prevent re-creation on every render
  const initialPlayers: Player[] = useMemo(
    () =>
      colorPalette.slice(0, 4).map((p, i) => ({
        ...p,
        name: `Player ${i + 1}`,
        team: i % 2,
      })),
    []
  )

  // State management
  const [boardState, setBoardState] = useState<BoardCell[]>([])
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [winner, setWinner] = useState<number | null>(null)
  const [time, setTime] = useState<number>(board.timeLeft)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const [boardSize, setBoardSize] = useState<number>(board.size)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [teamMode, setTeamMode] = useState<boolean>(false)
  const [winConditions, setWinConditions] = useState<{
    line: boolean
    majority: boolean
  }>({
    line: true,
    majority: false,
  })
  const [lockout, setLockout] = useState<boolean>(true)
  const [isOwner] = useState<boolean>(true) // Assuming the user is the owner
  const [boardId, setBoardId] = useState<string>('')
  const [editingCell, setEditingCell] = useState<number | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)
  const [boardName, setBoardName] = useState<string>(board.name)
  const [editingBoardName, setEditingBoardName] = useState<boolean>(false)
  const [teamNames, setTeamNames] = useState<[string, string]>([
    'Team 1',
    'Team 2',
  ])
  const [editingTeamName, setEditingTeamName] = useState<number | null>(null)
  const [teamColors, setTeamColors] = useState<[string, string]>([
    colorPalette[0].color,
    colorPalette[1].color,
  ])
  const [showBoardId, setShowBoardId] = useState<boolean>(false)

  // Generate the bingo board based on board size
  const generateBoard = useCallback((): BoardCell[] => {
    return Array.from({ length: boardSize * boardSize }, () => ({
      text:
        wowChallenges[
          Math.floor(Math.random() * wowChallenges.length)
        ],
      colors: [],
    }))
  }, [boardSize])

  // Reset the board to initial state
  const resetBoard = useCallback(() => {
    const newBoard = generateBoard()
    setBoardState(newBoard)
    setWinner(null)
    setTime(300) // Reset to 5 minutes
    setIsTimerRunning(false)
    setCurrentPlayer(0)
  }, [generateBoard])

  // Initialize the board when component mounts or board size changes
  useEffect(() => {
    resetBoard()
  }, [resetBoard])

  // Check for winning conditions
  const checkWinningCondition = useCallback(
    (timerEnded: boolean = false): void => {
      if (timerEnded) {
        setWinner(-1) // -1 indicates a tie when the timer ends
        setIsTimerRunning(false)
        return
      }

      // Placeholder for actual win condition logic
      // Implement your own logic here based on `boardState` and `players`
      // Example:
      // if (/* condition */) {
      //   setWinner(playerIndex)
      // }
    },
    []
  )

  // Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    if (isTimerRunning && time > 0) {
      timer = setInterval(() => {
        setTime((prevTime: number) => prevTime - 1)
      }, 1000)
    } else if (time === 0 && isTimerRunning) {
      checkWinningCondition(true)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isTimerRunning, time, checkWinningCondition])

  // Share Board Functionality
  const shareBoard = useCallback((): void => {
    try {
      const boardStateString = JSON.stringify({
        boardState,
        players,
        boardSize,
        teamMode,
        winConditions,
        lockout,
      })
      const id =
        Math.random().toString(36).substr(2, 9) +
        Date.now().toString(36)
      setBoardId(id)
      setShowBoardId(true)
      // Implement actual sharing logic here, e.g., copying to clipboard or generating a shareable link
      console.log(boardStateString) // Temporary use to avoid unused variable warning
    } catch (error) {
      console.error('Error sharing board:', error)
      alert('Failed to share the board. Please try again.')
    }
  }, [
    boardState,
    players,
    boardSize,
    teamMode,
    winConditions,
    lockout,
  ])

  // Update Player Information
  const updatePlayerInfo = useCallback(
    (
      index: number,
      name: string,
      color: string,
      team?: number
    ): void => {
      setPlayers((prevPlayers: Player[]) => {
        const newPlayers = [...prevPlayers]
        newPlayers[index] = {
          ...newPlayers[index],
          name: name.slice(0, 20),
          color,
          ...(team !== undefined && { team }),
        }
        return newPlayers
      })
    },
    []
  )

  // Add a new player
  const addPlayer = useCallback((): void => {
    if (players.length < 4) {
      const newPlayer: Player = {
        ...colorPalette[players.length % colorPalette.length],
        name: teamMode
          ? `${teamNames[players.length % 2]} Player ${
              Math.floor(players.length / 2) + 1
            }`
          : `Player ${players.length + 1}`,
        team: players.length % 2,
        hoverColor: colorPalette[players.length % colorPalette.length].hoverColor,
      }
      setPlayers((prevPlayers: Player[]) => [...prevPlayers, newPlayer])
    }
  }, [players.length, teamMode, teamNames])

  // Remove a player
  const removePlayer = useCallback(
    (index: number): void => {
      setPlayers((prevPlayers: Player[]) =>
        prevPlayers.filter((_, i) => i !== index)
      )
      setBoardState((prevBoard: BoardCell[]) =>
        prevBoard.map((cell) => ({
          ...cell,
          colors: cell.colors.filter(
            (color) => color !== players[index].color
          ),
        }))
      )
    },
    [players]
  )

  // Handle Cell Text Change
  const handleCellChange = useCallback(
    (index: number, value: string): void => {
      if (!isOwner || winner !== null) return
      setBoardState((prevBoard) => {
        const newBoard = [...prevBoard]
        newBoard[index] = { ...newBoard[index], text: value.slice(0, 50) }
        return newBoard
      })
    },
    [isOwner, winner]
  )

  // Submit Cell Edit
  const handleCellSubmit = useCallback(
    (index: number): void => {
      setEditingCell(null)
      // Additional logic can be added here if needed
    },
    []
  )

  // Handle Cell Click (Left-click to add color, Right-click to remove)
  const handleCellClick = useCallback(
    (index: number, event: MouseEvent<HTMLDivElement>): void => {
      event.preventDefault()
      if (editingCell !== null) return // Prevent interaction if editing

      setBoardState((prevBoard) => {
        const newBoard = [...prevBoard]
        const currentColor = players[currentPlayer].color

        if (event.type === 'contextmenu') {
          // Right-click: remove all colors
          newBoard[index] = { ...newBoard[index], colors: [] }
        } else {
          // Left-click: toggle color
          if (!newBoard[index].colors.includes(currentColor)) {
            newBoard[index].colors = [...newBoard[index].colors, currentColor]
          } else {
            newBoard[index].colors = newBoard[index].colors.filter(
              (color) => color !== currentColor
            )
          }
        }
        return newBoard
      })

      // Move to next player
      setCurrentPlayer((prevPlayer) => (prevPlayer + 1) % players.length)
    },
    [players, currentPlayer, editingCell]
  )

  // Format time in HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }, [])

  // Handle Time Change from Input
  const handleTimeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const [hours, minutes, seconds] = e.target.value
        .split(':')
        .map(Number)
      const newTime =
        (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0)
      setTime(newTime)
    },
    []
  )

  // Handle Board Name Change
  const handleBoardNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setBoardName(e.target.value)
    },
    []
  )

  // Handle Team Name Change
  const handleTeamNameChange = useCallback(
    (index: number, name: string): void => {
      setTeamNames((prevNames) => {
        const newNames = [...prevNames]
        newNames[index] = name
        return newNames as [string, string]
      })
      // Update player names to reflect new team name
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.team === index
            ? {
                ...player,
                name: `${teamNames[index]} Player ${
                  player.name.split(' ').pop() || ''
                }`,
              }
            : player
        )
      )
    },
    [teamNames]
  )

  // Handle Team Color Change
  const handleTeamColorChange = useCallback(
    (index: number, color: string): void => {
      setTeamColors((prevColors) => {
        const newColors = [...prevColors]
        newColors[index] = color
        return newColors as [string, string]
      })
      // Update player colors to reflect new team color
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.team === index ? { ...player, color } : player
        )
      )
    },
    []
  )

  // Toggle Team Mode
  const toggleTeamMode = useCallback(
    (checked: boolean): void => {
      setTeamMode(checked)
      if (checked) {
        // Switch to team mode
        setPlayers((prevPlayers) =>
          prevPlayers.map((player, index) => ({
            ...player,
            name: `${teamNames[index % 2]} Player ${
              Math.floor(index / 2) + 1
            }`,
            team: index % 2,
            color: teamColors[index % 2],
          }))
        )
      } else {
        // Switch to individual mode
        setPlayers((prevPlayers) =>
          prevPlayers.map((player, index) => ({
            ...player,
            name: `Player ${index + 1}`,
            team: index % 2,
            color: colorPalette[index].color,
            hoverColor: colorPalette[index].hoverColor,
          }))
        )
      }
    },
    [teamNames, teamColors]
  )

  // Handle Board Name Editing (on Enter key)
  const handleBoardNameKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        setEditingBoardName(false)
      }
    },
    []
  )

  // Handle Team Name Editing (on Enter key)
  const handleTeamNameKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number): void => {
      if (e.key === 'Enter') {
        setEditingTeamName(null)
      }
    },
    []
  )

  // Copy Board ID to Clipboard with Error Handling
  const copyBoardIdToClipboard = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(boardId)
      alert('Board ID copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy board ID:', error)
      alert('Failed to copy Board ID. Please try again.')
    }
  }, [boardId])

  // Render Component
  return (
    <div className="space-y-4">
      {/* Close Button */}
      <Button
        onClick={onClose}
        className="mb-4 bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300"
        aria-label="Close Board"
      >
        <X className="mr-2 h-4 w-4" />
        Close Board
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Board Section */}
        <motion.div
          className="flex-grow"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gray-800 border-2 border-cyan-500 flex flex-col h-full">
            {/* Card Header */}
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-cyan-400 flex justify-between items-center">
                {editingBoardName ? (
                  <Input
                    value={boardName}
                    onChange={handleBoardNameChange}
                    onBlur={() => setEditingBoardName(false)}
                    onKeyPress={handleBoardNameKeyPress}
                    className="text-2xl font-bold text-cyan-400 bg-transparent border-none focus:ring-2 focus:ring-cyan-500"
                    autoFocus
                    aria-label="Edit board name"
                  />
                ) : (
                  <span
                    onClick={() => isOwner && setEditingBoardName(true)}
                    className="cursor-pointer"
                    role={isOwner ? 'button' : undefined}
                    tabIndex={isOwner ? 0 : undefined}
                    onKeyPress={(e) => {
                      if (isOwner && e.key === 'Enter') {
                        setEditingBoardName(true)
                      }
                    }}
                  >
                    {boardName}
                  </span>
                )}
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Share Board */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={shareBoard}
                          aria-label="Share Board"
                          className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share Board</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Push to Overlay */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => alert('Pushed to overlay!')}
                          aria-label="Push to Overlay"
                          className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Push to Overlay</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Bookmark */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={onBookmark}
                          aria-label={
                            board.bookmarked
                              ? 'Remove Bookmark'
                              : 'Bookmark Board'
                          }
                          className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                        >
                          {board.bookmarked ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {board.bookmarked
                            ? 'Remove Bookmark'
                            : 'Bookmark Board'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardTitle>
            </CardHeader>

            {/* Card Content: Bingo Board */}
            <CardContent className="flex-grow">
              <div
                className={`grid grid-cols-${boardSize} gap-2 p-4 bg-gray-700 rounded-lg`}
              >
                {boardState.map((cell, index) => (
                  <motion.div
                    key={index}
                    className={`relative aspect-square flex items-center justify-center rounded-md border-2 border-gray-600 overflow-hidden ${
                      cell.colors.length > 0
                        ? ''
                        : 'bg-gray-800'
                    } group cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md`}
                    onClick={(e: MouseEvent<HTMLDivElement>) =>
                      handleCellClick(index, e)
                    }
                    onContextMenu={(e: MouseEvent<HTMLDivElement>) =>
                      handleCellClick(index, e)
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Bingo cell ${index + 1}`}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCellClick(index, e as any)
                      }
                    }}
                  >
                    {/* Display Colors */}
                    {cell.colors.length > 0 && (
                      <div className="absolute inset-0 flex">
                        {cell.colors.map((color, colorIndex) => (
                          <div
                            key={colorIndex}
                            className={`flex-1 ${color}`}
                          />
                        ))}
                      </div>
                    )}
                    {/* Cell Text */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                        editingCell === index
                          ? 'top-0'
                          : 'top-1/2 transform -translate-y-1/2'
                      }`}
                    >
                      <textarea
                        value={cell.text}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                          handleCellChange(index, e.target.value)
                        }
                        onBlur={() => handleCellSubmit(index)}
                        onKeyPress={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                          if (e.key === 'Enter') {
                            handleCellSubmit(index)
                          }
                        }}
                        className={`w-full h-full text-center bg-transparent border-none text-white text-xs md:text-sm focus:ring-2 focus:ring-cyan-500 resize-none overflow-hidden font-bold shadow-sm ${
                          editingCell === index
                            ? ''
                            : 'pointer-events-none'
                        }`}
                        readOnly={!isOwner || winner !== null || editingCell !== index}
                        maxLength={50}
                        style={{
                          wordWrap: 'break-word',
                          textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        }}
                        aria-label={`Bingo cell ${index + 1} text`}
                      />
                    </div>
                    {/* Edit Button */}
                    {isOwner && editingCell !== index && (
                      <button
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation()
                          setEditingCell(index)
                        }}
                        aria-label={`Edit cell ${index + 1}`}
                      >
                        <Edit2 className="h-4 w-4 text-cyan-400" />
                      </button>
                    )}
                    {/* Submit Edit Button */}
                    {isOwner && editingCell === index && (
                      <button
                        className="absolute bottom-1 right-1 bg-cyan-500 rounded-full p-1 hover:bg-cyan-600 transition-colors"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation()
                          handleCellSubmit(index)
                        }}
                        aria-label={`Submit edit for cell ${index + 1}`}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>

            {/* Card Footer: Quick Start Guide and Download */}
            <CardFooter className="flex justify-between mt-4">
              {/* Quick Start Guide */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                    aria-label="Quick Start Guide"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Quick Start Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-2 border-cyan-500">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-cyan-400">
                      Quick Start Guide
                    </DialogTitle>
                  </DialogHeader>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-cyan-200 mt-4">
                    <li>Set up your board and players.</li>
                    <li>Click &quot;Add to Ingame-Overlay&quot;.</li>
                    <li>Adjust overlay position in-game.</li>
                    <li>Click &quot;Start Board&quot; to begin.</li>
                  </ol>
                </DialogContent>
              </Dialog>

              {/* Download App */}
              <Button
                variant="outline"
                className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300"
                aria-label="Download App"
              >
                <Download className="mr-2 h-4 w-4" />
                Download App
              </Button>
            </CardFooter>
          </Card>

          {/* Board ID Display */}
          {showBoardId && (
            <Card className="mt-4 bg-gray-800 border-2 border-cyan-500">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-cyan-400 font-semibold">
                  Board ID: {boardId}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBoardIdToClipboard}
                  className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                  aria-label="Copy Board ID"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Game Controls Section */}
        <motion.div
          className="w-full lg:w-80"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-gray-800 border-2 border-cyan-500 h-full">
            {/* Card Header */}
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-cyan-400">
                Game Controls
              </CardTitle>
              <CardDescription className="text-cyan-200">
                Manage players, settings, and game rules
              </CardDescription>
            </CardHeader>

            {/* Card Content: Settings */}
            <CardContent className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
              {/* Player and Team Management */}
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleTeamNameChange(index, e.target.value)
                            }
                            onBlur={() => setEditingTeamName(null)}
                            onKeyPress={(e: KeyboardEvent<HTMLInputElement>) =>
                              handleTeamNameKeyPress(e, index)
                            }
                            className="text-sm text-white bg-transparent border-none focus:ring-2 focus:ring-cyan-500"
                            autoFocus
                            aria-label={`Edit team ${index + 1} name`}
                          />
                        ) : (
                          <span
                            onClick={() => isOwner && setEditingTeamName(index)}
                            className="cursor-pointer text-sm text-white flex-grow"
                            role={isOwner ? 'button' : undefined}
                            tabIndex={isOwner ? 0 : undefined}
                            onKeyPress={(e) => {
                              if (isOwner && e.key === 'Enter') {
                                setEditingTeamName(index)
                              }
                            }}
                          >
                            {name}
                          </span>
                        )}
                        <div
                          className={`w-4 h-4 rounded-full ${teamColors[index]}`}
                          aria-label={`Team ${index + 1} color`}
                        ></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {players.map((player, i) => (
                    <Popover key={i}>
                      <PopoverTrigger asChild>
                        <Button
                          className={`w-12 h-12 ${player.color} rounded-full text-white font-bold text-lg relative transition-transform duration-200 ease-in-out hover:scale-110`}
                          aria-label={`Edit ${player.name}`}
                        >
                          {player.name.charAt(0)}
                          {isOwner && (
                            <button
                              className="absolute -top-1 -right-1 bg-gray-700 rounded-full p-1 hover:bg-gray-600 transition-colors"
                              onClick={(e: MouseEvent<HTMLButtonElement>) => {
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
                          <h4 className="font-medium text-lg text-cyan-400">
                            Edit {teamMode ? 'Team' : 'Player'}
                          </h4>
                          <div className="space-y-2">
                            {/* Name Editing */}
                            <Label htmlFor={`name-${i}`} className="text-cyan-200">
                              Name
                            </Label>
                            <Input
                              id={`name-${i}`}
                              value={player.name}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                updatePlayerInfo(
                                  i,
                                  e.target.value,
                                  player.color,
                                  player.team
                                )
                              }
                              maxLength={20}
                              aria-label={`Edit ${teamMode ? 'team' : 'player'} name`}
                              className="bg-gray-700 border-cyan-500 text-white"
                            />
                          </div>
                          {teamMode && (
                            <div className="space-y-2">
                              {/* Team Selection */}
                              <Label className="text-cyan-200">Team</Label>
                              <Select
                                value={player.team.toString()}
                                onValueChange={(value: string) =>
                                  updatePlayerInfo(
                                    i,
                                    player.name,
                                    teamColors[parseInt(value)],
                                    parseInt(value)
                                  )
                                }
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
                            {/* Color Selection */}
                            <Label className="text-cyan-200">Color</Label>
                            <div className="flex flex-wrap gap-2">
                              {colorPalette.map((color) => (
                                <Button
                                  key={color.color}
                                  className={`w-8 h-8 ${color.color} ${color.hoverColor} rounded-full transition-transform duration-200 ease-in-out hover:scale-110`}
                                  onClick={() => {
                                    if (teamMode) {
                                      handleTeamColorChange(
                                        player.team,
                                        color.color
                                      )
                                    } else {
                                      updatePlayerInfo(
                                        i,
                                        player.name,
                                        color.color,
                                        player.team
                                      )
                                    }
                                  }}
                                  disabled={
                                    teamMode &&
                                    teamColors.includes(color.color) &&
                                    teamColors.indexOf(color.color) !== player.team
                                  }
                                  aria-label={`Select ${color.name} color`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {/* Add Player Button */}
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

              {/* Timer and Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold text-cyan-400 flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
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
                    className={`w-full ${
                      isTimerRunning
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-700'
                        : 'bg-cyan-600 hover:bg-cyan-700'
                    } text-white text-lg font-semibold transition-colors duration-200`}
                    onClick={() => setIsTimerRunning((prev) => !prev)}
                    aria-label={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                  </Button>
                )}
              </div>

              <Separator className="bg-cyan-500/50" />

              {/* Win Conditions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold text-cyan-400 flex items-center">
                    <Trophy className="mr-2 h-5 w-5" />
                    Win Conditions
                  </Label>
                  {/* Help Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-cyan-500/20 text-cyan-400"
                        aria-label="Win Conditions Help"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-white border-2 border-cyan-500">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-cyan-400">
                          Win Conditions and Settings
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <h3 className="font-semibold text-lg text-cyan-400">
                            Line
                          </h3>
                          <p className="text-cyan-200">
                            The player or team that first forms a line
                            horizontally, vertically, or diagonally wins.
                          </p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-cyan-400">
                            Majority
                          </h3>
                          <p className="text-cyan-200">
                            The team with the most completed fields in their
                            color when time runs out wins.
                          </p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-cyan-400">
                            Lockout (Game Setting)
                          </h3>
                          <p className="text-cyan-200">
                            When enabled, fields completed by one team or
                            player cannot be completed by others. If disabled,
                            other players can still check off these fields in
                            their colors. By default, this setting is enabled.
                          </p>
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
                      onCheckedChange={(checked: boolean) =>
                        setWinConditions((prev) => ({
                          ...prev,
                          line: checked,
                        }))
                      }
                      disabled={!isOwner}
                      className="border-cyan-500 text-cyan-500"
                    />
                    <Label htmlFor="line" className="text-cyan-200">
                      Line
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="majority"
                      checked={winConditions.majority}
                      onCheckedChange={(checked: boolean) =>
                        setWinConditions((prev) => ({
                          ...prev,
                          majority: checked,
                        }))
                      }
                      disabled={!isOwner}
                      className="border-cyan-500 text-cyan-500"
                    />
                    <Label htmlFor="majority" className="text-cyan-200">
                      Majority
                    </Label>
                  </div>
                </div>
              </div>

              <Separator className="bg-cyan-500/50" />

              {/* Game Settings */}
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-cyan-400">
                  Game Settings
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Board Size Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="board-size" className="text-sm text-cyan-200">
                      Board Size
                    </Label>
                    <Select
                      value={boardSize.toString()}
                      onValueChange={(value: string) =>
                        setBoardSize(Number(value))
                      }
                      disabled={!isOwner}
                    >
                      <SelectTrigger className="bg-gray-700 border-cyan-500 text-white">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-cyan-500 text-cyan-100">
                        <SelectItem value="3" className="hover:bg-cyan-500/20">
                          3x3
                        </SelectItem>
                        <SelectItem value="4" className="hover:bg-cyan-500/20">
                          4x4
                        </SelectItem>
                        <SelectItem value="5" className="hover:bg-cyan-500/20">
                          5x5
                        </SelectItem>
                        <SelectItem value="6" className="hover:bg-cyan-500/20">
                          6x6
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sound Toggle */}
                  <div className="space-y-2">
                    <Label htmlFor="sound" className="text-sm text-cyan-200">
                      Sound
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sound"
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                        disabled={!isOwner}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                      {soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-cyan-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Mode Toggle */}
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="team-mode" className="text-sm text-cyan-200">
                    Team Mode
                  </Label>
                  <Switch
                    id="team-mode"
                    checked={teamMode}
                    onCheckedChange={toggleTeamMode}
                    disabled={!isOwner}
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>

                {/* Lockout Toggle */}
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

              {/* Start, Add to Overlay, and Reset Buttons */}
              {isOwner && (
                <div className="flex flex-col gap-2">
                  <NeonButton
                    className="bg-gradient-to-r from-fuchsia-500 to-yellow-400 hover:from-fuchsia-600 hover:to-yellow-500 text-white font-semibold transition-transform duration-200 ease-in-out hover:scale-105"
                    onClick={() => {
                      setIsTimerRunning(true)
                      // Implement additional start board logic here
                    }}
                    aria-label="Start Board"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Board
                  </NeonButton>

                  <NeonButton
                    className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                    onClick={() => {
                      // Implement Add to Ingame-Overlay functionality here
                      alert('Added to Ingame-Overlay!')
                    }}
                    aria-label="Add to Ingame-Overlay"
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    Add to Ingame-Overlay
                  </NeonButton>

                  <NeonButton
                    onClick={resetBoard}
                    className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-transform duration-200 ease-in-out hover:scale-105"
                    aria-label="Reset Board"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Board
                  </NeonButton>
                </div>
              )}

              <Separator className="bg-cyan-500/50" />

              {/* Save and Load Buttons */}
              <div className="space-y-2">
                <NeonButton
                  onClick={() => {
                    // Implement save functionality here
                    alert('Board saved!')
                  }}
                  className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-transform duration-200 ease-in-out hover:scale-105"
                  aria-label="Save Board"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </NeonButton>
                <NeonButton
                  onClick={() => {
                    // Implement load functionality here
                    alert('Load functionality not available in preview')
                  }}
                  className="bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-transform duration-200 ease-in-out hover:scale-105"
                  aria-label="Load Board"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Load
                </NeonButton>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Winner Modal */}
      <AnimatePresence>
        {winner !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            aria-modal="true"
            role="dialog"
          >
            <Card className="bg-gray-800 p-6 border-2 border-cyan-500">
              <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 mb-4 flex items-center">
                <Trophy className="mr-2 h-8 w-8 text-yellow-400" />
                {winner === -1 ? "Time's up!" : `${players[winner].name} Wins!`}
              </CardTitle>
              <CardContent>
                <p className="text-cyan-200 mb-4 text-lg">
                  {winner === -1
                    ? 'The game has ended in a tie!'
                    : `Congratulations to ${players[winner].name} for winning the Bingo Battle!`}
                </p>
                <NeonButton
                  onClick={resetBoard}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white text-lg font-semibold transition-transform duration-200 ease-in-out hover:scale-105"
                  aria-label="Play Again"
                >
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

export default BingoBoardDetail
