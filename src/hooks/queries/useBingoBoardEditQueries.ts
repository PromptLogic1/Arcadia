/**
 * Bingo Board Edit React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bingoBoardEditService,
  type BoardEditData,
  type CardInsertData,
} from '../../services/bingo-board-edit.service';
import { notifications } from '@/lib/notifications';
import type { BingoCard, BingoBoard } from '@/types';

/**
 * Get board data for editing
 */
export function useBoardEditDataQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ['boardEdit', 'data', boardId],
    queryFn: () => bingoBoardEditService.getBoardForEdit(boardId),
    enabled: enabled && !!boardId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Initialize board data (separate from getBoardForEdit for complex logic)
 */
export function useBoardInitializationQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ['boardEdit', 'initialize', boardId],
    queryFn: () => bingoBoardEditService.initializeBoardData(boardId),
    enabled: enabled && !!boardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save multiple cards mutation
 */
export function useSaveCardsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cards: CardInsertData[]) =>
      bingoBoardEditService.saveCards(cards),
    onSuccess: (result, _variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      if (result.savedCards.length > 0) {
        notifications.success(
          `Saved ${result.savedCards.length} cards successfully!`
        );

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['boardEdit'] });
        queryClient.invalidateQueries({ queryKey: ['bingoCards'] });
      }
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to save cards'
      );
    },
  });
}

/**
 * Update board mutation
 */
export function useUpdateBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      updates,
      currentVersion,
    }: {
      boardId: string;
      updates: BoardEditData;
      currentVersion: number;
    }) => bingoBoardEditService.updateBoard(boardId, updates, currentVersion),
    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Board updated successfully!');

      // Update specific board cache
      queryClient.setQueryData(
        ['boardEdit', 'data', variables.boardId],
        (
          oldData:
            | { board: BingoBoard | null; cards: BingoCard[]; error?: string }
            | undefined
        ) => {
          if (oldData?.board) {
            return {
              ...oldData,
              board: result.board,
            };
          }
          return oldData;
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['boardEdit', 'data', variables.boardId],
      });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to update board'
      );
    },
  });
}

/**
 * Create card mutation
 */
export function useCreateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardData: CardInsertData) =>
      bingoBoardEditService.createCard(cardData),
    onSuccess: result => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Card created successfully!');

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['boardEdit'] });
      queryClient.invalidateQueries({ queryKey: ['bingoCards'] });
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to create card'
      );
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
      updates: Partial<BingoCard>;
    }) => bingoBoardEditService.updateCard(cardId, updates),
    onSuccess: result => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }

      notifications.success('Card updated successfully!');

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['boardEdit'] });
      queryClient.invalidateQueries({ queryKey: ['bingoCards'] });
    },
    onError: error => {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to update card'
      );
    },
  });
}

/**
 * Combined hook for board editing operations
 */
export function useBoardEditOperations(boardId: string) {
  // Queries
  const boardDataQuery = useBoardEditDataQuery(boardId);
  const initializationQuery = useBoardInitializationQuery(boardId);

  // Mutations
  const saveCardsMutation = useSaveCardsMutation();
  const updateBoardMutation = useUpdateBoardMutation();
  const createCardMutation = useCreateCardMutation();
  const updateCardMutation = useUpdateCardMutation();

  // Derived state
  const isLoading = boardDataQuery.isLoading || initializationQuery.isLoading;
  const error = boardDataQuery.error || initializationQuery.error;
  const board = boardDataQuery.data?.board || initializationQuery.data?.board;
  const cards = boardDataQuery.data?.cards || [];
  const gridCards = initializationQuery.data?.gridCards || [];
  const privateCards = initializationQuery.data?.privateCards || [];

  // Actions
  const saveCards = (cards: CardInsertData[]) => {
    return saveCardsMutation.mutateAsync(cards);
  };

  const updateBoard = (updates: BoardEditData, currentVersion: number) => {
    return updateBoardMutation.mutateAsync({
      boardId,
      updates,
      currentVersion,
    });
  };

  const createCard = (cardData: CardInsertData) => {
    return createCardMutation.mutateAsync(cardData);
  };

  const updateCard = (cardId: string, updates: Partial<BingoCard>) => {
    return updateCardMutation.mutateAsync({ cardId, updates });
  };

  return {
    // State
    board,
    cards,
    gridCards,
    privateCards,
    isLoading,
    error,

    // Loading states for individual operations
    isSavingCards: saveCardsMutation.isPending,
    isUpdatingBoard: updateBoardMutation.isPending,
    isCreatingCard: createCardMutation.isPending,
    isUpdatingCard: updateCardMutation.isPending,

    // Any operation is pending
    isMutating:
      saveCardsMutation.isPending ||
      updateBoardMutation.isPending ||
      createCardMutation.isPending ||
      updateCardMutation.isPending,

    // Actions
    saveCards,
    updateBoard,
    createCard,
    updateCard,

    // Query actions
    refetch: () => {
      boardDataQuery.refetch();
      initializationQuery.refetch();
    },
  };
}
