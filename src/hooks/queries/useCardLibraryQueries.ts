/**
 * Card Library React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cardLibraryService,
  type CardLibraryFilters,
} from '../../services/card-library.service';
import { notifications } from '@/lib/notifications';
import type {
  BingoCard,
  GameCategory,
  Difficulty as _Difficulty,
} from '@/types';

/**
 * Get public cards with filtering and pagination
 */
export function useCardLibraryPublicCardsQuery(
  filters: CardLibraryFilters,
  page = 1,
  enabled = true
) {
  return useQuery({
    queryKey: ['cardLibrary', 'public', filters, page],
    queryFn: () => cardLibraryService.getPublicCards(filters, page),
    enabled: enabled && !!filters.gameType,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: data => data.response,
  });
}

/**
 * Get random cards for shuffling
 */
export function useRandomCardsQuery(
  filters: Pick<CardLibraryFilters, 'gameType' | 'difficulty'>,
  count: number,
  enabled = false
) {
  return useQuery({
    queryKey: ['cardLibrary', 'random', filters, count],
    queryFn: () => cardLibraryService.getRandomCards(filters, count),
    enabled: enabled && !!filters.gameType && count > 0,
    staleTime: 0, // Always fresh for randomization
    select: data => data.cards,
  });
}

/**
 * Get featured collections
 */
export function useFeaturedCollectionsQuery(
  gameType: GameCategory,
  enabled = true
) {
  return useQuery({
    queryKey: ['cardLibrary', 'collections', gameType],
    queryFn: () => cardLibraryService.getFeaturedCollections(gameType),
    enabled: enabled && !!gameType,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: data => data.collections,
  });
}

/**
 * Create multiple cards at once
 */
export function useCreateBulkCardsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      cards: Omit<BingoCard, 'id' | 'created_at' | 'updated_at' | 'votes'>[]
    ) => cardLibraryService.createBulkCards(cards),
    onSuccess: (result, _variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success(
        `Created ${result.cards.length} cards successfully!`
      );

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['cardLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['bingoCards'] });
    },
    onError: error => {
      const message =
        error instanceof Error ? error.message : 'Failed to create cards';
      notifications.error(message);
    },
  });
}

/**
 * Manually trigger random cards fetch
 */
export function useShuffleCardsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      filters,
      count,
    }: {
      filters: Pick<CardLibraryFilters, 'gameType' | 'difficulty'>;
      count: number;
    }) => cardLibraryService.getRandomCards(filters, count),
    onSuccess: result => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      // Update the random cards cache
      const queryKey = ['cardLibrary', 'random', result.cards[0]?.game_type];
      queryClient.setQueryData(queryKey, result.cards);
    },
    onError: error => {
      const message =
        error instanceof Error ? error.message : 'Failed to shuffle cards';
      notifications.error(message);
    },
  });
}
