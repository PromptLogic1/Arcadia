'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Board } from '@/components/challenges/bingo-board/components/Board/Board'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/src/hooks/useAuth'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { BingoLayout } from '@/components/challenges/bingo-board/components/layout/BingoLayout'

interface BingoBoardDetailProps {
  boardId: string
}

export const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({ boardId }) => {
  const router = useRouter()
  const { isAuthenticated, userData, userRole } = useAuth()
  const { selectedBoard } = useBingoBoards()
  
  const canEdit = isAuthenticated && (
    userData?.id === selectedBoard?.creator_id || 
    userRole === 'admin'
  )

  if (!selectedBoard) {
    return <div>Board not found</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Boards
        </Button>

        <BingoLayout
          title={selectedBoard.board_title}
          description="Board Details"
        >
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-h-0">
              <div className="bg-gray-800/30 p-6 rounded-2xl border border-cyan-500/20 shadow-xl backdrop-blur-sm">
                <Board
                  boardState={selectedBoard.board_layoutbingocards}
                  className="max-w-3xl mx-auto"
                  isEditing={canEdit}
                />
              </div>
            </div>
          </div>
        </BingoLayout>
      </div>
    </div>
  )
}

export default BingoBoardDetail
