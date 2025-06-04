import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameStateService, type MarkCellData, type CompleteGameData } from '@/src/services/game-state.service';
import { realtimeManager } from '@/lib/realtime-manager';
import { useEffect } from 'react';
import type { BingoSession, BoardCell } from '@/types';

// Query keys
const gameStateKeys = {
  all: ['gameState'] as const,
  session: (id: string) => [...gameStateKeys.all, 'session', id] as const,
  boardState: (id: string) => [...gameStateKeys.all, 'boardState', id] as const,
  results: (id: string) => [...gameStateKeys.all, 'results', id] as const,
};

// Get session state
export const useSessionStateQuery = (sessionId: string) => {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = realtimeManager.subscribe(
      `session:${sessionId}`,
      (payload) => {
        const newSession = payload.new as BingoSession;
        
        // Update query cache with real-time data
        queryClient.setQueryData(
          gameStateKeys.session(sessionId),
          { session: newSession }
        );
      },
      {
        event: 'UPDATE',
        table: 'bingo_sessions',
        filter: `id=eq.${sessionId}`,
      }
    );

    return unsubscribe;
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey: gameStateKeys.session(sessionId),
    queryFn: () => gameStateService.getSessionState(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data.session,
  });
};

// Get board state
export const useBoardStateQuery = (sessionId: string) => {
  return useQuery({
    queryKey: gameStateKeys.boardState(sessionId),
    queryFn: () => gameStateService.getBoardState(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
  });
};

// TODO: Uncomment when game_results table is added to the database
// Get game results
// export const useGameResultsQuery = (sessionId: string) => {
//   return useQuery({
//     queryKey: gameStateKeys.results(sessionId),
//     queryFn: () => gameStateService.getGameResults(sessionId),
//     enabled: !!sessionId,
//     select: (data) => data.results,
//   });
// };

// Start session mutation
export const useStartSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => 
      gameStateService.startSession(sessionId),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: gameStateKeys.session(sessionId) });
    },
  });
};

// Mark cell mutation with optimistic updates
export const useMarkCellMutation = (sessionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkCellData) => 
      gameStateService.markCell(sessionId, data),
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: gameStateKeys.boardState(sessionId) });

      // Get current board state
      const previousBoardState = queryClient.getQueryData(
        gameStateKeys.boardState(sessionId)
      );

      // Optimistically update board state
      queryClient.setQueryData(gameStateKeys.boardState(sessionId), (old: { boardState: BoardCell[] | null; version: number; error?: string } | undefined) => {
        if (!old?.boardState) return old;

        const newBoardState = [...old.boardState];
        const cell = newBoardState[data.cell_position];
        
        if (cell) {
          if (data.action === 'mark') {
            cell.completed_by = [...(cell.completed_by || []), data.user_id];
            cell.last_modified_by = data.user_id;
            cell.last_updated = Date.now();
            cell.is_marked = true;
          } else {
            cell.completed_by = (cell.completed_by || []).filter(id => id !== data.user_id);
            cell.last_modified_by = data.user_id;
            cell.last_updated = Date.now();
            cell.is_marked = cell.completed_by.length > 0;
          }
        }

        return {
          ...old,
          boardState: newBoardState,
          version: old.version + 1,
        };
      });

      return { previousBoardState };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousBoardState) {
        queryClient.setQueryData(
          gameStateKeys.boardState(sessionId),
          context.previousBoardState
        );
      }

      // Handle version conflict
      if (error.message === 'VERSION_CONFLICT') {
        // Refetch the latest state
        queryClient.invalidateQueries({ queryKey: gameStateKeys.boardState(sessionId) });
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: gameStateKeys.boardState(sessionId) });
    },
  });
};

// Complete game mutation
export const useCompleteGameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: CompleteGameData }) => 
      gameStateService.completeGame(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: gameStateKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: gameStateKeys.results(sessionId) });
    },
  });
};