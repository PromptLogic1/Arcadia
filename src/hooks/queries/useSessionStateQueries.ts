/**
 * Session State React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  sessionStateService,
  type Player,
  type SessionState,
} from '../../services/session-state.service';
import { gameStateService } from '../../services/game-state.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';
import { useEffect, useRef, useState } from 'react';
// Removed unused type imports

/**
 * Get session state with real-time updates
 */
export function useSessionStateQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessions.state(sessionId),
    queryFn: () => gameStateService.getSessionState(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
    select: response => response, // Keep full ServiceResponse structure
  });
}

/**
 * Get session players with real-time updates
 */
export function useSessionPlayersQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessions.players(sessionId),
    queryFn: () => sessionStateService.getSessionPlayers(sessionId),
    enabled: !!sessionId,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000, // Background refetch every 15 seconds
    select: response => response, // Keep full ServiceResponse structure
  });
}

/**
 * Combined session state and players with real-time sync
 */
export function useSessionWithPlayersQuery(sessionId: string) {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Disable polling when real-time is active
  const sessionQuery = useQuery({
    queryKey: queryKeys.sessions.state(sessionId),
    queryFn: () => gameStateService.getSessionState(sessionId),
    enabled: !!sessionId,
    staleTime: isRealtimeConnected ? Infinity : 30 * 1000, // Longer stale time with real-time
    refetchInterval: isRealtimeConnected ? false : 30 * 1000, // Only poll if real-time disconnected
    select: response => response,
  });

  const playersQuery = useQuery({
    queryKey: queryKeys.sessions.players(sessionId),
    queryFn: () => sessionStateService.getSessionPlayers(sessionId),
    enabled: !!sessionId,
    staleTime: isRealtimeConnected ? Infinity : 15 * 1000,
    refetchInterval: isRealtimeConnected ? false : 15 * 1000,
    select: response => response,
  });

  const boardStateQuery = useQuery({
    queryKey: queryKeys.sessions.boardState(sessionId),
    queryFn: () => gameStateService.getBoardState(sessionId),
    enabled: !!sessionId,
    staleTime: isRealtimeConnected ? Infinity : 10 * 1000,
    refetchInterval: isRealtimeConnected ? false : 10 * 1000,
    select: response => ({
      boardState: response.data?.boardState || [],
      version: response.data?.version || 0,
      error: response.error,
    }),
  });

  // Real-time subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    // Set up real-time subscription
    const unsubscribe = sessionStateService.subscribeToSession(
      sessionId,
      ({ session, players }) => {
        // Mark real-time as connected when we receive data
        setIsRealtimeConnected(true);

        // Update session cache with proper ServiceResponse structure
        queryClient.setQueryData(queryKeys.sessions.state(sessionId), {
          success: true,
          data: session,
          error: null,
        });

        // Update players cache with proper ServiceResponse structure
        queryClient.setQueryData(queryKeys.sessions.players(sessionId), {
          success: true,
          data: players,
          error: null,
        });
      }
    );

    unsubscribeRef.current = () => {
      setIsRealtimeConnected(false);
      unsubscribe();
    };

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [sessionId, queryClient]);

  return {
    session: sessionQuery.data?.success ? sessionQuery.data.data : null,
    players: playersQuery.data?.success ? playersQuery.data.data : [],
    boardState: boardStateQuery.data?.boardState || [],
    isLoading:
      sessionQuery.isLoading ||
      playersQuery.isLoading ||
      boardStateQuery.isLoading,
    error:
      sessionQuery.error ||
      playersQuery.error ||
      boardStateQuery.error ||
      sessionQuery.data?.error ||
      playersQuery.data?.error ||
      boardStateQuery.data?.error,
    refetch: () => {
      sessionQuery.refetch();
      playersQuery.refetch();
      boardStateQuery.refetch();
    },
  };
}

/**
 * Initialize session mutation
 */
export function useInitializeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, player }: { boardId: string; player: Player }) =>
      sessionStateService.initializeSession(boardId, player),
    onSuccess: (data, _variables) => {
      if (data.error) {
        notifications.error(data.error);
        return;
      }

      if (data.data && data.data.session && data.data.session.id) {
        const message = data.data.isNewSession
          ? 'Session created successfully!'
          : 'Joined session successfully!';
        notifications.success(message);

        // Update cache with proper ServiceResponse structure
        queryClient.setQueryData(
          queryKeys.sessions.state(data.data.session.id),
          {
            success: true,
            data: data.data.session,
            error: null,
          }
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.players(data.data.session.id),
        });
      }
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to initialize session'
      );
    },
  });
}

/**
 * Leave session mutation
 */
export function useLeaveSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      playerId,
    }: {
      sessionId: string;
      playerId: string;
    }) => sessionStateService.leaveSession(sessionId, playerId),
    onSuccess: (data, _variables) => {
      if (data.error) {
        notifications.error(data.error);
        return;
      }

      notifications.success('Left session successfully!');

      // Invalidate session queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.players(_variables.sessionId),
      });
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to leave session'
      );
    },
  });
}

/**
 * Combined session state for components
 */
export function useSessionState(
  sessionId: string,
  boardId: string
): {
  sessionState: SessionState;
  isLoading: boolean;
  error: Error | null;
  initializeSession: (player: Player) => Promise<void>;
  leaveSession: (playerId: string) => Promise<void>;
} {
  const { session, players, boardState, isLoading, error } =
    useSessionWithPlayersQuery(sessionId);
  const initializeMutation = useInitializeSessionMutation();
  const leaveMutation = useLeaveSessionMutation();

  const sessionState: SessionState =
    session && players
      ? sessionStateService.transformSessionState(
          session,
          players,
          boardState
        ) || {
          id: '',
          isActive: false,
          isPaused: false,
          isFinished: false,
          startTime: null,
          endTime: null,
          currentPlayer: null,
          players: [],
          boardState: [],
          version: 0,
        }
      : {
          id: '',
          isActive: false,
          isPaused: false,
          isFinished: false,
          startTime: null,
          endTime: null,
          currentPlayer: null,
          players: [],
          boardState: [],
          version: 0,
        };

  const initializeSession = async (player: Player) => {
    await initializeMutation.mutateAsync({ boardId, player });
  };

  const leaveSession = async (playerId: string) => {
    await leaveMutation.mutateAsync({ sessionId, playerId });
  };

  return {
    sessionState,
    isLoading:
      isLoading || initializeMutation.isPending || leaveMutation.isPending,
    error: error instanceof Error ? error : null,
    initializeSession,
    leaveSession,
  };
}
