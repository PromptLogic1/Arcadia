import React, { useState } from 'react'
import { BingoGrid } from '../layout/BingoLayout'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { BingoCell } from './BingoCell'
import { WinnerModal } from './WinnerModal'
import type { BoardCell, Player } from '../../types/types'
import { useLayout } from '../../hooks/useLayout' 
import { cn } from '@/lib/utils'

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

  const { getGridLayout, getFluidTypography } = useLayout()
  const gridStyles = getGridLayout(boardSize, false)
  const typography = getFluidTypography(16, 14) // Changed string values to numbers

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

  const handleCellClick = (index: number) => {
    onCellClick(index)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board Grid */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div 
          className={cn(
            "w-full max-w-[min(95vh,1000px)]",
            "aspect-square",
            "bg-gray-800/80 rounded-lg",
            "border border-cyan-500/20",
            "shadow-inner",
            "p-2 sm:p-3 md:p-4"
          )}
          style={gridStyles}
        >
          <BingoGrid 
            size={boardSize} 
            className="w-full h-full"
          >
            {boardState.map((cell, index) => (
              <BingoCell
                key={index}
                cell={cell}
                index={index}
                isOwner={isOwner}
                isEditing={editingCell === index}
                winner={winner}
                currentPlayer={currentPlayer}
                players={players}
                isGameStarted={isGameStarted}
                lockoutMode={lockoutMode}
                onCellChange={onCellChange}
                onCellClick={handleCellClick}
                _onEditStart={(idx) => setEditingCell(idx)}
                onEditEnd={() => setEditingCell(null)}
                isPartOfWinningLine={checkIfCellIsPartOfWinningLine(index)}
                typography={typography}
              />
            ))}
          </BingoGrid>
        </div>
      </div>

      {/* Footer Elements */}
      {showBoardId && (
        <div className="flex-shrink-0 p-2 bg-gray-800/50 rounded-md">
          <div className="flex items-center justify-between">
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
        </div>
      )}

      <WinnerModal winner={winner} players={players} onReset={onReset} />
    </div>
  )
})

Board.displayName = 'Board'

export { Board }