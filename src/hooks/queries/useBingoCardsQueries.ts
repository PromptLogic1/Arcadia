/**
 * Bingo Cards React Query Hooks
 *
 * Hooks for bingo cards operations using TanStack Query.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bingoCardsService } from '../../services/bingo-cards.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';
import type { CardFilters } from '../../services/bingo-cards.service';
import type { BingoCard } from '@/types';

/**
 * Get cards by IDs query
 */
export function useCardsQuery(cardIds: string[]) {
  return useQuery({
    queryKey: queryKeys.bingoCards.byIds(cardIds),
    queryFn: () => bingoCardsService.getCardsByIds(cardIds),
    enabled: cardIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: response => {
      if (response.success && response.data) {
        return { cards: response.data, error: undefined };
      }
      return { cards: [], error: response.error || 'Failed to fetch cards' };
    },
  });
}

/**
 * Get public cards query with filters and pagination
 */
export function usePublicCardsQuery(
  filters: CardFilters = {},
  page = 1,
  limit = 50
) {
  return useQuery({
    queryKey: queryKeys.bingoCards.public(filters, page),
    queryFn: () => bingoCardsService.getPublicCards(filters, page, limit),
    staleTime: 1 * 60 * 1000, // 1 minute for public data
    placeholderData: previousData => previousData, // Keep previous data while loading
    select: response => {
      if (response.success && response.data) {
        return { response: response.data, error: undefined };
      }
      return {
        response: { cards: [], totalCount: 0, hasMore: false },
        error: response.error || 'Failed to fetch public cards',
      };
    },
  });
}

/**
 * Create card mutation
 */
export function useCreateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bingoCardsService.createCard,
    onSuccess: (response, variables) => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to create card');
        return;
      }

      // Invalidate relevant queries
      if (variables.creator_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.bingoCards.user(variables.creator_id),
        });
      }

      if (response.data.is_public) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.bingoCards.public(),
        });
      }

      notifications.success('Card created successfully!');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to create card');
    },
  });
}

/**
 * Vote card mutation with optimistic update
 */
export function useVoteCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bingoCardsService.voteCard,
    onMutate: async (cardId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.bingoCards.byIds([cardId]),
      });

      // Snapshot the previous value
      const previousCards = queryClient.getQueryData(
        queryKeys.bingoCards.byIds([cardId])
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.bingoCards.byIds([cardId]),
        (old: { cards: BingoCard[]; error?: string } | undefined) => {
          if (old?.cards?.[0]) {
            return {
              ...old,
              cards: [
                {
                  ...old.cards[0],
                  votes: (old.cards[0].votes || 0) + 1,
                },
              ],
            };
          }
          return old;
        }
      );

      // Return a context object with the snapshotted value
      return { previousCards };
    },
    onError: (_err, cardId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.bingoCards.byIds([cardId]),
          context.previousCards
        );
      }
      notifications.error('Failed to vote on card');
    },
    onSuccess: response => {
      if (response.success && response.data) {
        notifications.success('Vote recorded!');
      } else {
        notifications.error(response.error || 'Failed to vote on card');
      }
    },
    onSettled: (_data, _error, cardId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.bingoCards.byIds([cardId]),
      });
    },
  });
}

/**
 * Get user cards query with filters and pagination
 */
export function useUserCardsQuery(
  userId: string,
  filters: CardFilters = {},
  page = 1,
  limit = 50,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.bingoCards.user(userId, filters, page),
    queryFn: () => bingoCardsService.getUserCards(userId, filters, page, limit),
    enabled: enabled && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: previousData => previousData,
    select: response => {
      if (response.success && response.data) {
        return { response: response.data, error: undefined };
      }
      return {
        response: { cards: [], totalCount: 0, hasMore: false },
        error: response.error || 'Failed to fetch user cards',
      };
    },
  });
}

/**
 * Update card mutation
 */
export function useUpdateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      updates,
    }: {
      cardId: string;
      updates: Parameters<typeof bingoCardsService.updateCard>[1];
    }) => bingoCardsService.updateCard(cardId, updates),
    onSuccess: (response, variables) => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to update card');
        return;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.bingoCards.byIds([variables.cardId]),
      });
      // Invalidate all user and public cards queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.bingoCards.all(),
        refetchType: 'active',
      });

      notifications.success('Card updated successfully!');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to update card');
    },
  });
}

/**
 * Delete card mutation
 */
export function useDeleteCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bingoCardsService.deleteCard,
    onSuccess: (response, cardId) => {
      if (!response.success) {
        notifications.error(response.error || 'Failed to delete card');
        return;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.bingoCards.byIds([cardId]),
      });
      // Invalidate all user and public cards queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.bingoCards.all(),
        refetchType: 'active',
      });

      notifications.success('Card deleted successfully!');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to delete card');
    },
  });
}

/**
 * Bulk create cards mutation
 */
export function useBulkCreateCardsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bingoCardsService.createCards,
    onSuccess: (response, variables) => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to create cards');
        return;
      }

      // Invalidate relevant queries
      if (variables.length > 0 && variables[0]?.creator_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.bingoCards.user(variables[0].creator_id),
        });
      }

      if (variables.some(card => card.is_public)) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.bingoCards.public(),
        });
      }

      notifications.success(
        `Created ${response.data.length} cards successfully!`
      );
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to create cards');
    },
  });
}
