'use client'

import React, { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BingoGrid } from '../layout/BingoLayout'
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
  const {
    boardState,
    players,
    settings,
    currentPlayer,
    winner,
    isRunning
  } = useGameState()

  // Memoize board size calculation
  const boardSize = useMemo(() => 
    Math.sqrt(boardState.length), 
    [boardState.length]
  )

  // Handle cell click with game rules
  const handleCellClick = useCallback((index: number) => {
    if (!isRunning || winner !== null) return
    if (!players[currentPlayer]) return
    
    const cell = boardState[index]
    if (!cell) return

    // Check lockout rule
    if (settings.lockout && cell.colors.length > 0) return

    // Check if it's team mode and the cell is already marked by teammate
    if (settings.teamMode && 
        cell.colors.some(color => 
          players[currentPlayer]?.team === players[currentPlayer]?.team && 
          players[currentPlayer]?.team === players[currentPlayer]?.team
        )
    ) return

    onCellClick?.(index)
  }, [
    isRunning,
    winner,
    players,
    currentPlayer,
    boardState,
    settings.lockout,
    settings.teamMode,
    onCellClick
  ])

  return (
    <div className={cn("relative w-full aspect-square", className)}>
      <BingoGrid size={boardSize}>
        {boardState.map((cell, index) => (
          <motion.button
            key={cell.cellId || index}
            onClick={() => handleCellClick(index)}
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
              }
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
        ))}
      </BingoGrid>

      {/* Game Over Overlay */}
      {(winner !== null || !isRunning) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm rounded-lg">
          <span className="text-lg font-medium text-white">
            {winner !== null 
              ? `Winner: ${players[winner]?.name || 'Unknown'}`
              : 'Game Paused'
            }
          </span>
        </div>
      )}
    </div>
  )
}