/**
 * Sessions React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  sessionsService,
  type SessionFilters,
} from '../../services/sessions.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';

export function useSessionQuery(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.byId(sessionId || ''),
    queryFn: () => sessionsService.getSessionById(sessionId || ''),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds for active session data
    select: response => (response.success ? response.data : null),
  });
}

export function useSessionByCodeQuery(sessionCode?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.byCode(sessionCode || ''),
    queryFn: () => sessionsService.getSessionByCode(sessionCode || ''),
    enabled: !!sessionCode && sessionCode.length === 6, // Only fetch if we have a valid code
    staleTime: 30 * 1000,
    select: response => (response.success ? response.data : null),
  });
}

export function useActiveSessionsQuery(
  filters: SessionFilters = {},
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.sessions.active(filters, page),
    queryFn: () => sessionsService.getActiveSessions(filters, page, limit),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    select: response => (response.success ? response.data : null),
  });
}

export function useSessionPlayersQuery(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.players(sessionId || ''),
    queryFn: () => sessionsService.getSessionPlayers(sessionId || ''),
    enabled: !!sessionId,
    staleTime: 10 * 1000, // 10 seconds for player data
    refetchInterval: 15 * 1000, // Auto-refetch every 15 seconds
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsService.createSession,
    onSuccess: response => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.data) {
        notifications.success('Session created successfully!');
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to create session');
    },
  });
}

export function useJoinSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsService.joinSession,
    onSuccess: response => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.data) {
        notifications.success('Joined session successfully!');
        // Invalidate sessions and players queries
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.players(response.data.session_id),
        });
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to join session');
    },
  });
}

export function useLeaveSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      userId,
    }: {
      sessionId: string;
      userId: string;
    }) => sessionsService.leaveSession(sessionId, userId),
    onSuccess: (response, { sessionId }) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      notifications.success('Left session successfully!');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.players(sessionId),
      });
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to leave session');
    },
  });
}

export function useUpdateSessionStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      status,
    }: {
      sessionId: string;
      status: 'waiting' | 'active' | 'completed' | 'cancelled';
    }) => sessionsService.updateSessionStatus(sessionId, status),
    onSuccess: (response, { sessionId }) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.session) {
        // Update session in cache
        queryClient.setQueryData(queryKeys.sessions.byId(sessionId), {
          session: response.session,
        });
        // Invalidate sessions list
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to update session status');
    },
  });
}

export function useSessionsByBoardIdQuery(
  boardId?: string,
  status?: 'waiting' | 'active' | 'completed' | 'cancelled'
) {
  return useQuery({
    queryKey: queryKeys.sessions.byBoard(boardId || '', status),
    queryFn: () => sessionsService.getSessionsByBoardId(boardId || '', status),
    enabled: !!boardId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useJoinSessionByCodeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionCode,
      user_id,
      display_name,
      color,
      team,
      password,
    }: {
      sessionCode: string;
      user_id: string;
      display_name: string;
      color: string;
      team?: number | null;
      password?: string;
    }) =>
      sessionsService.joinSessionByCode(sessionCode, user_id, {
        display_name,
        color,
        team,
        password,
      }),
    onSuccess: response => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.player && response.sessionId) {
        notifications.success('Joined session successfully!');
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.players(response.sessionId),
        });
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to join session by code');
    },
  });
}

export function useStartSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      hostId,
    }: {
      sessionId: string;
      hostId: string;
    }) => sessionsService.startSession(sessionId, hostId),
    onSuccess: (response, { sessionId }) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.session) {
        notifications.success('Session started!');
        // Update session in cache
        queryClient.setQueryData(queryKeys.sessions.byId(sessionId), {
          session: response.session,
        });
        // Invalidate sessions list
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to start session');
    },
  });
}

// New hook for finding waiting sessions across multiple boards
export function useWaitingSessionsForBoards(boardIds: string[]) {
  return useQuery({
    queryKey: queryKeys.sessions.waitingForBoards(boardIds),
    queryFn: async () => {
      // Find first board with waiting sessions
      for (const boardId of boardIds) {
        const result = await sessionsService.getSessionsByBoardId(
          boardId,
          'waiting'
        );
        if (!result.error && result.data && result.data.length > 0) {
          return {
            boardId,
            sessions: result.data,
            error: null,
          };
        }
      }
      return {
        boardId: null,
        sessions: [],
        error: null,
      };
    },
    enabled: boardIds.length > 0,
    staleTime: 10 * 1000, // 10 seconds for waiting sessions
    refetchInterval: 15 * 1000, // Check for new sessions every 15 seconds
  });
}
