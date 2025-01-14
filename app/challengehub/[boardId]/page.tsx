'use client'

import { BingoBoardEdit } from '@/src/features/BingoBoards/BingoBoardsEdit/BingoBoardEdit'
import { useRouter } from 'next/navigation'
import { use } from "react"

interface BoardPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default function BoardPage({ params }: BoardPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)

  if (!resolvedParams.boardId) {
    return <div className="text-center text-red-500 mt-4">Invalid board ID</div>
  }

  return (
    <BingoBoardEdit 
      boardId={resolvedParams.boardId} 
      onSaveSuccess={() => {
        // Handle success state if needed
      }} 
    />
  )
} 