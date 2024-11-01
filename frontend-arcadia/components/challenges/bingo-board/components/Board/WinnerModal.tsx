import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { Card, CardTitle, CardContent } from '@/components/ui/card'
import { Player } from '../shared/types'
import { NeonButton } from '@/components/ui/NeonButton'

interface WinnerModalProps {
  winner: number | null
  players: Player[]
  onReset: () => void
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  players,
  onReset,
}) => {
  if (winner === null) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        aria-modal="true"
        role="dialog"
      >
        <Card className="bg-gray-800 p-6 border-2 border-cyan-500">
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 mb-4 flex items-center">
            <Trophy className="mr-2 h-8 w-8 text-yellow-400" />
            {winner === -1 ? "Time's up!" : `${players[winner].name} Wins!`}
          </CardTitle>
          <CardContent>
            <p className="text-cyan-200 mb-4 text-lg">
              {winner === -1
                ? 'The game has ended in a tie!'
                : `Congratulations to ${players[winner].name} for winning the Bingo Battle!`}
            </p>
            <NeonButton
              onClick={onReset}
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white text-lg font-semibold transition-transform duration-200 ease-in-out hover:scale-105"
              aria-label="Play Again"
            >
              Play Again
            </NeonButton>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}