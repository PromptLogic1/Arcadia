'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Trophy, RotateCcw } from '@/components/ui/Icons';
import { useGameModern } from '../../hooks/useSessionGame';
import { cn } from '@/lib/utils';

export const WinnerModal: React.FC = () => {
  const { game, resetGame } = useGameModern();
  const { winner, isRunning } = game;

  if (winner === null || isRunning) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        'bg-gray-900/80 backdrop-blur-sm',
        'animate-fade-in'
      )}
    >
      <div
        className={cn(
          'rounded-lg bg-gray-800',
          'border border-cyan-500/20',
          'mx-4 w-full max-w-md p-6',
          'text-center',
          'animate-slide-up'
        )}
      >
        <Trophy className="animate-bounce-subtle mx-auto mb-4 h-12 w-12 text-yellow-400" />
        <h2 className="mb-2 text-2xl font-bold text-cyan-400">
          Congratulations!
        </h2>
        <p className="mb-6 text-lg text-gray-300">Player {winner + 1} wins!</p>
        <Button
          onClick={resetGame}
          className={cn(
            'bg-cyan-500/10 hover:bg-cyan-500/20',
            'text-cyan-400 hover:text-cyan-300',
            'border border-cyan-500/30',
            'transition-all duration-200 hover:scale-105'
          )}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Play Again
        </Button>
      </div>
    </div>
  );
};
