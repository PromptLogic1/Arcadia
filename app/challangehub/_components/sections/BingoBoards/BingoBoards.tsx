'use client'

import React from 'react'
import { BingoLayout } from '@/components/challenges/bingo-board/components/layout/BingoLayout'
import BingoBattles from './_components/BingoBoardsHub'
import { useAuth } from '@/src/hooks/useAuth'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'

export function BingoBoards() {
  const { userData } = useAuth()
  const { boards, isLoading, error } = useBingoBoards()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading bingo boards: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <BingoLayout
        title="Bingo Boards"
        description="Create and manage your custom bingo boards"
      >
        <BingoBattles initialBoards={boards} />
      </BingoLayout>
    </div>
  )
}