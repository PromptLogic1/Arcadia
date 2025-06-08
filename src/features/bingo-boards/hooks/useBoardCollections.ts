/**
 * Board Collections Hook
 *
 * Combines TanStack Query + Zustand for board collections management.
 * This replaces direct state management and Supabase calls with the modern architecture.
 */

import React, { useCallback } from 'react';
import { useBoardCollectionsQuery } from '../../../hooks/queries/useBoardCollectionsQueries';
import {
  useBoardCollectionsState,
  useBoardCollectionsActions,
} from '../../../lib/stores/board-collections-store';
import { notifications } from '../../../lib/notifications';
import { log } from '../../../lib/logger';
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

  // Initialize filters with game type synchronously
  if (filters.gameType !== gameType) {
    setFilters({ gameType });
  }

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

  // Safe update filter with race condition prevention
  const safeUpdateFilter = useCallback(
    <K extends keyof BoardCollectionFilters>(
      key: K,
      value: BoardCollectionFilters[K]
    ) => {
      // Store previous value for potential rollback
      const previousValue = filters[key];

      try {
        updateFilter(key, value);
      } catch (error) {
        // Rollback on error
        updateFilter(key, previousValue);
        log.error('Failed to update filter', error, {
          metadata: {
            hook: 'useBoardCollections',
            method: 'safeUpdateFilter',
            key,
            value,
            previousValue,
          },
        });
      }
    },
    [filters, updateFilter]
  );

  // Reset filters to defaults for current game type
  const handleResetFilters = useCallback(() => {
    resetFilters(gameType);
  }, [gameType, resetFilters]);

  // Handle shuffle from collections with proper cleanup
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
      // Declare availableCollections outside try block so it's accessible in catch
      let availableCollections: BoardCollection[] = collections;

      try {
        // Filter collections based on current difficulty if set
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
        log.error('Failed to shuffle from collections', error, {
          metadata: {
            hook: 'useBoardCollections',
            method: 'shuffleFromCollections',
            collectionsCount: availableCollections.length,
            gameType,
            difficulty: filters.difficulty,
          },
        });
        notifications.error('Failed to generate board from collections');
      } finally {
        setIsShuffling(false);
      }
    },
    [collections, filters.difficulty, setIsShuffling, gameType]
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
    updateFilter: safeUpdateFilter,
    resetFilters: handleResetFilters,
    refresh: refetch,
    shuffleFromCollections,

    // Derived state
    availableForShuffle,
    collectionCount: collections.length,
  };
}
