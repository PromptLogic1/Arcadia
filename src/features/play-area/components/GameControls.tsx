'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Pause, RotateCcw, Square } from '@/components/ui/Icons';
import { useTimerState, useTimerActions } from '../stores/game-timer-store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GameTimer } from './GameTimer';

interface GameControlsProps {
  isHost: boolean;
  gameStatus: string;
  onStartGame?: () => void;
  onEndGame?: () => void;
  isStarting?: boolean;
  disabled?: boolean;
}

export function GameControls({
  isHost,
  gameStatus,
  onStartGame,
  onEndGame,
  isStarting = false,
  disabled = false,
}: GameControlsProps) {
  const { isRunning, isPaused } = useTimerState();
  const { start, pause, resume, reset } = useTimerActions();

  // Handle game start
  const handleStartGame = () => {
    if (onStartGame) {
      onStartGame();
    }
    start();
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  // Handle reset
  const handleReset = () => {
    reset();
  };

  // Handle end game
  const handleEndGame = () => {
    if (onEndGame) {
      onEndGame();
    }
    reset();
  };

  if (gameStatus === 'waiting' && isHost) {
    return (
      <div className="flex items-center gap-4">
        <Button
          onClick={handleStartGame}
          disabled={isStarting || disabled}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          {isStarting ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Starting...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Game
            </>
          )}
        </Button>
      </div>
    );
  }

  if (gameStatus !== 'active') {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Timer Display */}
      <GameTimer />

      {/* Control Buttons */}
      <div className="flex gap-2">
        {isHost && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePauseResume}
              disabled={disabled || (!isRunning && !isPaused)}
              className={
                isPaused
                  ? 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                  : 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10'
              }
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              )}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleReset}
              disabled={disabled || (!isRunning && !isPaused)}
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Timer
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleEndGame}
              disabled={disabled}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Square className="mr-2 h-4 w-4" />
              End Game
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
