'use client'

import { Button } from "@/components/ui/button"
import { PlusCircle } from 'lucide-react'
import { Filter } from '@/components/filter/filter'
import { DIFFICULTY_OPTIONS, DEFAULT_SORT_OPTIONS } from '@/components/filter/types'
import { GAMES } from '@/src/store/types/game.types'
import { BoardCard } from './BoardCard'
import { CreateBoardForm } from '@/components/challenges/bingo-board/components/Board/CreateBoardForm'
import NeonText from '@/components/ui/NeonText'
import { useBingoBoardsHub } from './hooks/useBingoBoardsHub'
import { useRouter } from 'next/navigation'
import { useCallback } from "react"

export default function BingoBoardsHub() {
  const {
    boards,
    isCreateFormOpen,
    filterSelections,
    handleFilterChange,
    handleCreateBoard,
    setIsCreateFormOpen,
    handleBoardSelect,
  } = useBingoBoardsHub()

  const router = useRouter()

  // Convert game categories to filter options format
  const categoryOptions = [
    { value: '__all__', label: 'All Games' },
    ...Object.values(GAMES)
      .filter(game => game !== 'All Games')
      .map(game => ({
        value: game,
        label: game
      }))
  ]

  return (
    <div className="space-y-6">
      <Filter
        filterOptions={{
          categories: categoryOptions,
          difficulties: DIFFICULTY_OPTIONS,
          sortOptions: DEFAULT_SORT_OPTIONS,
          enableSearch: true
        }}
        selections={filterSelections}
        onFilterChange={handleFilterChange}
      />

      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">
          <NeonText>Your Bingo Boards</NeonText>
        </h3>
        <Button
          onClick={() => setIsCreateFormOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Board
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onClick={() => handleBoardSelect(board.id)}
          />
        ))}
      </div>

      <CreateBoardForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSubmit={handleCreateBoard}
      />
    </div>
  )
}