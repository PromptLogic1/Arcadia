'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useSessionStateQuery,
  useBoardStateQuery,
  useMarkCellMutation,
  useCompleteGameMutation,
  useStartSessionMutation,
} from '@/hooks/queries/useGameStateQueries';
import { WinDetectionService } from '../services/win-detection.service';
import type { WinDetectionResult } from '../types';

export function useBingoGame(sessionId: string) {
  const winDetector = useMemo(() => new WinDetectionService(5), []); // Assuming 5x5 board

  // Mount tracking
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Queries
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useSessionStateQuery(sessionId);

  const {
    data: boardData,
    isLoading: boardLoading,
    error: boardError,
  } = useBoardStateQuery(sessionId);

  // Mutations
  const startGameMutation = useStartSessionMutation();
  const markCellMutation = useMarkCellMutation(sessionId);
  const completeGameMutation = useCompleteGameMutation();

  // Derived state - memoize boardState to prevent dependency changes
  const boardState = useMemo(
    () => boardData?.boardState || [],
    [boardData?.boardState]
  );
  const version = boardData?.version || 0;
  const loading = sessionLoading || boardLoading;
  const error = sessionError || boardError || null;
  const isWinner = !!session?.winner_id;

  // Win detection
  const winResult = useMemo<WinDetectionResult | null>(() => {
    if (
      !boardState ||
      boardState.length === 0 ||
      session?.status !== 'active'
    ) {
      return null;
    }
    return winDetector.detectWin(boardState);
  }, [boardState, session?.status, winDetector]);

  // Actions
  const markCell = useCallback(
    async (cellPosition: number, userId: string) => {
      try {
        await markCellMutation.mutateAsync({
          cell_position: cellPosition,
          user_id: userId,
          action: 'mark',
          version,
        });
      } catch (error) {
        // Only throw if component is still mounted
        if (isMountedRef.current) {
          throw error;
        }
      }
    },
    [markCellMutation, version]
  );

  const unmarkCell = useCallback(
    async (cellPosition: number, userId: string) => {
      try {
        await markCellMutation.mutateAsync({
          cell_position: cellPosition,
          user_id: userId,
          action: 'unmark',
          version,
        });
      } catch (error) {
        // Only throw if component is still mounted
        if (isMountedRef.current) {
          throw error;
        }
      }
    },
    [markCellMutation, version]
  );

  const startGame = useCallback(async () => {
    try {
      await startGameMutation.mutateAsync({ sessionId });
    } catch (error) {
      // Only throw if component is still mounted
      if (isMountedRef.current) {
        throw error;
      }
    }
  }, [startGameMutation, sessionId]);

  const declareWinner = useCallback(
    async (userId: string) => {
      if (!winResult || !winResult.hasWin || isWinner) return;

      try {
        await completeGameMutation.mutateAsync({
          sessionId,
          data: {
            winner_id: userId,
            winning_patterns: winResult.patterns.map(p => p.name),
            final_score: winResult.totalPoints,
          },
        });
      } catch (error) {
        // Only throw if component is still mounted
        if (isMountedRef.current) {
          throw error;
        }
      }
    },
    [completeGameMutation, sessionId, winResult, isWinner]
  );

  return {
    session,
    boardState,
    version,
    loading,
    error: error
      ? typeof error === 'string'
        ? error
        : 'An error occurred'
      : null,
    markCell,
    unmarkCell,
    startGame,
    winResult,
    isWinner,
    declareWinner,
    isMarkingCell: markCellMutation.isPending,
    isStartingGame: startGameMutation.isPending,
    isCompletingGame: completeGameMutation.isPending,
  };
}
