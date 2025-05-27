'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Trophy, RotateCcw } from 'lucide-react'
import { useGameState } from '../../hooks/useGameState'
import { cn } from '@/lib/utils'

export const WinnerModal: React.FC = () => {
  const {
    winner,
    players,
    resetGame,
    isRunning
  } = useGameState()

  if (winner === null || isRunning) return null

  const winningPlayer = players[winner]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "fixed inset-0 z-50",
          "flex items-center justify-center",
          "bg-gray-900/80 backdrop-blur-sm"
        )}
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className={cn(
            "bg-gray-800 rounded-lg",
            "border border-cyan-500/20",
            "p-6 max-w-md w-full mx-4",
            "text-center"
          )}
        >
          <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-cyan-400 mb-2">
            Congratulations!
          </h2>
          <p className="text-lg text-gray-300 mb-6">
            {winningPlayer?.name || 'Unknown Player'} wins!
          </p>
          <Button
            onClick={resetGame}
            className={cn(
              "bg-cyan-500/10 hover:bg-cyan-500/20",
              "text-cyan-400 hover:text-cyan-300",
              "border border-cyan-500/30"
            )}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Play Again
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}