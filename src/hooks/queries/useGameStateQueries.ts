import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  gameStateService,
  type MarkCellData,
  type CompleteGameData,
} from '@/src/services/game-state.service';
import {
  safeRealtimeManager,
  type TypedPostgresPayload,
} from '@/lib/realtime-manager';
import { useEffect } from 'react';
import type { BoardCell } from '@/types';

// Query keys
const gameStateKeys = {
  all: ['gameState'] as const,
  session: (id: string) => [...gameStateKeys.all, 'session', id] as const,
  boardState: (id: string) => [...gameStateKeys.all, 'boardState', id] as const,
  results: (id: string) => [...gameStateKeys.all, 'results', id] as const,
  players: (id: string) => [...gameStateKeys.all, 'players', id] as const,
};

// Get session state
export const useSessionStateQuery = (sessionId: string) => {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = safeRealtimeManager.subscribe(`session:${sessionId}`, {
      event: '*',
      schema: 'public',
      table: 'bingo_sessions',
      onUpdate: (payload: TypedPostgresPayload) => {
        // Safe validation of payload
        if (!payload.new || typeof payload.new !== 'object') return;

        // Validate that the new data has the required BingoSession properties
        const newData = payload.new;
        if (
          !(
            'id' in newData &&
            'session_code' in newData &&
            'board_id' in newData
          )
        )
          return;

        // Update query cache with real-time data
        queryClient.setQueryData(gameStateKeys.session(sessionId), {
          session: newData,
        });
      },
    });

    return unsubscribe;
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey: gameStateKeys.session(sessionId),
    queryFn: () => gameStateService.getSessionState(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    select: response => response.data,
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

// Get game players (renamed to avoid conflict with useSessionsQueries)
export const useGamePlayersQuery = (sessionId: string) => {
  return useQuery({
    queryKey: gameStateKeys.players(sessionId),
    queryFn: () => gameStateService.getGameResults(sessionId),
    enabled: !!sessionId,
    select: response => response.data,
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
export const useStartGameSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      hostId,
    }: {
      sessionId: string;
      hostId: string;
    }) => gameStateService.startSession(sessionId, hostId),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: gameStateKeys.session(sessionId),
      });
    },
  });
};

// Mark cell mutation with optimistic updates
export const useMarkCellMutation = (sessionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkCellData) =>
      gameStateService.markCell(sessionId, data),
    onMutate: async data => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: gameStateKeys.boardState(sessionId),
      });

      // Get current board state
      const previousBoardState = queryClient.getQueryData(
        gameStateKeys.boardState(sessionId)
      );

      // Optimistically update board state
      queryClient.setQueryData(
        gameStateKeys.boardState(sessionId),
        (
          old:
            | {
                boardState: BoardCell[] | null;
                version: number;
                error?: string;
              }
            | undefined
        ) => {
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
              cell.completed_by = (cell.completed_by || []).filter(
                id => id !== data.user_id
              );
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
        }
      );

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
        queryClient.invalidateQueries({
          queryKey: gameStateKeys.boardState(sessionId),
        });
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: gameStateKeys.boardState(sessionId),
      });
    },
  });
};

// Complete game mutation
export const useCompleteGameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: CompleteGameData;
    }) => gameStateService.completeGame(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({
        queryKey: gameStateKeys.session(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: gameStateKeys.results(sessionId),
      });
    },
  });
};
