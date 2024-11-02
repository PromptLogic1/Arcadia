import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Star, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Player } from '../shared/types'

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
        className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
        aria-modal="true"
        role="dialog"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md mx-4"
        >
          <div className="bg-gray-800/95 rounded-xl border-2 border-cyan-500/30 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 text-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-cyan-500/20 rounded-full p-4 border-2 border-cyan-500/30">
                  {winner === -1 ? (
                    <Star className="w-8 h-8 text-yellow-400" />
                  ) : (
                    <Crown className="w-8 h-8 text-yellow-400" />
                  )}
                </div>
              </div>
              
              <h2 className="mt-6 text-2xl font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 bg-clip-text text-transparent">
                {winner === -1 ? "Time's up!" : `${players[winner].name} Wins!`}
              </h2>
              
              <p className="mt-2 text-cyan-200 text-sm">
                {winner === -1
                  ? 'The game has ended in a tie!'
                  : `Congratulations to ${players[winner].name} for winning the Bingo Battle!`}
              </p>
            </div>

            {/* Winner Display */}
            {winner !== -1 && (
              <div className="px-6 py-4 bg-gray-800/50 border-y border-cyan-500/20">
                <div className="flex items-center justify-center gap-4">
                  <div 
                    className={`w-16 h-16 ${players[winner].color} rounded-full 
                      flex items-center justify-center text-2xl font-bold
                      shadow-lg shadow-cyan-500/10 border-2 border-cyan-500/30`}
                  >
                    {players[winner].name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-cyan-300">
                      {players[winner].name}
                    </h3>
                    <p className="text-sm text-cyan-400/60">
                      Winner
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 flex justify-center">
              <Button
                onClick={onReset}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 
                  border border-cyan-500/30 transition-all duration-200
                  hover:shadow-lg hover:shadow-cyan-500/10"
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Play Again
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}