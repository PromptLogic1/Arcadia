'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BingoBoardDetail } from '@/app/challangehub/_components/sections/BingoBoards/_components/BingoBoardDetail'
import { BingoErrorBoundary } from '@/app/challangehub/_components/sections/BingoBoards/_components/BingoErrorBoundary'
import LoadingSpinner from '@/components/ui/loading-spinner'

export default function BoardDetailPage() {
  const params = useParams()
  const [board, setBoard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        // Replace with your actual API call
        const response = await fetch(`/api/boards/${params.boardId}`)
        const data = await response.json()
        setBoard(data)
      } catch (error) {
        console.error('Failed to fetch board:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBoard()
  }, [params.boardId])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!board) {
    return <div>Board not found</div>
  }

  return (
    <BingoErrorBoundary>
      <BingoBoardDetail board={board} />
    </BingoErrorBoundary>
  )
} 