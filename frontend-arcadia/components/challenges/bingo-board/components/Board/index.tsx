import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Share2,
  Monitor,
  HelpCircle,
  Download,
  Copy,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
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
import { BingoCell } from '../Board/BingoCell'
import { WinnerModal } from '../Board/WinnerModal'
import { BoardCell, Player } from '../shared/types'

interface BoardProps {
  boardState: BoardCell[]
  boardName: string
  boardSize: number
  players: Player[]
  currentPlayer: number
  winner: number | null
  isOwner: boolean
  isBookmarked: boolean
  onCellChange: (index: number, value: string) => void
  onCellClick: (index: number) => void
  onBoardNameChange: (name: string) => void
  onShare: () => void
  onBookmark: () => void
  onReset: () => void
}

export const Board: React.FC<BoardProps> = ({
  boardState,
  boardName,
  boardSize,
  players,
  winner,
  isOwner,
  isBookmarked,
  onCellChange,
  onCellClick,
  onBoardNameChange,
  onShare,
  onBookmark,
  onReset,
}) => {
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [editingCell, setEditingCell] = useState<number | null>(null)
  const [boardId, setBoardId] = useState('')
  const [showBoardId, setShowBoardId] = useState(false)

  const handleShare = async () => {
    const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    setBoardId(id)
    setShowBoardId(true)
    onShare()
  }

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
                onChange={(e) => onBoardNameChange(e.target.value)}
                onBlur={() => setEditingBoardName(false)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') setEditingBoardName(false)
                }}
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
              >
                {boardName}
              </span>
            )}

            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleShare}
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

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onBookmark}
                      aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Board'}
                      className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isBookmarked ? 'Remove Bookmark' : 'Bookmark Board'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-grow">
          <div
            className="grid gap-2 p-6 bg-gray-700 rounded-lg h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
              gap: '1rem',
              aspectRatio: '1',
              maxHeight: 'calc(100vh - 200px)',
              margin: 'auto'
            }}
          >
            {boardState.map((cell, index) => (
              <BingoCell
                key={index}
                cell={cell}
                index={index}
                isOwner={isOwner}
                isEditing={editingCell === index}
                winner={winner}
                onCellChange={onCellChange}
                onCellClick={onCellClick}
                onEditStart={(idx) => setEditingCell(idx)}
                onEditEnd={() => setEditingCell(null)}
              />
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between mt-4">
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

      <WinnerModal winner={winner} players={players} onReset={onReset} />
    </motion.div>
  )
}