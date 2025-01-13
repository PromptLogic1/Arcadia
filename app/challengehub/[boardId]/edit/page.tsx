'use client'

import { BingoBoardEdit } from '@/src/features/BingoBoards/BingoBoardsEdit/BingoBoardEdit'
import { useRouter } from 'next/navigation'
import { use } from "react"

interface BoardEditPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default function BoardEditPage({ params }: BoardEditPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)

  if (!resolvedParams.boardId) {
    return <div className="text-center text-red-500 mt-4">Invalid board ID</div>
  }

  return (
    <BingoBoardEdit 
      boardId={resolvedParams.boardId} 
      onSaveSuccess={() => {
        // Remove or comment out any navigation/redirect logic
        // Just handle success state if needed
      }} 
    />
  )
} 