/**
 * Card Library Hook
 *
 * Combines TanStack Query (server state) with Zustand (UI state)
 * following the new architecture pattern.
 */

import { useCallback, useMemo } from 'react';
import {
  useCardLibraryState,
  useCardLibraryActions,
  type CardLibraryFilters,
} from '@/lib/stores/card-library-store';
import {
  useCardLibraryPublicCardsQuery,
  useRandomCardsQuery,
  useFeaturedCollectionsQuery,
  useCreateBulkCardsMutation,
  useShuffleCardsMutation,
} from '@/hooks/queries/useCardLibraryQueries';
import { useDebounce } from '@/hooks/useDebounce';
import type { BingoCard, GameCategory } from '@/types';

interface UseCardLibraryProps {
  gameType: GameCategory;
  initialFilters?: Partial<CardLibraryFilters>;
}

export function useCardLibrary({
  gameType,
  initialFilters = {},
}: UseCardLibraryProps) {
  // Get UI state and actions from Zustand store
  const {
    bulkMode,
    selectedCards,
    isShuffling,
    activeTab,
    filters,
    currentPage,
  } = useCardLibraryState();

  const {
    setBulkMode,
    addSelectedCard,
    removeSelectedCard,
    clearSelectedCards,
    setIsShuffling,
    setActiveTab,
    updateFilter,
    setCurrentPage,
    setGameType,
  } = useCardLibraryActions();

  // Debounce search filter
  const debouncedSearch = useDebounce(filters.search, 300);

  // Initialize gameType and filters synchronously
  const currentGameType = filters.gameType;
  if (currentGameType !== gameType) {
    setGameType(gameType);
  }

  // Apply initial filters if they differ from current
  if (initialFilters && Object.keys(initialFilters).length > 0) {
    Object.entries(initialFilters).forEach(([key, value]) => {
      const filterKey = key as keyof CardLibraryFilters;
      if (filters[filterKey] !== value) {
        updateFilter(filterKey, value);
      }
    });
  }

  // Create filters with debounced search
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  // TanStack Query hooks for server state
  const {
    data: publicCardsResponse,
    isLoading: isLoadingCards,
    error: cardsError,
    refetch: refetchCards,
  } = useCardLibraryPublicCardsQuery(debouncedFilters, currentPage);

  const {
    data: randomCards,
    isLoading: isLoadingRandom,
    refetch: _refetchRandom,
  } = useRandomCardsQuery(
    { gameType: filters.gameType, difficulty: filters.difficulty },
    25, // Get 25 random cards
    false // Don't auto-fetch, only on demand
  );

  const { data: featuredCollections, isLoading: isLoadingCollections } =
    useFeaturedCollectionsQuery(filters.gameType);

  // Mutations
  const createBulkCardsMutation = useCreateBulkCardsMutation();
  const shuffleCardsMutation = useShuffleCardsMutation();

  // Action handlers with mount checks
  const handleFilterChange = useCallback(
    (
      key: keyof CardLibraryFilters,
      value: CardLibraryFilters[keyof CardLibraryFilters]
    ) => {
      updateFilter(key, value);
    },
    [updateFilter]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
    },
    [setCurrentPage]
  );

  const handleCardToggle = useCallback(
    (cardId: string) => {
      if (selectedCards.has(cardId)) {
        removeSelectedCard(cardId);
      } else {
        addSelectedCard(cardId);
      }
    },
    [selectedCards, addSelectedCard, removeSelectedCard]
  );

  const handleBulkAdd = useCallback(
    async (cards: BingoCard[]) => {
      if (cards.length === 0) return;

      const cardsToCreate = cards.map(card => ({
        title: card.title,
        description: card.description,
        game_type: card.game_type,
        difficulty: card.difficulty,
        tags: card.tags,
        creator_id: '', // Will be set by service
        is_public: card.is_public || false,
      }));

      try {
        await createBulkCardsMutation.mutateAsync(cardsToCreate);
        clearSelectedCards();
        setBulkMode(false);
      } catch (error) {
        // Error handled by mutation onError
        console.error('Failed to bulk add cards:', error);
      }
    },
    [createBulkCardsMutation, clearSelectedCards, setBulkMode]
  );

  const handleShuffle = useCallback(
    async (count = 25) => {
      setIsShuffling(true);
      try {
        const result = await shuffleCardsMutation.mutateAsync({
          filters: {
            gameType: filters.gameType,
            difficulty: filters.difficulty,
          },
          count,
        });
        return result.cards || [];
      } catch (error) {
        console.error('Failed to shuffle cards:', error);
        return [];
      } finally {
        setIsShuffling(false);
      }
    },
    [shuffleCardsMutation, filters.gameType, filters.difficulty, setIsShuffling]
  );

  const handleUseCollection = useCallback((collectionCards: BingoCard[]) => {
    // This would be handled by the parent component
    // Return the cards for the parent to use
    return collectionCards;
  }, []);

  // Derived state
  const selectedCardsArray = Array.from(selectedCards)
    .map(id => publicCardsResponse?.cards.find(card => card.id === id))
    .filter(Boolean) as BingoCard[];

  const isLoading = isLoadingCards || isLoadingCollections;
  const hasError = !!cardsError;

  return {
    // Server state (from TanStack Query)
    publicCards: publicCardsResponse?.cards || [],
    totalCount: publicCardsResponse?.totalCount || 0,
    hasMore: publicCardsResponse?.hasMore || false,
    randomCards: randomCards || [],
    featuredCollections: featuredCollections || [],

    // Loading states
    isLoading,
    isLoadingCards,
    isLoadingRandom,
    isLoadingCollections,
    isShuffling,
    hasError,

    // UI state (from Zustand)
    bulkMode,
    selectedCards,
    selectedCardsArray,
    activeTab,
    filters,
    currentPage,

    // Actions
    handleFilterChange,
    handlePageChange,
    handleCardToggle,
    handleBulkAdd,
    handleShuffle,
    handleUseCollection,
    setBulkMode,
    setActiveTab,
    clearSelectedCards,
    refetchCards,

    // Mutations
    isCreatingBulkCards: createBulkCardsMutation.isPending,
  };
}
