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

/**
 * Get cards by IDs query
 */
export function useCardsQuery(cardIds: string[]) {
  return useQuery({
    queryKey: queryKeys.bingoCards.byIds(cardIds),
    queryFn: () => bingoCardsService.getCardsByIds(cardIds),
    enabled: cardIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    placeholderData: (previousData) => previousData, // Keep previous data while loading
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
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.card) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.bingoCards.user(variables.creator_id) 
        });
        
        if (response.card.is_public) {
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.bingoCards.public() 
          });
        }

        notifications.success('Card created successfully!');
      }
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
    onSuccess: (response, cardId) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: queryKeys.bingoCards.byIds([cardId]) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bingoCards.public() });
    },
    onError: (_error: Error) => {
      notifications.error('Failed to vote on card');
    },
  });
}