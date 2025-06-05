/**
 * Queue React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  queueService,
  type JoinQueueData,
  type QueueEntry as _QueueEntry,
} from '../../services/queue.service';
import { notifications } from '@/lib/notifications';

// Query key factories
export const queueKeys = {
  all: () => ['queue'] as const,
  status: (userId: string) => ['queue', 'status', userId] as const,
  waiting: () => ['queue', 'waiting'] as const,
} as const;

/**
 * Get user's current queue status
 */
export function useQueueStatusQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: queueKeys.status(userId),
    queryFn: () => queueService.getQueueStatus(userId),
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    select: data => data.entry,
  });
}

/**
 * Get all waiting queue entries (admin/matchmaking use)
 */
export function useWaitingEntriesQuery(enabled = false) {
  return useQuery({
    queryKey: queueKeys.waiting(),
    queryFn: () => queueService.getWaitingEntries(),
    enabled,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // Poll every 15 seconds
    select: data => data.entries,
  });
}

/**
 * Join the matchmaking queue
 */
export function useJoinQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinQueueData) => queueService.joinQueue(data),
    onSuccess: (result, variables) => {
      if (result.entry && !result.error) {
        // Update cache
        queryClient.setQueryData(
          queueKeys.status(variables.user_id),
          result.entry
        );

        // Invalidate waiting entries for admin views
        queryClient.invalidateQueries({ queryKey: queueKeys.waiting() });

        notifications.success('Joined the queue! Looking for players...');
      } else if (result.error) {
        notifications.error(result.error);
      }
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to join queue'
      );
    },
  });
}

/**
 * Leave the queue
 */
export function useLeaveQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => queueService.leaveQueue(userId),
    onSuccess: (result, userId) => {
      if (result.success) {
        // Clear queue status
        queryClient.setQueryData(queueKeys.status(userId), null);

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: queueKeys.waiting() });

        notifications.success('Left the queue');
      } else if (result.error) {
        notifications.error(result.error);
      }
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to leave queue'
      );
    },
  });
}

/**
 * Find matches (admin/system use)
 */
export function useFindMatchesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (maxMatches?: number) => queueService.findMatches(maxMatches),
    onSuccess: result => {
      if (result.matches.length > 0) {
        // Invalidate all queue-related queries since matches were found
        queryClient.invalidateQueries({ queryKey: queueKeys.all() });

        notifications.success(`Found ${result.matches.length} matches!`);
      }
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to find matches'
      );
    },
  });
}

/**
 * Cleanup expired entries (admin/system use)
 */
export function useCleanupQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => queueService.cleanupExpiredEntries(),
    onSuccess: result => {
      if (result.cleaned > 0) {
        // Invalidate waiting entries
        queryClient.invalidateQueries({ queryKey: queueKeys.waiting() });

        console.log(`Cleaned up ${result.cleaned} expired queue entries`);
      }
    },
    onError: error => {
      console.error('Failed to cleanup queue:', error);
    },
  });
}

/**
 * Hook for managing user's queue state
 */
export function useUserQueue(userId: string) {
  const queueStatusQuery = useQueueStatusQuery(userId);
  const joinQueueMutation = useJoinQueueMutation();
  const leaveQueueMutation = useLeaveQueueMutation();

  const isInQueue = !!queueStatusQuery.data;
  const queueEntry = queueStatusQuery.data;
  const isLoading =
    queueStatusQuery.isLoading ||
    joinQueueMutation.isPending ||
    leaveQueueMutation.isPending;

  const joinQueue = (data: Omit<JoinQueueData, 'user_id'>) => {
    return joinQueueMutation.mutate({ ...data, user_id: userId });
  };

  const leaveQueue = () => {
    return leaveQueueMutation.mutate(userId);
  };

  return {
    // State
    isInQueue,
    queueEntry,
    isLoading,
    error: queueStatusQuery.error,

    // Actions
    joinQueue,
    leaveQueue,

    // Query info
    refetch: queueStatusQuery.refetch,
  };
}
