'use client'

import React from 'react'
import { BingoLayout } from '@/components/challenges/bingo-board/components/layout/BingoLayout'
import BingoBattles from './_components/BingoBoardsHub'

export function BingoBoards() {
  return (
    <div className="space-y-4">
      <BingoLayout
        title="Bingo Boards"
        description="Create and manage your custom bingo boards"
      >
        <BingoBattles />
      </BingoLayout>
    </div>
  )
}