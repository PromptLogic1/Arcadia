/**
 * Session Queue Hook
 *
 * Combines TanStack Query + Zustand + Service Layer pattern for session queue management.
 * This replaces the legacy useSessionQueue hook with the modern architecture.
 *
 * - TanStack Query: Server state (queue entries, stats)
 * - Zustand Store: UI state (modals, forms, settings)
 * - Service Layer: Pure API functions
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  useSessionQueueOperations,
  usePlayerQueueStatusQuery,
  usePlayerQueuePositionQuery,
} from '@/hooks/queries/useSessionQueueQueries';
import {
  useSessionQueueState,
  useSessionQueueActions,
  type SessionQueueState,
} from '@/lib/stores/session-queue-store';
import type { SessionQueueEntryUpdate } from '../../../services/session-queue.service';
import { useAuth } from '@/lib/stores/auth-store';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import type {
  SessionQueueEntry,
  PlayerQueueData,
  QueueStats,
} from '../../../services/session-queue.service';

export interface UseSessionQueueReturn {
  // Server state (from TanStack Query)
  queueEntries: SessionQueueEntry[];
  stats: QueueStats | undefined;
  isLoading: boolean;
  error: Error | null;

  // Current user queue status
  playerQueueStatus: {
    inQueue: boolean;
    entry?: SessionQueueEntry;
    position: number;
    isLoading: boolean;
  };

  // UI state (from Zustand store)
  showInviteDialog: boolean;
  showQueueDialog: boolean;
  inviteLink: string;
  playerFormData: {
    playerName: string;
    color: string;
    team?: number;
  } | null;
  isGeneratingLink: boolean;
  isCopyingLink: boolean;
  autoRefreshEnabled: boolean;
  queueFilters: {
    showOnlyWaiting: boolean;
    sortBy: 'requested_at' | 'player_name' | 'status';
    sortOrder: 'asc' | 'desc';
  };

  // Loading states for operations
  isAddingToQueue: boolean;
  isUpdatingEntry: boolean;
  isRemovingFromQueue: boolean;
  isAcceptingPlayer: boolean;
  isRejectingPlayer: boolean;
  isMutating: boolean;

  // Actions - Modal management
  setShowInviteDialog: (show: boolean) => void;
  setShowQueueDialog: (show: boolean) => void;

  // Actions - Invite link management
  generateInviteLink: () => Promise<void>;
  copyInviteLink: () => Promise<boolean>;

  // Actions - Player form management
  setPlayerFormData: (data: UseSessionQueueReturn['playerFormData']) => void;
  updatePlayerFormField: (
    field: keyof NonNullable<SessionQueueState['playerFormData']>,
    value: string | number
  ) => void;
  resetPlayerForm: () => void;

  // Actions - Queue operations
  addToQueue: (playerData: PlayerQueueData) => Promise<void>;
  removeFromQueue: (entryId: string) => Promise<void>;
  acceptPlayer: (entryId: string) => Promise<void>;
  rejectPlayer: (entryId: string) => Promise<void>;
  updateQueueEntry: (
    entryId: string,
    updates: SessionQueueEntryUpdate
  ) => Promise<void>;

  // Actions - Settings management
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setQueueFilters: (
    filters: Partial<UseSessionQueueReturn['queueFilters']>
  ) => void;

  // Utility actions
  refreshQueue: () => void;
  reset: () => void;

  // Computed values
  waitingEntries: SessionQueueEntry[];
  matchedEntries: SessionQueueEntry[];
  cancelledEntries: SessionQueueEntry[];
}

/**
 * Modern session queue hook combining TanStack Query + Zustand
 */
