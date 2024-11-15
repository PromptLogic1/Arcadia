'use client'

import React from 'react'
import { BingoGrid } from '../layout/BingoLayout'
import type { BoardCell } from '../../types/types'

interface BoardPreviewProps {
  board: BoardCell[]
  size: number
}

export const BoardPreview: React.FC<BoardPreviewProps> = ({
  board,
  size
}) => {
  return (
    <div className="w-full aspect-square max-w-[500px] mx-auto">
      <BingoGrid size={size}>
        {board.map((cell, index) => (
          <div
            key={cell.cellId || index}
            className="bg-gray-800/50 rounded-lg p-2 text-sm text-gray-300
              border border-cyan-500/20 hover:border-cyan-500/40
              transition-colors duration-200"
          >
            {cell.text}
          </div>
        ))}
      </BingoGrid>
    </div>
  )
} 