'use client';

import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Check } from '@/components/ui/Icons';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import type { BoardCell } from '@/types/domains/bingo';

interface GameBoardProps {
  boardState: BoardCell[];
  onCellClick?: (position: number) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  currentUserId?: string;
  playerColor?: string;
}

export function GameBoard({
  boardState,
  onCellClick,
  isLoading = false,
  disabled = false,
  currentUserId,
  playerColor,
}: GameBoardProps) {
  const [clickingCell, setClickingCell] = useState<number | null>(null);

  const handleCellClick = useCallback(
    async (position: number) => {
      if (disabled || !onCellClick || clickingCell !== null) return;

      const cell = boardState[position];
      if (!cell) return;

      try {
        setClickingCell(position);
        await onCellClick(position);
      } catch (error) {
        logger.error(
          'Failed to mark cell',
          error instanceof Error ? error : new Error(String(error)),
          {
            metadata: { position, cellId: cell.cell_id },
          }
        );
        notifications.error('Failed to mark cell');
      } finally {
        setClickingCell(null);
      }
    },
    [disabled, onCellClick, clickingCell, boardState]
  );

  if (isLoading) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-900/50">
        <div className="space-y-2 text-center">
          <LoadingSpinner className="mx-auto h-8 w-8" />
          <p className="text-gray-400">Loading game board...</p>
        </div>
      </div>
    );
  }

  // Assuming 5x5 board
  const gridSize = 5;

  return (
    <div className="mx-auto aspect-square max-w-2xl">
      <div className={`grid grid-cols-${gridSize} gap-2`}>
        {boardState.map((cell, index) => {
          const isMarked = cell.is_marked;
          const isMarkedByCurrentUser = cell.last_modified_by === currentUserId;
          const isCenter = index === Math.floor(boardState.length / 2);
          const isClickable = !disabled && !isCenter && !!onCellClick;
          const isClicking = clickingCell === index;

          return (
            <Card
              key={cell.cell_id || index}
              className={`relative aspect-square cursor-pointer border-2 transition-all duration-200 ${isCenter ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800/50'} ${isMarked ? 'scale-95 border-cyan-500 bg-cyan-900/30' : ''} ${isClickable && !isMarked ? 'hover:border-cyan-400 hover:bg-gray-700/50' : ''} ${isClickable && isMarked ? 'hover:border-red-400' : ''} ${isClicking ? 'animate-pulse' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
              onClick={() => isClickable && handleCellClick(index)}
            >
              <CardContent className="flex h-full flex-col items-center justify-center p-2 text-center">
                {/* Cell content */}
                <p
                  className={`text-sm font-medium ${
                    isMarked ? 'text-cyan-300' : 'text-gray-200'
                  }`}
                >
                  {isCenter ? 'FREE' : cell.text}
                </p>

                {/* Marked indicator */}
                {isMarked && !isClicking && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                    style={{
                      backgroundColor: isMarkedByCurrentUser
                        ? `${playerColor}20`
                        : undefined,
                    }}
                  >
                    <Check className="h-8 w-8 text-cyan-400 drop-shadow-lg" />
                  </div>
                )}

                {/* Loading indicator */}
                {isClicking && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <LoadingSpinner className="h-6 w-6" />
                  </div>
                )}

                {/* Player color indicator */}
                {isMarked && cell.last_modified_by && (
                  <div
                    className="absolute right-1 bottom-1 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isMarkedByCurrentUser
                        ? playerColor
                        : '#666',
                    }}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      {!disabled && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Click cells to mark them. Get 5 in a row to win!
        </div>
      )}
    </div>
  );
}
