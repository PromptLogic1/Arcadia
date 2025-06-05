/**
 * Session Queue TanStack Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  sessionQueueService,
  type PlayerQueueData,
  type SessionQueueEntryUpdate,
} from '../../services/session-queue.service';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';

/**
 * Get session queue entries
 */
export function useSessionQueueQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['sessionQueue', sessionId],
    queryFn: () => sessionQueueService.getSessionQueue(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
    select: data => data.entries,
  });
}

/**
 * Get queue statistics
 */
export function useSessionQueueStatsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['sessionQueue', 'stats', sessionId],
    queryFn: () => sessionQueueService.getQueueStats(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    select: data => data.stats,
  });
}

/**
 * Check if current user is in queue
 */
export function usePlayerQueueStatusQuery(
  userId: string,
  sessionId: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['sessionQueue', 'playerStatus', sessionId, userId],
    queryFn: () => sessionQueueService.isPlayerInQueue(userId, sessionId),
    enabled: enabled && !!sessionId && !!userId,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000,
  });
}

/**
 * Get player position in queue
 */
export function usePlayerQueuePositionQuery(
  userId: string,
  sessionId: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['sessionQueue', 'position', sessionId, userId],
    queryFn: () => sessionQueueService.getPlayerPosition(userId, sessionId),
    enabled: enabled && !!sessionId && !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    select: data => data.position,
  });
}

/**
 * Add player to queue mutation
 */
