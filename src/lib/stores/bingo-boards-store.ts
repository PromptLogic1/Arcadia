import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type {
  BoardSection,
  BoardFilters,
} from '../../services/bingo-boards.service';

// UI State Only - No Server Data!
interface BingoBoardsUIState {
  // Current UI state
  currentSection: BoardSection;
  currentPage: number;

  // Filters (UI state only)
  filters: BoardFilters;

  // UI interaction state
  selectedBoardId: string | null;
  showCreateDialog: boolean;
  showDeleteDialog: boolean;
  showCloneDialog: boolean;

  // Grid layout preferences
  viewMode: 'grid' | 'list';
  itemsPerPage: number;
}

interface BingoBoardsUIActions {
  // Section navigation
  setCurrentSection: (section: BoardSection) => void;
  setCurrentPage: (page: number) => void;

  // Filter management
  setFilters: (filters: Partial<BoardFilters>) => void;
  clearFilters: () => void;
  resetFiltersToDefault: () => void;

  // UI interactions
  setSelectedBoardId: (id: string | null) => void;
  setShowCreateDialog: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowCloneDialog: (show: boolean) => void;

  // View preferences
  setViewMode: (mode: 'grid' | 'list') => void;
  setItemsPerPage: (count: number) => void;

  // Combined actions
  resetToDefaults: () => void;
}

type BingoBoardsState = BingoBoardsUIState & BingoBoardsUIActions;

const DEFAULT_FILTERS: BoardFilters = {
  gameType: undefined,
  difficulty: 'all',
  search: '',
  sortBy: 'newest',
};

const DEFAULT_STATE: BingoBoardsUIState = {
  currentSection: 'all',
  currentPage: 1,
  filters: DEFAULT_FILTERS,
  selectedBoardId: null,
  showCreateDialog: false,
  showDeleteDialog: false,
  showCloneDialog: false,
  viewMode: 'grid',
  itemsPerPage: 12,
};

export const useBingoBoardsStore = createWithEqualityFn<BingoBoardsState>()(
  devtools(
    (set, _get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Section navigation
      setCurrentSection: section =>
        set({ currentSection: section, currentPage: 1 }), // Reset page when changing section

      setCurrentPage: page => set({ currentPage: page }),

      // Filter management
      setFilters: newFilters =>
        set(state => ({
          filters: { ...state.filters, ...newFilters },
          currentPage: 1, // Reset page when filters change
        })),

      clearFilters: () =>
        set({
          filters: { ...DEFAULT_FILTERS },
          currentPage: 1,
        }),

      resetFiltersToDefault: () =>
        set({
          filters: { ...DEFAULT_FILTERS },
          currentPage: 1,
        }),

      // UI interactions
      setSelectedBoardId: id => set({ selectedBoardId: id }),

      setShowCreateDialog: show => set({ showCreateDialog: show }),

      setShowDeleteDialog: show => set({ showDeleteDialog: show }),

      setShowCloneDialog: show => set({ showCloneDialog: show }),

      // View preferences
      setViewMode: mode => set({ viewMode: mode }),

      setItemsPerPage: count => set({ itemsPerPage: count, currentPage: 1 }), // Reset page when changing items per page

      // Combined actions
      resetToDefaults: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'bingo-boards-ui-store',
    }
  )
);

// Selector hooks for performance
export const useBingoBoardsState = () =>
  useBingoBoardsStore(
    useShallow(state => ({
      currentSection: state.currentSection,
      currentPage: state.currentPage,
      filters: state.filters,
      selectedBoardId: state.selectedBoardId,
      viewMode: state.viewMode,
      itemsPerPage: state.itemsPerPage,
    }))
  );

export const useBingoBoardsDialogs = () =>
  useBingoBoardsStore(
    useShallow(state => ({
      showCreateDialog: state.showCreateDialog,
      showDeleteDialog: state.showDeleteDialog,
      showCloneDialog: state.showCloneDialog,
    }))
  );

export const useBingoBoardsActions = () =>
  useBingoBoardsStore(
    useShallow(state => ({
      setCurrentSection: state.setCurrentSection,
      setCurrentPage: state.setCurrentPage,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
      resetFiltersToDefault: state.resetFiltersToDefault,
      setSelectedBoardId: state.setSelectedBoardId,
      setShowCreateDialog: state.setShowCreateDialog,
      setShowDeleteDialog: state.setShowDeleteDialog,
      setShowCloneDialog: state.setShowCloneDialog,
      setViewMode: state.setViewMode,
      setItemsPerPage: state.setItemsPerPage,
      resetToDefaults: state.resetToDefaults,
    }))
  );
