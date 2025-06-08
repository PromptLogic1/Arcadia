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
import { log } from '@/lib/logger';

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
    select: data => data.data,
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
    select: data => data.data,
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
      if (result.success && result.data) {
        // Update cache
        queryClient.setQueryData(queueKeys.status(variables.user_id), result);

        // Invalidate waiting entries for admin views
        queryClient.invalidateQueries({ queryKey: queueKeys.waiting() });

        notifications.success('Joined the queue! Looking for players...');
      } else {
        notifications.error(result.error || 'Failed to join queue');
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
      if (result.success && result.data) {
        // Clear queue status
        queryClient.setQueryData(queueKeys.status(userId), null);

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: queueKeys.waiting() });

        notifications.success('Left the queue');
      } else {
        notifications.error(result.error || 'Failed to leave queue');
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
      if (result.success && result.data && result.data.length > 0) {
        // Invalidate all queue-related queries since matches were found
        queryClient.invalidateQueries({ queryKey: queueKeys.all() });

        notifications.success(`Found ${result.data.length} matches!`);
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
      if (result.success && result.data && result.data.cleaned > 0) {
        // Invalidate waiting entries
        queryClient.invalidateQueries({ queryKey: queueKeys.waiting() });

        log.info('Cleaned up expired queue entries', {
          metadata: {
            hook: 'useCleanupQueueMutation',
            cleanedCount: result.data.cleaned,
          },
        });
      }
    },
    onError: error => {
      log.error('Failed to cleanup queue', error, {
        metadata: {
          hook: 'useCleanupQueueMutation',
        },
      });
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
