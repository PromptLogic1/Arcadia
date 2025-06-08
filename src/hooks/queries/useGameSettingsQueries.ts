import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameSettingsService } from '../../services/game-settings.service';
import type { BoardSettings } from '@/types';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

// Type-safe error conversion
function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  if (value && typeof value === 'object' && 'message' in value) {
    return new Error(String(value.message));
  }

  return new Error(String(value));
}

// Query keys factory
export const gameSettingsKeys = {
  all: ['gameSettings'] as const,
  board: (boardId: string) =>
    [...gameSettingsKeys.all, 'board', boardId] as const,
};

/**
 * Hook to fetch game settings
 */
export function useGameSettingsQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: gameSettingsKeys.board(boardId),
    queryFn: ({ signal }) =>
      gameSettingsService.getSettings(boardId, { signal }),
    enabled: enabled && !!boardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook to update game settings
 */
export function useUpdateGameSettings(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: BoardSettings) => {
      // Validate settings first
      const validation = gameSettingsService.validateSettings(settings);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid settings');
      }

      return gameSettingsService.updateSettings(boardId, settings);
    },
    onMutate: async newSettings => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: gameSettingsKeys.board(boardId),
      });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(
        gameSettingsKeys.board(boardId)
      );

      // Optimistically update to the new value
      queryClient.setQueryData(gameSettingsKeys.board(boardId), {
        data: newSettings,
        error: null,
      });

      // Return a context with the previous and new settings
      return { previousSettings, newSettings };
    },
    onError: (err, newSettings, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(
        gameSettingsKeys.board(boardId),
        context?.previousSettings
      );

      logger.error('Failed to update game settings', toError(err), {
        metadata: { boardId, newSettings },
      });

      notifications.error(
        err instanceof Error ? err.message : 'Failed to update settings'
      );
    },
    onSuccess: response => {
      if (response.data) {
        notifications.success('Settings updated successfully');
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: gameSettingsKeys.board(boardId),
      });
    },
  });
}

/**
 * Hook to prefetch game settings
 */
export function usePrefetchGameSettings() {
  const queryClient = useQueryClient();

  return async (boardId: string) => {
    await queryClient.prefetchQuery({
      queryKey: gameSettingsKeys.board(boardId),
      queryFn: ({ signal }) =>
        gameSettingsService.getSettings(boardId, { signal }),
      staleTime: 5 * 60 * 1000,
    });
  };
}
