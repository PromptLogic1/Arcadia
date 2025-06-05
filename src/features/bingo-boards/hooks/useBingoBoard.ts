'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useBoardWithCreatorQuery,
  useUpdateBoardStateMutation,
  useUpdateBoardSettingsMutation,
} from '@/hooks/queries/useBingoBoardsQueries';
import { realtimeBoardService } from '../../../services/realtime-board.service';
import { logger } from '@/lib/logger';
import type { BoardCell, BingoBoardRow } from '../types';
import type { CompositeTypes, Tables } from '@/types/database-generated';

// Props interface
export interface UseBingoBoardProps {
  boardId: string;
}

// Return interface
export interface UseBingoBoardReturn {
  // Board data
  board: BingoBoardRow | null;
  loading: boolean;
  error: Error | null;

  // Board operations
  updateBoardState: (newState: BoardCell[]) => Promise<void>;
  updateBoardSettings: (
    settings: Partial<
      Pick<BingoBoardRow, 'title' | 'description' | 'difficulty' | 'is_public'>
    >
  ) => Promise<void>;

  // UI state
  showSettings: boolean;
  showShareDialog: boolean;
  optimisticUpdating: boolean;

  // UI actions
  setShowSettings: (show: boolean) => void;
  setShowShareDialog: (show: boolean) => void;
}

export const useBingoBoard = ({
  boardId,
}: UseBingoBoardProps): UseBingoBoardReturn => {
  const queryClient = useQueryClient();

  // TanStack Query for server state
  const {
    data: board,
    isLoading: loading,
    error: queryError,
  } = useBoardWithCreatorQuery(boardId);

  // Mutations for board operations
  const updateBoardStateMutation = useUpdateBoardStateMutation();
  const updateBoardSettingsMutation = useUpdateBoardSettingsMutation();

  // Simple React state for UI
  const [showSettings, setShowSettings] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [optimisticUpdating, setOptimisticUpdating] = useState(false);
  const [realtimeError, setRealtimeError] = useState<Error | null>(null);

  // Board state update with optimistic updates
  const updateBoardState = useCallback(
    async (newState: BoardCell[]) => {
      if (!board) {
        throw new Error('Board not found');
      }

      try {
        setOptimisticUpdating(true);

        // Convert BoardCell[] to database format if needed
        const dbBoardState: CompositeTypes<'board_cell'>[] = newState.map(
          cell => ({
            text: cell.text,
            colors: cell.colors,
            completed_by: cell.completed_by,
            blocked: cell.blocked,
            is_marked: cell.is_marked,
            cell_id: cell.cell_id,
            version: cell.version,
            last_updated: cell.last_updated,
            last_modified_by: cell.last_modified_by,
          })
        );

        await updateBoardStateMutation.mutateAsync({
          boardId,
          boardState: dbBoardState,
          currentVersion: board.version || undefined,
        });
      } catch (error) {
        logger.error('Failed to update board state', error instanceof Error ? error : new Error(String(error)), {
          boardId,
          feature: 'bingo-boards',
        });
        throw error;
      } finally {
        setOptimisticUpdating(false);
      }
    },
    [board, boardId, updateBoardStateMutation]
  );

  // Board settings update
  const updateBoardSettings = useCallback(
    async (
      settings: Partial<
        Pick<
          BingoBoardRow,
          'title' | 'description' | 'difficulty' | 'is_public'
        >
      >
    ) => {
      if (!board) {
        throw new Error('Board not found');
      }

      try {
        // Convert database types to service types
        const serviceSettings = {
          ...(settings.title !== undefined && {
            title: settings.title || undefined,
          }),
          ...(settings.description !== undefined && {
            description: settings.description || undefined,
          }),
          ...(settings.difficulty !== undefined && {
            difficulty: settings.difficulty,
          }),
          ...(settings.is_public !== undefined && {
            is_public: settings.is_public ?? undefined,
          }),
        };

        await updateBoardSettingsMutation.mutateAsync({
          boardId,
          settings: serviceSettings,
          currentVersion: board.version || undefined,
        });
      } catch (error) {
        logger.error('Failed to update board settings', error instanceof Error ? error : new Error(String(error)), {
          boardId,
          feature: 'bingo-boards',
        });
        throw error;
      }
    },
    [board, boardId, updateBoardSettingsMutation]
  );

  // Set up real-time subscription with error recovery
  useEffect(() => {
    if (!boardId) return;

    let isCleanedUp = false;
    let cleanupFn: (() => void) | null = null;

    // Reset error state when boardId changes
    setRealtimeError(null);

    logger.debug('Setting up real-time subscription for board', {
      metadata: { boardId },
    });

    // Let the service handle all reconnection logic
    try {
      cleanupFn = realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        queryClient,
        {
          onUpdate: (updatedBoard: Tables<'bingo_boards'>) => {
            if (isCleanedUp) return;

            logger.debug('Board updated via real-time', {
              metadata: { boardId, version: updatedBoard.version },
            });
            // Reset error state on successful update
            setRealtimeError(null);
          },
          onError: (error: Error) => {
            if (isCleanedUp) return;

            logger.error('Real-time board error', error, {
              metadata: { boardId },
            });

            setRealtimeError(error);
          },
          // Let the service handle all reconnection with its own exponential backoff
          maxReconnectAttempts: 5,
          reconnectDelay: 1000,
        }
      );
    } catch (error) {
      if (!isCleanedUp) {
        logger.error('Failed to setup realtime subscription', error as Error, {
          metadata: { boardId },
        });
        setRealtimeError(error as Error);
      }
    }

    // Cleanup function
    return () => {
      isCleanedUp = true;

      // Call the cleanup function if it exists
      if (cleanupFn) {
        cleanupFn();
      }

      logger.debug('Cleaned up real-time subscription', {
        metadata: { boardId },
      });
    };
  }, [boardId, queryClient]);

  // Convert React Query error to Error object, include realtime errors
  const error = queryError
    ? new Error(queryError.message || 'Failed to fetch board')
    : realtimeError;

  return {
    // Board data
    board: board || null,
    loading,
    error,

    // Board operations
    updateBoardState,
    updateBoardSettings,

    // UI state
    showSettings,
    showShareDialog,
    optimisticUpdating,

    // UI actions
    setShowSettings,
    setShowShareDialog,
  };
};