export function useAddToQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      playerData,
    }: {
      sessionId: string;
      playerData: PlayerQueueData;
    }) => sessionQueueService.addToQueue(sessionId, playerData),

    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Successfully joined the queue!');

      // Invalidate and refetch queue data
      queryClient.invalidateQueries({
        queryKey: ['sessionQueue', variables.sessionId],
      });

      logger.info('Player added to queue', {
        metadata: {
          sessionId: variables.sessionId,
          playerName: variables.playerData.playerName,
        },
      });
    },

    onError: error => {
      logger.error('Failed to join queue', error as Error);
      notifications.error('Failed to join queue', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

/**
 * Update queue entry mutation
 */
export function useUpdateQueueEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      updates,
      sessionId: _sessionId,
    }: {
      entryId: string;
      updates: SessionQueueEntryUpdate;
      sessionId: string;
    }) => sessionQueueService.updateQueueEntry(entryId, updates),

    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      // Invalidate and refetch queue data
      queryClient.invalidateQueries({
        queryKey: ['sessionQueue', variables.sessionId],
      });

      logger.info('Queue entry updated', {
        metadata: {
          entryId: variables.entryId,
          sessionId: variables.sessionId,
          updates: variables.updates,
        },
      });
    },

    onError: error => {
      logger.error('Failed to update queue entry', error as Error);
      notifications.error('Failed to update queue entry', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

/**
 * Remove from queue mutation
 */
export function useRemoveFromQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      sessionId: _sessionId,
    }: {
      entryId: string;
      sessionId: string;
    }) => sessionQueueService.removeFromQueue(entryId),

    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Removed from queue');

      // Invalidate and refetch queue data
      queryClient.invalidateQueries({
        queryKey: ['sessionQueue', variables.sessionId],
      });

      logger.info('Player removed from queue', {
        metadata: {
          entryId: variables.entryId,
          sessionId: variables.sessionId,
        },
      });
    },

    onError: error => {
      logger.error('Failed to remove from queue', error as Error);
      notifications.error('Failed to remove from queue', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

/**
 * Accept player mutation
 */
export function useAcceptPlayerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      sessionId,
    }: {
      entryId: string;
      sessionId: string;
    }) => sessionQueueService.acceptPlayer(entryId, sessionId),

    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Player accepted into session!');

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['sessionQueue', variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sessionPlayers', variables.sessionId],
      });

      logger.info('Player accepted from queue', {
        metadata: {
          entryId: variables.entryId,
          sessionId: variables.sessionId,
        },
      });
    },

    onError: error => {
      logger.error('Failed to accept player', error as Error);
      notifications.error('Failed to accept player', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

/**
 * Reject player mutation
 */
export function useRejectPlayerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      sessionId: _sessionId,
    }: {
      entryId: string;
      sessionId: string;
    }) => sessionQueueService.rejectPlayer(entryId),

    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Player request rejected');

      // Invalidate queue data
      queryClient.invalidateQueries({
        queryKey: ['sessionQueue', variables.sessionId],
      });

      logger.info('Player rejected from queue', {
        metadata: {
          entryId: variables.entryId,
          sessionId: variables.sessionId,
        },
      });
    },

    onError: error => {
      logger.error('Failed to reject player', error as Error);
      notifications.error('Failed to reject player', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

/**
 * Cleanup expired entries mutation
 */
export function useCleanupQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      sessionQueueService.cleanupExpiredEntries(sessionId),

    onSuccess: (result, sessionId) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      if (result.removedCount > 0) {
        notifications.success(
          `Cleaned up ${result.removedCount} expired queue entries`
        );
      }

      // Invalidate queue data
      queryClient.invalidateQueries({
        queryKey: ['sessionQueue', sessionId],
      });

      logger.info('Queue cleanup completed', {
        metadata: {
          sessionId,
          removedCount: result.removedCount,
        },
      });
    },

    onError: error => {
      logger.error('Failed to cleanup queue', error as Error);
      notifications.error('Failed to cleanup queue', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

/**
 * Combined hook for all queue operations
 */
export function useSessionQueueOperations(sessionId: string) {
  // Queries
  const queueQuery = useSessionQueueQuery(sessionId);
  const statsQuery = useSessionQueueStatsQuery(sessionId);

  // Mutations
  const addToQueueMutation = useAddToQueueMutation();
  const updateQueueEntryMutation = useUpdateQueueEntryMutation();
  const removeFromQueueMutation = useRemoveFromQueueMutation();
  const acceptPlayerMutation = useAcceptPlayerMutation();
  const rejectPlayerMutation = useRejectPlayerMutation();
  const cleanupQueueMutation = useCleanupQueueMutation();

  // Derived state
  const isLoading = queueQuery.isLoading || statsQuery.isLoading;
  const error = queueQuery.error || statsQuery.error;
  const queueEntries = queueQuery.data || [];
  const stats = statsQuery.data;

  // Actions
  const addToQueue = (playerData: PlayerQueueData) => {
    return addToQueueMutation.mutateAsync({ sessionId, playerData });
  };

  const updateQueueEntry = (
    entryId: string,
    updates: SessionQueueEntryUpdate
  ) => {
    return updateQueueEntryMutation.mutateAsync({
      entryId,
      updates,
      sessionId,
    });
  };

  const removeFromQueue = (entryId: string) => {
    return removeFromQueueMutation.mutateAsync({ entryId, sessionId });
  };

  const acceptPlayer = (entryId: string) => {
    return acceptPlayerMutation.mutateAsync({ entryId, sessionId });
  };

  const rejectPlayer = (entryId: string) => {
    return rejectPlayerMutation.mutateAsync({ entryId, sessionId });
  };

  const cleanupQueue = () => {
    return cleanupQueueMutation.mutateAsync(sessionId);
  };

  return {
    // State
    queueEntries,
    stats,
    isLoading,
    error,

    // Loading states for individual operations
    isAddingToQueue: addToQueueMutation.isPending,
    isUpdatingEntry: updateQueueEntryMutation.isPending,
    isRemovingFromQueue: removeFromQueueMutation.isPending,
    isAcceptingPlayer: acceptPlayerMutation.isPending,
    isRejectingPlayer: rejectPlayerMutation.isPending,
    isCleaningUp: cleanupQueueMutation.isPending,

    // Any operation is pending
    isMutating:
      addToQueueMutation.isPending ||
      updateQueueEntryMutation.isPending ||
      removeFromQueueMutation.isPending ||
      acceptPlayerMutation.isPending ||
      rejectPlayerMutation.isPending ||
      cleanupQueueMutation.isPending,

    // Actions
    addToQueue,
    updateQueueEntry,
    removeFromQueue,
    acceptPlayer,
    rejectPlayer,
    cleanupQueue,

    // Query actions
    refetch: () => {
      queueQuery.refetch();
      statsQuery.refetch();
    },
  };
}
