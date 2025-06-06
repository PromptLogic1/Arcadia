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
    select: (response) => {
      if (response.success && response.data) {
        return {
          board: response.data.board,
          cards: response.data.cards,
          error: undefined,
        };
      }
      return {
        board: null,
        cards: [],
        error: response.error || 'Failed to load board data',
      };
    },
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
    select: (response) => {
      if (response.success && response.data) {
        return {
          board: response.data.board,
          gridCards: response.data.gridCards,
          privateCards: response.data.privateCards,
          success: true,
          error: undefined,
        };
      }
      return {
        board: undefined,
        gridCards: undefined,
        privateCards: undefined,
        success: false,
        error: response.error || 'Failed to initialize board data',
      };
    },
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
      if (!result.success || !result.data) {
        notifications.error(result.error || 'Failed to save cards');
        return;
      }

      if (result.data.length > 0) {
        notifications.success(
          `Saved ${result.data.length} cards successfully!`
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
      if (!result.success || !result.data) {
        notifications.error(result.error || 'Failed to update board');
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
              board: result.data,
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
      if (!result.success || !result.data) {
        notifications.error(result.error || 'Failed to create card');
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
      if (!result.success || !result.data) {
        notifications.error(result.error || 'Failed to update card');
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
 * Board edit query mutations collection
 */
export const boardEditMutations = {
  useSaveCards: useSaveCardsMutation,
  useUpdateBoard: useUpdateBoardMutation,
  useCreateCard: useCreateCardMutation,
  useUpdateCard: useUpdateCardMutation,
};