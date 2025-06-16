'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useSessionStateQuery,
  useBoardStateQuery,
  useMarkCellMutation,
  useCompleteGameMutation,
  useStartGameSessionMutation,
  useGamePlayersQuery,
} from '@/hooks/queries/useGameStateQueries';
import { WinDetectionService } from '../services/win-detection.service';
export function useBingoGame(sessionId: string) {
  const winDetector = useMemo(() => new WinDetectionService(5), []);

  const {
    data: sessionData,
    isLoading: sessionLoading,
    error: sessionError,
  } = useSessionStateQuery(sessionId);

  const {
    data: boardData,
    isLoading: boardLoading,
    error: boardError,
  } = useBoardStateQuery(sessionId);

  const { data: playersData, isLoading: playersLoading } =
    useGamePlayersQuery(sessionId);

  const board = useMemo(
    () => boardData?.data?.boardState || [],
    [boardData?.data?.boardState]
  );
  const version = boardData?.data?.version || 0;

  const { mutate: completeGame, isPending: isCompleting } =
    useCompleteGameMutation();

  const handleCompleteGame = useCallback(
    (winnerId: string) => {
      if (!sessionData || !playersData) return;

      const winningPatterns: string[] = []; // Implement pattern detection if needed
      const final_score = 100; // Implement scoring logic

      completeGame({
        sessionId,
        data: {
          winner_id: winnerId,
          winning_patterns: winningPatterns,
          final_score,
          players: playersData,
        },
      });
    },
    [completeGame, sessionId, sessionData, playersData]
  );

  const { data: winResult, isLoading: isDetectingWin } = useQuery({
    queryKey: ['winDetection', board],
    queryFn: () => winDetector.detectWin(board),
    enabled: !!board && board.length > 0 && sessionData?.status === 'active',
  });

  // Mutations
  const startGameMutation = useStartGameSessionMutation();
  const markCellMutation = useMarkCellMutation(sessionId);

  // Derived state
  const loading =
    sessionLoading || boardLoading || isDetectingWin || playersLoading;
  const error = sessionError || boardError || null;

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
      } catch {
        // Error is handled by mutation's onError callback
        // Just prevent unhandled promise rejection
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
      } catch {
        // Error is handled by mutation's onError callback
        // Just prevent unhandled promise rejection
      }
    },
    [markCellMutation, version]
  );

  const startGame = useCallback(async () => {
    try {
      if (!sessionData?.host_id) {
        throw new Error('Host ID not available');
      }
      await startGameMutation.mutateAsync({
        sessionId,
        hostId: sessionData.host_id,
      });
    } catch {
      // Error is handled by mutation's onError callback
      // Just prevent unhandled promise rejection
    }
  }, [startGameMutation, sessionId, sessionData?.host_id]);

  return {
    session: sessionData,
    board,
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
    handleCompleteGame,
    isCompleting,
    isMarkingCell: markCellMutation.isPending,
    isStartingGame: startGameMutation.isPending,
  };
}
