import React, { useState, useEffect } from 'react'
import { BingoGrid } from '../layout/BingoLayout'
import { Button } from '@/components/ui/button'
import { 
  Copy, 
  HelpCircle, 
  Monitor, 
  Share,
  Play,
  Wand2,
  BarChart2,
  Settings2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BingoCell } from './BingoCell'
import { WinnerModal } from './WinnerModal'
import type { BoardCell, Player } from '../shared/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { BoardGenerator } from './BoardGenerator'

interface BoardProps {
  boardState: BoardCell[]
  boardSize: number
  players: Player[]
  currentPlayer: number
  winner: number | null
  isOwner: boolean
  isGameStarted: boolean
  lockoutMode: boolean
  onCellChange: (index: number, value: string) => void
  onCellClick: (index: number) => void
  onReset: () => void
}

const Board = React.memo<BoardProps>(({
  boardState,
  boardSize,
  players,
  currentPlayer,
  winner,
  isOwner,
  isGameStarted,
  lockoutMode,
  onCellChange,
  onCellClick,
  onReset,
}) => {
  const [editingCell, setEditingCell] = useState<number | null>(null)
  const [boardId] = useState('')
  const [showBoardId] = useState(false)
  const [boardName, setBoardName] = useState('Bingo Board')
  const [overallProgress, setOverallProgress] = useState(0)

  // Calculate overall progress based on marked cells
  useEffect(() => {
    const completedCells = boardState.filter(cell => cell.colors.length > 0).length
    const totalCells = boardState.length
    setOverallProgress((completedCells / totalCells) * 100)
  }, [boardState])

  const copyBoardIdToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(boardId)
      alert('Board ID copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy board ID:', error)
      alert('Failed to copy Board ID. Please try again.')
    }
  }

  const checkIfCellIsPartOfWinningLine = (index: number): boolean => {
    if (winner === null) return false
    
    const winnerColor = players[winner]?.color
    if (!winnerColor) return false

    // Check horizontal line
    const row = Math.floor(index / boardSize)
    const horizontalStart = row * boardSize
    const horizontalLine = Array.from({ length: boardSize }, (_, i) => horizontalStart + i)
    const isHorizontalWin = horizontalLine.every(i => {
      const cell = boardState[i]
      return cell && cell.colors.includes(winnerColor)
    })
    if (isHorizontalWin) return true

    // Check vertical line
    const col = index % boardSize
    const verticalLine = Array.from({ length: boardSize }, (_, i) => col + (i * boardSize))
    const isVerticalWin = verticalLine.every(i => {
      const cell = boardState[i]
      return cell && cell.colors.includes(winnerColor)
    })
    if (isVerticalWin) return true

    // Check diagonals
    if (index % (boardSize + 1) === 0) {
      // Main diagonal
      const mainDiagonal = Array.from(
        { length: boardSize }, 
        (_, i) => i * (boardSize + 1)
      )
      const isMainDiagonalWin = mainDiagonal.every(i => {
        const cell = boardState[i]
        return cell && cell.colors.includes(winnerColor)
      })
      if (isMainDiagonalWin) return true
    }

    if (index % (boardSize - 1) === 0 && index !== 0 && index !== boardSize * boardSize - 1) {
      // Anti-diagonal
      const antiDiagonal = Array.from(
        { length: boardSize }, 
        (_, i) => (i + 1) * (boardSize - 1)
      )
      const isAntiDiagonalWin = antiDiagonal.every(i => {
        const cell = boardState[i]
        return cell && cell.colors.includes(winnerColor)
      })
      if (isAntiDiagonalWin) return true
    }

    return false
  }

  const getCellType = (): 'pvp' | 'pve' | 'quest' | 'achievement' | undefined => {
    // TODO: Implement cell type logic
    return undefined
  }

  const getCellProgress = (): number => {
    // TODO: Implement cell progress logic
    return 0
  }

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Header mit Tabs */}
      <div className="flex flex-col gap-3 flex-shrink-0">
        <Tabs defaultValue="play" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="bg-transparent text-lg font-bold text-cyan-400 border-none focus:ring-0"
                placeholder="Enter board name..."
              />
              <div className="flex items-center gap-2 text-sm text-cyan-300">
                <span>{boardSize}×{boardSize}</span>
              </div>
            </div>

            <TabsList className="bg-gray-800/50 border border-cyan-500/20">
              <TabsTrigger 
                value="play"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Play className="h-4 w-4 mr-2" />
                Play Mode
              </TabsTrigger>
              <TabsTrigger 
                value="generator"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generator
              </TabsTrigger>
              <TabsTrigger 
                value="stats"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Statistics
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="play" className="mt-0">
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="flex gap-2 mr-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {}}
                          className="h-8 bg-gray-700/50 hover:bg-gray-700/80 border border-cyan-500/30"
                        >
                          <Monitor className="h-4 w-4 text-cyan-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Push to Overlay</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {}}
                          className="h-8 bg-gray-700/50 hover:bg-gray-700/80 border border-cyan-500/30"
                        >
                          <Share className="h-4 w-4 text-cyan-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share Board</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 bg-gray-700/50 hover:bg-gray-700/80 border border-cyan-500/30"
                  >
                    <HelpCircle className="h-4 w-4 text-cyan-400" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800/95 border-cyan-500/30 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-cyan-400">
                      Quick Start Guide
                    </DialogTitle>
                  </DialogHeader>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-cyan-200 mt-4">
                    <li>Set up your board and players</li>
                    <li>Click &quot;Add to Ingame-Overlay&quot;</li>
                    <li>Adjust overlay position in-game</li>
                    <li>Click &quot;Start Board&quot; to begin</li>
                  </ol>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="generator" className="mt-0">
            <BoardGenerator 
              onApplyTemplate={(template) => {
                // Implementiere die Logik zum Anwenden des Templates
                console.log('Applying template:', template)
              }}
              onPreview={() => {
                // Implementiere die Preview-Logik
                console.log('Previewing board')
              }}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-cyan-500/20">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Board Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-sm text-cyan-300">Total Games</div>
                  <div className="text-2xl font-bold text-cyan-400">0</div>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-sm text-cyan-300">Win Rate</div>
                  <div className="text-2xl font-bold text-cyan-400">0%</div>
                </div>
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-sm text-cyan-300">Avg. Time</div>
                  <div className="text-2xl font-bold text-cyan-400">0:00</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-cyan-500/20">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Board Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-cyan-300">Public Board</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-cyan-300">Allow Cloning</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-cyan-300">Show Progress</Label>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden flex-shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Bingo Grid with optimized responsive layout */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div className="w-full max-w-[min(90vh,800px)] aspect-square">
          <BingoGrid 
            size={boardSize} 
            className="w-full h-full"
          >
            {boardState.map((cell, index) => {
              const isPartOfWinningLine = checkIfCellIsPartOfWinningLine(index)
              return (
                <BingoCell
                  key={index}
                  cell={cell}
                  index={index}
                  isOwner={isOwner}
                  isEditing={editingCell === index}
                  winner={winner}
                  currentPlayer={currentPlayer}
                  isGameStarted={isGameStarted}
                  lockoutMode={lockoutMode}
                  onCellChange={onCellChange}
                  onCellClick={onCellClick}
                  onEditStart={(idx) => setEditingCell(idx)}
                  onEditEnd={() => setEditingCell(null)}
                  isPartOfWinningLine={isPartOfWinningLine}
                  cellType={getCellType()}
                  progress={getCellProgress()}
                />
              )
            })}
          </BingoGrid>
        </div>
      </div>

      {/* Footer Elements */}
      <div className="flex-shrink-0">
        {/* Board ID Display */}
        {showBoardId && (
          <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md">
            <span className="text-sm text-cyan-400 font-mono truncate">
              Board ID: {boardId}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyBoardIdToClipboard}
              className="h-7 hover:bg-gray-700/50 ml-2 flex-shrink-0"
            >
              <Copy className="h-3 w-3 text-cyan-400 mr-1" />
              <span className="text-cyan-400 text-xs">Copy ID</span>
            </Button>
          </div>
        )}

        <WinnerModal winner={winner} players={players} onReset={onReset} />
      </div>
    </div>
  )
})

Board.displayName = 'Board'

export { Board }