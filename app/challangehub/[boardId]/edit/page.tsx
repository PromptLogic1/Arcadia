'use client'

import { BingoBoardEdit } from '@/src/features/BingoBoards/BingoBoardsEdit/BingoBoardEdit'
import { notFound, useRouter } from 'next/navigation'
import { use } from 'react'

interface BoardEditPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default function BoardEditPage({ params }: BoardEditPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)

  if (!resolvedParams.boardId) return notFound()

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