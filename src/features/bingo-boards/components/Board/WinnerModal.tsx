'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCcw } from 'lucide-react';
import { useGameModern } from '../../hooks/useSessionGameModern';
import { cn } from '@/lib/utils';

export const WinnerModal: React.FC = () => {
  const { game, resetGame } = useGameModern();
  const { winner, isRunning } = game;

  if (winner === null || isRunning) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          'fixed inset-0 z-50',
          'flex items-center justify-center',
          'bg-gray-900/80 backdrop-blur-sm'
        )}
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className={cn(
            'rounded-lg bg-gray-800',
            'border border-cyan-500/20',
            'mx-4 w-full max-w-md p-6',
            'text-center'
          )}
        >
          <Trophy className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
          <h2 className="mb-2 text-2xl font-bold text-cyan-400">
            Congratulations!
          </h2>
          <p className="mb-6 text-lg text-gray-300">
            Player {winner + 1} wins!
          </p>
          <Button
            onClick={resetGame}
            className={cn(
              'bg-cyan-500/10 hover:bg-cyan-500/20',
              'text-cyan-400 hover:text-cyan-300',
              'border border-cyan-500/30'
            )}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Play Again
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
