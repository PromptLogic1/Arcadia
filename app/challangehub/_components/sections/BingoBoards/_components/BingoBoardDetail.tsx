'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ThumbsUp, Copy, ArrowLeft, Save } from 'lucide-react'
import { cn } from "@/lib/utils"
import type { BingoBoard } from '@/src/store/types/bingoboard.types'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'

interface BingoBoardDetailProps {
  boardId: string
  onClose: () => void
}

export function BingoBoardDetail({ boardId, onClose }: BingoBoardDetailProps) {
  const { 
    boards,
    voteBoard, 
    cloneBoard, 
    updateBoard 
  } = useBingoBoards()
  
  // Get board directly from the boards array
  const board = boards.find(b => b.id === boardId)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVote = async () => {
    if (!board) return
    await voteBoard(board.id)
  }

  const handleClone = async () => {
    if (!board) return
    await cloneBoard(board.id)
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[875px] bg-gray-900 text-gray-100">
        {!board ? (
          <div className="text-red-400 p-4">Board not found</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                {board.board_title}
              </DialogTitle>
              {board.board_description && (
                <p className="text-cyan-300/70 mt-2">{board.board_description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300">
                  {board.board_game_type}
                </Badge>
                <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300">
                  {board.board_size}x{board.board_size}
                </Badge>
                <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300">
                  {board.board_difficulty}
                </Badge>
                <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300">
                  {board.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
            </DialogHeader>

            {/* Board Grid */}
            <div 
              className="grid gap-4 p-4" 
              style={{ 
                gridTemplateColumns: `repeat(${board.board_size}, minmax(0, 1fr))` 
              }}
            >
              {board.board_layoutbingocards.map((cell, index) => (
                <Card
                  key={cell.id || index}
                  className={cn(
                    "p-4 bg-gray-800/50 border-cyan-500/20",
                    "hover:border-cyan-500/40 transition-all duration-300"
                  )}
                >
                  <p className="text-sm text-cyan-300">{cell.text}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {cell.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {cell.difficulty}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-cyan-300 hover:text-cyan-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleVote}
                  className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Vote ({board.votes || 0})
                </Button>
                <Button
                  onClick={handleClone}
                  className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BingoBoardDetail
