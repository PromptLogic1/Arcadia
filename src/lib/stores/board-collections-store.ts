/**
 * Board Collections Store
 *
 * Zustand store for board collections UI state management.
 * Part of the TanStack Query + Zustand + Service Layer pattern.
 *
 * This store handles:
 * - UI-only state (filters, loading states)
 * - No server data (that's handled by TanStack Query)
 */

import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import type { BoardCollectionFilters } from '../../services/board-collections.service';
import type { GameCategory } from '../../types';

interface BoardCollectionsState {
  // Filter state
  filters: BoardCollectionFilters;

  // UI state
  isShuffling: boolean;
}

interface BoardCollectionsActions {
  // Filter actions
  setFilters: (filters: Partial<BoardCollectionFilters>) => void;
  resetFilters: (gameType: GameCategory) => void;
  updateFilter: <K extends keyof BoardCollectionFilters>(
    key: K,
    value: BoardCollectionFilters[K]
  ) => void;

  // UI actions
  setIsShuffling: (isShuffling: boolean) => void;
}

type BoardCollectionsStore = BoardCollectionsState & BoardCollectionsActions;

const initialFilters = (
  gameType: GameCategory = 'All Games'
): BoardCollectionFilters => ({
  search: '',
  difficulty: 'all',
  sortBy: 'popular',
  gameType,
});

/**
 * Board Collections store for UI state management
 */
export const useBoardCollectionsStore =
  createWithEqualityFn<BoardCollectionsStore>()(
    devtools(
      set => ({
        // Initial state
        filters: initialFilters('All Games'), // Default, will be overridden
        isShuffling: false,

        // Filter actions
        setFilters: newFilters =>
          set(state => ({
            filters: { ...state.filters, ...newFilters },
          })),

        resetFilters: gameType =>
          set({
            filters: initialFilters(gameType),
          }),

        updateFilter: (key, value) =>
          set(state => ({
            filters: { ...state.filters, [key]: value },
          })),

        // UI actions
        setIsShuffling: isShuffling => set({ isShuffling }),
      }),
      {
        name: 'board-collections-store',
      }
    )
  );

// Selectors for optimal performance
export const useBoardCollectionsState = () =>
  useBoardCollectionsStore(
    useShallow(state => ({
      filters: state.filters,
      isShuffling: state.isShuffling,
    }))
  );

export const useBoardCollectionsActions = () =>
  useBoardCollectionsStore(
    useShallow(state => ({
      setFilters: state.setFilters,
      resetFilters: state.resetFilters,
      updateFilter: state.updateFilter,
      setIsShuffling: state.setIsShuffling,
    }))
  );
