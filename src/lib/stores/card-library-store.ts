/**
 * Card Library Store (UI State Only)
 * 
 * Manages only UI state for the card library component.
 * Server data is handled by TanStack Query.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Enums } from '@/types/database-generated';

// Type aliases from database-generated
type GameCategory = Enums<'game_category'>;
type Difficulty = Enums<'difficulty_level'>;

export interface CardLibraryFilters {
  search: string;
  difficulty: Difficulty | 'all';
  sortBy: 'popular' | 'newest' | 'rating' | 'title';
  gameType: GameCategory;
}

interface CardLibraryState {
  // UI State
  bulkMode: boolean;
  selectedCards: Set<string>;
  isShuffling: boolean;
  activeTab: 'library' | 'collections' | 'create';
  
  // Filter state
  filters: CardLibraryFilters;
  
  // Pagination
  currentPage: number;
}

interface CardLibraryActions {
  // UI actions
  setBulkMode: (bulkMode: boolean) => void;
  setSelectedCards: (cards: Set<string>) => void;
  addSelectedCard: (cardId: string) => void;
  removeSelectedCard: (cardId: string) => void;
  clearSelectedCards: () => void;
  setIsShuffling: (shuffling: boolean) => void;
  setActiveTab: (tab: CardLibraryState['activeTab']) => void;
  
  // Filter actions
  setFilters: (filters: Partial<CardLibraryFilters>) => void;
  updateFilter: <K extends keyof CardLibraryFilters>(
    key: K,
    value: CardLibraryFilters[K]
  ) => void;
  resetFilters: (gameType: GameCategory) => void;
  
  // Pagination actions
  setCurrentPage: (page: number) => void;
  resetPagination: () => void;
  
  // Combined actions
  setGameType: (gameType: GameCategory) => void;
}

const createDefaultFilters = (gameType: GameCategory): CardLibraryFilters => ({
  search: '',
  difficulty: 'all',
  sortBy: 'popular',
  gameType,
});

export const useCardLibraryStore = createWithEqualityFn<CardLibraryState & CardLibraryActions>()(
  devtools(
    (set) => ({
      // Initial state
      bulkMode: false,
      selectedCards: new Set(),
      isShuffling: false,
      activeTab: 'library',
      filters: createDefaultFilters('All Games'),
      currentPage: 1,

      // UI actions
      setBulkMode: (bulkMode) => 
        set({ bulkMode, selectedCards: bulkMode ? new Set() : new Set() }, false, 'setBulkMode'),
      
      setSelectedCards: (cards) => 
        set({ selectedCards: cards }, false, 'setSelectedCards'),
      
      addSelectedCard: (cardId) =>
        set((state) => ({
          selectedCards: new Set([...state.selectedCards, cardId])
        }), false, 'addSelectedCard'),
      
      removeSelectedCard: (cardId) =>
        set((state) => {
          const newSet = new Set(state.selectedCards);
          newSet.delete(cardId);
          return { selectedCards: newSet };
        }, false, 'removeSelectedCard'),
      
      clearSelectedCards: () =>
        set({ selectedCards: new Set() }, false, 'clearSelectedCards'),
      
      setIsShuffling: (shuffling) =>
        set({ isShuffling: shuffling }, false, 'setIsShuffling'),
      
      setActiveTab: (tab) =>
        set({ activeTab: tab }, false, 'setActiveTab'),

      // Filter actions
      setFilters: (newFilters) =>
        set((state) => ({ 
          filters: { ...state.filters, ...newFilters },
          currentPage: 1 // Reset pagination when filters change
        }), false, 'setFilters'),
      
      updateFilter: (key, value) =>
        set((state) => ({ 
          filters: { ...state.filters, [key]: value },
          currentPage: 1 // Reset pagination when filters change
        }), false, 'updateFilter'),
      
      resetFilters: (gameType) =>
        set({ 
          filters: createDefaultFilters(gameType),
          currentPage: 1 
        }, false, 'resetFilters'),

      // Pagination actions
      setCurrentPage: (page) =>
        set({ currentPage: page }, false, 'setCurrentPage'),
      
      resetPagination: () =>
        set({ currentPage: 1 }, false, 'resetPagination'),

      // Combined actions
      setGameType: (gameType) =>
        set((state) => ({
          filters: { ...state.filters, gameType },
          currentPage: 1,
          selectedCards: new Set(), // Clear selections when changing game type
        }), false, 'setGameType'),
    }),
    {
      name: 'card-library-store',
      partialize: (state: CardLibraryState) => ({
        // Persist only certain UI preferences
        filters: state.filters,
        activeTab: state.activeTab,
      }),
    }
  )
);

// Selectors for performance optimization
export const useCardLibraryState = () => 
  useCardLibraryStore(useShallow((state) => ({
    bulkMode: state.bulkMode,
    selectedCards: state.selectedCards,
    isShuffling: state.isShuffling,
    activeTab: state.activeTab,
    filters: state.filters,
    currentPage: state.currentPage,
  })));

export const useCardLibraryActions = () =>
  useCardLibraryStore(useShallow((state) => ({
    setBulkMode: state.setBulkMode,
    setSelectedCards: state.setSelectedCards,
    addSelectedCard: state.addSelectedCard,
    removeSelectedCard: state.removeSelectedCard,
    clearSelectedCards: state.clearSelectedCards,
    setIsShuffling: state.setIsShuffling,
    setActiveTab: state.setActiveTab,
    setFilters: state.setFilters,
    updateFilter: state.updateFilter,
    resetFilters: state.resetFilters,
    setCurrentPage: state.setCurrentPage,
    resetPagination: state.resetPagination,
    setGameType: state.setGameType,
  })));