import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BingoGrid } from '../layout/BingoLayout'
import { Button } from '@/components/ui/button'
import { Copy, HelpCircle, Monitor, Bookmark, BookmarkCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BingoCell } from './BingoCell'
import { WinnerModal } from './WinnerModal'
import type { BoardCell, Player } from '../shared/types'

interface BoardProps {
  boardState: BoardCell[]
  boardSize: number
  players: Player[]
  currentPlayer: number
  winner: number | null
  isOwner: boolean
  isBookmarked: boolean
  isGameStarted: boolean
  lockoutMode: boolean
  onCellChange: (index: number, value: string) => void
  onCellClick: (index: number) => void
  onBookmark?: () => void
  onReset: () => void
}

const Board = React.memo<BoardProps>(({
  boardState,
  boardSize,
  players,
  currentPlayer,
  winner,
  isOwner,
  isBookmarked,
  isGameStarted,
  lockoutMode,
  onCellChange,
  onCellClick,
  onBookmark,
  onReset,
}) => {
  const [editingCell, setEditingCell] = useState<number | null>(null)
  const [boardId] = useState('')
  const [showBoardId] = useState(false)
  const [boardName, setBoardName] = useState('Bingo Board')
  const [overallProgress, setOverallProgress] = useState(0)

  // Berechne den Gesamtfortschritt basierend auf den markierten Zellen
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

  const checkIfCellIsPartOfWinningLine = (): boolean => {
    // TODO: Implementiere die Logik zur Überprüfung, ob eine Zelle Teil einer Gewinnlinie ist
    return false
  }

  const getCellType = (): 'pvp' | 'pve' | 'quest' | 'achievement' | undefined => {
    // TODO: Implementiere die Logik zur Bestimmung des Zellentyps
    return undefined
  }

  const getCellProgress = (): number => {
    // TODO: Implementiere die Logik zur Berechnung des Fortschritts einer Zelle
    return 0
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header mit editierbarem Namen und Action-Buttons */}
      <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg border border-cyan-500/20">
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
        
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBookmark}
                  className="h-8 bg-gray-700/50 hover:bg-gray-700/80 border border-cyan-500/30"
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <Bookmark className="h-4 w-4 text-cyan-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isBookmarked ? 'Remove from My Boards' : 'Add to My Boards'}
              </TooltipContent>
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
                  <Monitor className="h-4 w-4 text-cyan-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Push to Overlay</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
      </div>

      {/* Progress Bar für Gesamtfortschritt */}
      <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Bingo Grid mit Winning Lines */}
      <BingoGrid size={boardSize} className="flex-1">
        {boardState.map((cell, index) => {
          const isPartOfWinningLine = checkIfCellIsPartOfWinningLine();
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
          );
        })}
      </BingoGrid>

      {/* Celebration Effect */}
      <AnimatePresence>
        {winner !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board ID Display */}
      {showBoardId && (
        <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md">
          <span className="text-sm text-cyan-400 font-mono">
            Board ID: {boardId}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyBoardIdToClipboard}
            className="h-7 hover:bg-gray-700/50"
          >
            <Copy className="h-3 w-3 text-cyan-400 mr-1" />
            <span className="text-cyan-400 text-xs">Copy ID</span>
          </Button>
        </div>
      )}

      <WinnerModal winner={winner} players={players} onReset={onReset} />
    </div>
  )
})

Board.displayName = 'Board'

export { Board }