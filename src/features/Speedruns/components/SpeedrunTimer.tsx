'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Timer, Trophy } from '@/components/ui/Icons';
import { useTimerState } from '@/features/play-area/stores/game-timer-store';

interface SpeedrunTimerProps {
  bestTime?: number | null;
}

export function SpeedrunTimer({ bestTime }: SpeedrunTimerProps) {
  const { elapsedTime, isRunning } = useTimerState();

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatBestTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const isPB = bestTime && elapsedTime / 1000 < bestTime;

  return (
    <Card className="border-gray-700 bg-gray-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-purple-400" />
          Speedrun Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Time */}
        <div className="text-center">
          <p className="text-sm text-gray-400">Current Time</p>
          <p
            className={`font-mono text-4xl font-bold transition-colors ${
              isRunning
                ? isPB
                  ? 'text-green-400'
                  : 'text-cyan-400'
                : 'text-gray-400'
            }`}
          >
            {formatTime(elapsedTime)}
          </p>
          {isRunning && isPB && (
            <p className="mt-1 animate-pulse text-sm text-green-400">
              ON PACE FOR PB!
            </p>
          )}
        </div>

        {/* Best Time */}
        {bestTime && (
          <div className="border-t border-gray-700 pt-4 text-center">
            <p className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Trophy className="h-4 w-4 text-yellow-400" />
              Personal Best
            </p>
            <p className="font-mono text-2xl font-bold text-yellow-400">
              {formatBestTime(bestTime)}
            </p>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div
            className={`h-2 w-2 rounded-full ${
              isRunning ? 'animate-pulse bg-green-400' : 'bg-gray-600'
            }`}
          />
          <span className={isRunning ? 'text-green-400' : 'text-gray-500'}>
            {isRunning ? 'Recording' : 'Not Recording'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
