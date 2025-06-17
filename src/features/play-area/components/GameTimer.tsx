'use client';

import React from 'react';
import { Clock } from '@/components/ui/Icons';
import { useTimerState, useTimerActions } from '../stores/game-timer-store';

export function GameTimer() {
  const { isRunning, isPaused } = useTimerState();
  const { getFormattedTime } = useTimerActions();

  const formattedTime = getFormattedTime();

  return (
    <div className="flex items-center gap-2">
      <Clock
        className={`h-5 w-5 transition-colors ${
          isRunning
            ? 'animate-pulse text-cyan-400'
            : isPaused
              ? 'text-yellow-400'
              : 'text-gray-400'
        }`}
      />
      <span
        className={`font-mono text-2xl font-bold transition-colors ${
          isRunning
            ? 'text-cyan-400'
            : isPaused
              ? 'text-yellow-400'
              : 'text-gray-400'
        }`}
      >
        {formattedTime}
      </span>
      {isPaused && (
        <span className="ml-2 animate-pulse text-sm text-yellow-400">
          PAUSED
        </span>
      )}
    </div>
  );
}