export function useSessionQueue(sessionId: string): UseSessionQueueReturn {
  // TanStack Query for server state
  const queueOperations = useSessionQueueOperations(sessionId);

  // Auth state
  const { authUser } = useAuth();
  const userId = authUser?.id || '';

  // Player queue status queries
  const playerStatusQuery = usePlayerQueueStatusQuery(
    userId,
    sessionId,
    !!userId
  );
  const playerPositionQuery = usePlayerQueuePositionQuery(
    userId,
    sessionId,
    !!userId
  );

  // Zustand store for UI state
  const uiState = useSessionQueueState();
  const uiActions = useSessionQueueActions();

  // Ref to hold latest refetch function to avoid stale closures
  const refetchRef = useRef(queueOperations.refetch);
  useEffect(() => {
    refetchRef.current = queueOperations.refetch;
  }, [queueOperations.refetch]);

  // Derived server state
  const queueEntries = queueOperations.queueEntries;
  const stats = queueOperations.stats;
  const isLoading = queueOperations.isLoading;
  const error = queueOperations.error;

  // Player queue status
  const playerQueueStatus = {
    inQueue: playerStatusQuery.data?.inQueue || false,
    entry: playerStatusQuery.data?.entry,
    position: playerPositionQuery.data || -1,
    isLoading: playerStatusQuery.isLoading || playerPositionQuery.isLoading,
  };

  // Auto-refresh effect - fixed stale closure issue
  useEffect(() => {
    if (!uiState.autoRefreshEnabled || !sessionId) return;

    const interval = setInterval(() => {
      refetchRef.current(); // Use ref to get latest refetch function
    }, uiState.refreshInterval);

    return () => clearInterval(interval);
  }, [
    uiState.autoRefreshEnabled,
    uiState.refreshInterval,
    sessionId,
    // Remove queueOperations from dependencies to prevent unnecessary effect reruns
  ]);

  // Enhanced invite link generation
  const generateInviteLink = useCallback(async () => {
    try {
      await uiActions.generateInviteLink(sessionId);
      logger.info('Invite link generated', {
        metadata: { sessionId },
      });
    } catch (error) {
      logger.error('Failed to generate invite link', error as Error, {
        metadata: { sessionId },
      });
      notifications.error('Failed to generate invite link');
      throw error;
    }
  }, [sessionId, uiActions]);

  // Enhanced copy invite link
  const copyInviteLink = useCallback(async (): Promise<boolean> => {
    try {
      const success = await uiActions.copyInviteLink();
      if (success) {
        notifications.success('Invite link copied to clipboard!');
        logger.info('Invite link copied', {
          metadata: { sessionId },
        });
      } else {
        notifications.error('Failed to copy invite link');
      }
      return success;
    } catch (error) {
      logger.error('Failed to copy invite link', error as Error, {
        metadata: { sessionId },
      });
      notifications.error('Failed to copy invite link');
      return false;
    }
  }, [uiActions, sessionId]);

  // Enhanced queue operations with validation and logging
  const addToQueue = useCallback(
    async (playerData: PlayerQueueData) => {
      if (!authUser) {
        notifications.error('Must be logged in to join queue');
        return;
      }

      if (playerQueueStatus.inQueue) {
        notifications.warning('You are already in the queue for this session');
        return;
      }

      try {
        await queueOperations.addToQueue(playerData);
        logger.info('Player added to queue', {
          metadata: { sessionId, playerData },
        });
      } catch (error) {
        logger.error('Failed to add player to queue', error as Error, {
          metadata: { sessionId, playerData },
        });
        throw error;
      }
    },
    [authUser, playerQueueStatus.inQueue, queueOperations, sessionId]
  );

  const removeFromQueue = useCallback(
    async (entryId: string) => {
      try {
        await queueOperations.removeFromQueue(entryId);
        logger.info('Player removed from queue', {
          metadata: { sessionId, entryId },
        });
      } catch (error) {
        logger.error('Failed to remove player from queue', error as Error, {
          metadata: { sessionId, entryId },
        });
        throw error;
      }
    },
    [queueOperations, sessionId]
  );

  const acceptPlayer = useCallback(
    async (entryId: string) => {
      try {
        await queueOperations.acceptPlayer(entryId);
        logger.info('Player accepted from queue', {
          metadata: { sessionId, entryId },
        });
      } catch (error) {
        logger.error('Failed to accept player', error as Error, {
          metadata: { sessionId, entryId },
        });
        throw error;
      }
    },
    [queueOperations, sessionId]
  );

  const rejectPlayer = useCallback(
    async (entryId: string) => {
      try {
        await queueOperations.rejectPlayer(entryId);
        logger.info('Player rejected from queue', {
          metadata: { sessionId, entryId },
        });
      } catch (error) {
        logger.error('Failed to reject player', error as Error, {
          metadata: { sessionId, entryId },
        });
        throw error;
      }
    },
    [queueOperations, sessionId]
  );

  const updateQueueEntry = useCallback(
    async (entryId: string, updates: SessionQueueEntryUpdate) => {
      try {
        await queueOperations.updateQueueEntry(entryId, updates);
        logger.info('Queue entry updated', {
          metadata: { sessionId, entryId, updates },
        });
      } catch (error) {
        logger.error('Failed to update queue entry', error as Error, {
          metadata: { sessionId, entryId, updates },
        });
        throw error;
      }
    },
    [queueOperations, sessionId]
  );

  // Computed values
  const waitingEntries = queueEntries.filter(
    entry => entry.status === 'waiting'
  );
  const matchedEntries = queueEntries.filter(
    entry => entry.status === 'matched'
  );
  const cancelledEntries = queueEntries.filter(
    entry => entry.status === 'cancelled'
  );

  // Enhanced form field update with validation
  const updatePlayerFormField = useCallback(
    (
      field: keyof NonNullable<SessionQueueState['playerFormData']>,
      value: string | number
    ) => {
      // Add any validation logic here if needed
      uiActions.updatePlayerFormField(field, value);
    },
    [uiActions]
  );

  return {
    // Server state
    queueEntries,
    stats,
    isLoading,
    error,
    playerQueueStatus,

    // UI state
    showInviteDialog: uiState.showInviteDialog,
    showQueueDialog: uiState.showQueueDialog,
    inviteLink: uiState.inviteLink,
    playerFormData: uiState.playerFormData,
    isGeneratingLink: uiState.isGeneratingLink,
    isCopyingLink: uiState.isCopyingLink,
    autoRefreshEnabled: uiState.autoRefreshEnabled,
    queueFilters: uiState.queueFilters,

    // Loading states
    isAddingToQueue: queueOperations.isAddingToQueue,
    isUpdatingEntry: queueOperations.isUpdatingEntry,
    isRemovingFromQueue: queueOperations.isRemovingFromQueue,
    isAcceptingPlayer: queueOperations.isAcceptingPlayer,
    isRejectingPlayer: queueOperations.isRejectingPlayer,
    isMutating: queueOperations.isMutating,

    // Modal management
    setShowInviteDialog: uiActions.setShowInviteDialog,
    setShowQueueDialog: uiActions.setShowQueueDialog,

    // Invite link management
    generateInviteLink,
    copyInviteLink,

    // Form management
    setPlayerFormData: uiActions.setPlayerFormData,
    updatePlayerFormField,
    resetPlayerForm: uiActions.resetPlayerForm,

    // Queue operations
    addToQueue,
    removeFromQueue,
    acceptPlayer,
    rejectPlayer,
    updateQueueEntry,

    // Settings management
    setAutoRefreshEnabled: uiActions.setAutoRefreshEnabled,
    setQueueFilters: uiActions.setQueueFilters,

    // Utility actions
    refreshQueue: queueOperations.refetch,
    reset: uiActions.reset,

    // Computed values
    waitingEntries,
    matchedEntries,
    cancelledEntries,
  };
}
