'use client'

import React from 'react'
import { BingoGrid } from '../layout/BingoLayout'
import { BingoCell } from './BingoCell'
import { useGameState } from '../../hooks/useGameState'
import { cn } from '@/lib/utils'

interface BoardProps {
  onCellClick?: (index: number) => void
  className?: string
}

export const Board: React.FC<BoardProps> = ({
  onCellClick,
  className
}) => {
  const { boardState } = useGameState()
  const boardSize = Math.sqrt(boardState.length)

  return (
    <div className={cn("relative w-full aspect-square", className)}>
      <BingoGrid size={boardSize}>
        {boardState.map((cell, index) => (
          <BingoCell
            key={cell.cellId || index}
            cell={cell}
            index={index}
            onClick={onCellClick}
          />
        ))}
      </BingoGrid>
    </div>
  )
} 