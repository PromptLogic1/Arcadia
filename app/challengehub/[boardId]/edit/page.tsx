'use client'

import { BingoBoardEdit } from '@/src/features/BingoBoards/BingoBoardsEdit/BingoBoardEdit'
import { notFound, useRouter } from 'next/navigation'
import { use, useEffect } from 'react'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'

interface BoardEditPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default function BoardEditPage({ params }: BoardEditPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)

  useEffect(() => {
    const loadBoard = async () => {
      if (!resolvedParams.boardId) {
        notFound()
        return
      }
      const board = await bingoBoardService.loadBoardForEditing(resolvedParams.boardId)
      if (!board) {
        notFound()
      }
    }
    loadBoard()
  }, [resolvedParams.boardId])

  const handleSaveSuccess = () => {
    router.push('/challengehub')
  }

  return (
    <BingoBoardEdit 
      boardId={resolvedParams.boardId} 
      onSaveSuccess={handleSaveSuccess}
    />
  )
} 