import React, { useState } from 'react'
import { BingoLayout, BingoGrid } from '../layout/BingoLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HelpCircle, Copy, Share2, Monitor, Bookmark, BookmarkCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BingoCell } from './BingoCell'
import { WinnerModal } from './WinnerModal'
import { BoardCell, Player } from '../shared/types'

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
  onBookmark: () => void
  onReset: () => void
}

export const Board: React.FC<BoardProps> = ({
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

  const copyBoardIdToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(boardId)
      alert('Board ID copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy board ID:', error)
      alert('Failed to copy Board ID. Please try again.')
    }
  }

  return (
    <BingoLayout
      delay={0.2}
      direction="left"
      className="h-full"
      fullHeight
    >
      <div className="flex flex-col h-full gap-3">
        {/* Board Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
                    <Share2 className="h-4 w-4 text-cyan-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share Board</TooltipContent>
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
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 bg-gray-700/50 hover:bg-gray-700/80 border border-cyan-500/30"
              >
                <HelpCircle className="h-4 w-4 text-cyan-400 mr-2" />
                <span className="text-cyan-400 text-xs">Quick Start Guide</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800/95 border-cyan-500/30 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-cyan-400">
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
        </div>

        {/* Bingo Grid */}
        <BingoGrid size={boardSize} className="flex-1">
          {boardState.map((cell, index) => (
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
            />
          ))}
        </BingoGrid>

        {/* Board ID Display */}
        {showBoardId && (
          <Card className="bg-gray-800/90 border border-cyan-500/30">
            <CardContent className="flex items-center justify-between p-2">
              <span className="text-sm text-cyan-400 font-mono">
                Board ID: {boardId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyBoardIdToClipboard}
                className="h-7 bg-gray-700/50 hover:bg-gray-700/80 border border-cyan-500/30"
              >
                <Copy className="h-3 w-3 text-cyan-400 mr-1" />
                <span className="text-cyan-400 text-xs">Copy ID</span>
              </Button>
            </CardContent>
          </Card>
        )}

        <WinnerModal winner={winner} players={players} onReset={onReset} />
      </div>
    </BingoLayout>
  )
}