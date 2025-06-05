/**
 * Board Collections Hook
 *
 * Combines TanStack Query + Zustand for board collections management.
 * This replaces direct state management and Supabase calls with the modern architecture.
 */

import React, { useCallback, useEffect } from 'react';
import { useBoardCollectionsQuery } from '../../../hooks/queries/useBoardCollectionsQueries';
import {
  useBoardCollectionsState,
  useBoardCollectionsActions,
} from '../../../lib/stores/board-collections-store';
import { notifications } from '../../../lib/notifications';
import type { GameCategory } from '../../../types';
import type {
  BoardCollection,
  BoardCollectionFilters,
} from '../../../services/board-collections.service';

export interface UseBoardCollectionsReturn {
  // Server state (from TanStack Query)
  collections: BoardCollection[];
  isLoading: boolean;
  error: string | undefined;

  // UI state (from Zustand)
  filters: BoardCollectionFilters;
  isShuffling: boolean;

  // Actions
  updateFilter: <K extends keyof BoardCollectionFilters>(
    key: K,
    value: BoardCollectionFilters[K]
  ) => void;
  resetFilters: () => void;
  refresh: () => void;
  shuffleFromCollections: (
    onShuffleFromCollections: (collections: BoardCollection[]) => Promise<void>
  ) => Promise<void>;

  // Derived state
  availableForShuffle: BoardCollection[];
  collectionCount: number;
}

/**
 * Modern hook for board collections management
 */
export function useBoardCollections(
  gameType: GameCategory
): UseBoardCollectionsReturn {
  // Zustand store for UI state
  const { filters, isShuffling } = useBoardCollectionsState();
  const { setFilters, resetFilters, updateFilter, setIsShuffling } =
    useBoardCollectionsActions();

  // Initialize filters with game type
  useEffect(() => {
    if (filters.gameType !== gameType) {
      setFilters({ gameType });
    }
  }, [gameType, filters.gameType, setFilters]);

  // TanStack Query for server state
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useBoardCollectionsQuery(filters);

  // Extract data with stable default
  const rawCollections = data?.collections;
  const collections = React.useMemo(
    () => rawCollections || [],
    [rawCollections]
  );
  const error =
    data?.error ||
    (queryError instanceof Error ? queryError.message : undefined);

  // Reset filters to defaults for current game type
  const handleResetFilters = useCallback(() => {
    resetFilters(gameType);
  }, [gameType, resetFilters]);

  // Handle shuffle from collections
  const shuffleFromCollections = useCallback(
    async (
      onShuffleFromCollections: (
        collections: BoardCollection[]
      ) => Promise<void>
    ) => {
      if (collections.length === 0) {
        notifications.error('No board collections available for shuffling');
        return;
      }

      setIsShuffling(true);
      try {
        // Filter collections based on current difficulty if set
        let availableCollections = collections;
        if (filters.difficulty !== 'all') {
          availableCollections = collections.filter(
            (collection: BoardCollection) =>
              collection.difficulty === filters.difficulty
          );
        }

        if (availableCollections.length === 0) {
          notifications.error(
            'No collections available with the selected difficulty'
          );
          return;
        }

        await onShuffleFromCollections(availableCollections);
      } catch (error) {
        console.error('Failed to shuffle from collections:', error);
        notifications.error('Failed to generate board from collections');
      } finally {
        setIsShuffling(false);
      }
    },
    [collections, filters.difficulty, setIsShuffling]
  );

  // Derived state
  const availableForShuffle =
    filters.difficulty !== 'all'
      ? collections.filter(
          (c: BoardCollection) => c.difficulty === filters.difficulty
        )
      : collections;

  return {
    // Server state
    collections,
    isLoading,
    error,

    // UI state
    filters,
    isShuffling,

    // Actions
    updateFilter,
    resetFilters: handleResetFilters,
    refresh: refetch,
    shuffleFromCollections,

    // Derived state
    availableForShuffle,
    collectionCount: collections.length,
  };
}
