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
  });
}

export function useSessionByCodeQuery(sessionCode?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.byCode(sessionCode || ''),
    queryFn: () => sessionsService.getSessionByCode(sessionCode || ''),
    enabled: !!sessionCode && sessionCode.length === 6, // Only fetch if we have a valid code
    staleTime: 30 * 1000,
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

      if (response.session) {
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

      if (response.player) {
        notifications.success('Joined session successfully!');
        // Invalidate sessions and players queries
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessions.players(response.player.session_id),
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
