'use client'

import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGameState } from '../../hooks/useGameState'
import type { BoardCell } from '../../types/types'

interface BingoCellProps {
  cell: BoardCell
  index: number
  onClick?: (index: number) => void
  className?: string
}

export const BingoCell: React.FC<BingoCellProps> = ({
  cell,
  index,
  onClick,
  className
}) => {
  const {
    players,
    currentPlayer,
    winner,
    isRunning,
    settings
  } = useGameState()

  const handleClick = useCallback(() => {
    if (!isRunning || winner !== null) return
    if (!players[currentPlayer]) return

    // Check lockout rule
    if (settings.lockout && cell.colors.length > 0) return

    // Check if it's team mode and the cell is already marked by teammate
    if (settings.teamMode && 
        cell.colors.some(color => 
          players.some(p => 
            p.color === color && 
            p.team === players[currentPlayer]?.team
          )
        )
    ) return

    onClick?.(index)
  }, [
    cell,
    index,
    isRunning,
    winner,
    players,
    currentPlayer,
    settings,
    onClick
  ])

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        "w-full h-full p-2",
        "bg-gray-800/50 rounded-lg",
        "border border-cyan-500/20",
        "transition-colors duration-200",
        "hover:border-cyan-500/40",
        "focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        {
          'cursor-pointer': isRunning && winner === null,
          'cursor-not-allowed': !isRunning || winner !== null
        },
        className
      )}
      disabled={!isRunning || winner !== null}
      whileHover={{ scale: isRunning && winner === null ? 1.05 : 1 }}
      whileTap={{ scale: isRunning && winner === null ? 0.95 : 1 }}
    >
      <div className="relative w-full h-full">
        {/* Cell Text */}
        <span className="text-sm text-gray-300">
          {cell.text}
        </span>

        {/* Player Colors */}
        {cell.colors.length > 0 && (
          <div className="absolute inset-0 flex flex-wrap gap-1 p-1">
            {cell.colors.map((color, i) => (
              <div
                key={`${color}-${i}`}
                className={cn(
                  "w-2 h-2 rounded-full",
                  color
                )}
              />
            ))}
          </div>
        )}

        {/* Winner Highlight */}
        {winner !== null && cell.colors.includes(players[winner]?.color || '') && (
          <div className="absolute inset-0 bg-green-500/20 rounded-lg" />
        )}
      </div>
    </motion.button>
  )
}
