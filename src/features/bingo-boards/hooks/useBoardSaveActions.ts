/**
 * Focused hook for board save operations
 * Part of the refactored useBingoBoardEdit split
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/stores/auth-store';
import useBoardEditStore, {
  useBoardEditActions,
} from '@/lib/stores/board-edit-store';
import {
  useSaveCardsMutation,
  useUpdateBoardMutation,
} from '@/hooks/queries/useBingoBoardEditQueries';
import { queryKeys } from '@/hooks/queries';
import { notifications } from '@/lib/notifications';
import type { BingoCard } from '@/types';
import type { BoardEditData } from '@/services/bingo-board-edit.service';
import type { BingoBoardDomain } from '@/types/domains/bingo';
import type { ServiceResponse } from '@/lib/service-types';


export function useBoardSaveActions(boardId: string) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const uiActions = useBoardEditActions();
  const saveCardsMutation = useSaveCardsMutation();
  const updateBoardMutation = useUpdateBoardMutation();

  // Memoized save board action
  const saveBoard = useCallback(async () => {
    if (!authUser) {
      notifications.error('Please login to save boards');
      return;
    }

    // Get current state directly from store
    const currentState = useBoardEditStore.getState();
    const boardDataQuery = await queryClient.ensureQueryData({
      queryKey: queryKeys.boardEdit.data(boardId),
    });

    // Type guard for service response
    const isBoardEditResponse = (
      data: unknown
    ): data is ServiceResponse<{
      board: BingoBoardDomain;
      cards: BingoCard[];
    }> => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'success' in data &&
        typeof data.success === 'boolean'
      );
    };

    if (!isBoardEditResponse(boardDataQuery)) {
      notifications.error('Board data not loaded');
      return;
    }

    if (!boardDataQuery.success || !boardDataQuery.data?.board) {
      notifications.error('Board data not loaded');
      return;
    }

    const currentBoard = boardDataQuery.data.board;

    try {
      uiActions.setIsSaving(true);

      // Save temporary cards first
      const tempCards = [
        ...currentState.localGridCards,
        ...currentState.localPrivateCards,
      ].filter((card: BingoCard) => card.id.startsWith('temp-') && card.title);

      if (tempCards.length > 0) {
        const cardInsertData = tempCards.map(card => ({
          title: card.title,
          description: card.description,
          game_type: currentBoard.game_type,
          difficulty: currentBoard.difficulty,
          tags: card.tags,
          creator_id: authUser.id,
          is_public: false,
        }));

        const saveResult = await saveCardsMutation.mutateAsync(cardInsertData);

        if (!saveResult.success || !saveResult.data) {
          throw new Error(saveResult.error || 'Failed to save cards');
        }

        // Update local state with saved cards
        const savedCards = saveResult.data;

        // Update grid cards with new IDs
        const updatedGridCards = currentState.localGridCards.map(card => {
          if (card.id?.startsWith('temp-')) {
            const savedCard = savedCards.find(
              (sc: BingoCard) =>
                sc.title === card.title && sc.game_type === card.game_type
            );
            return savedCard || card;
          }
          return card;
        });
        uiActions.setLocalGridCards(updatedGridCards);

        // Update private cards with new IDs
        const updatedPrivateCards = currentState.localPrivateCards.map(card => {
          if (card.id.startsWith('temp-')) {
            const saved = savedCards.find(
              (sc: BingoCard) =>
                sc.title === card.title && sc.game_type === card.game_type
            );
            return saved || card;
          }
          return card;
        });
        uiActions.setLocalPrivateCards(updatedPrivateCards);
      }

      // Convert grid cards to board cells
      const boardCells = currentState.localGridCards.map(card => ({
        cell_id: card.id.startsWith('temp-') ? null : card.id,
        text: card.title || null,
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: false,
        version: (currentBoard.version || 0) + 1,
        last_updated: Date.now(),
        last_modified_by: authUser.id,
      }));

      // Update board with new state
      const boardUpdate: BoardEditData = {
        board_state: boardCells,
      };

      const updateResult = await updateBoardMutation.mutateAsync({
        boardId: currentBoard.id,
        updates: boardUpdate,
        currentVersion: currentBoard.version || 0,
      });

      if (updateResult.success && updateResult.data) {
        // Invalidate board data to refetch
        await queryClient.invalidateQueries({
          queryKey: queryKeys.boardEdit.data(boardId),
        });
        notifications.success('Board saved successfully!');
        uiActions.setShowSaveSuccess(true);
      }
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : 'Failed to save board'
      );
    } finally {
      uiActions.setIsSaving(false);
    }
  }, [
    authUser,
    boardId,
    queryClient,
    uiActions,
    saveCardsMutation,
    updateBoardMutation,
  ]);

  // Memoized publish action
  const publishBoard = useCallback(async () => {
    const boardDataQuery = await queryClient.ensureQueryData({
      queryKey: queryKeys.boardEdit.data(boardId),
    });

    // Type guard for service response
    const isBoardEditResponse = (
      data: unknown
    ): data is ServiceResponse<{
      board: BingoBoardDomain;
      cards: BingoCard[];
    }> => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'success' in data &&
        typeof data.success === 'boolean'
      );
    };

    if (!isBoardEditResponse(boardDataQuery)) {
      notifications.error('Board data not loaded');
      return;
    }

    if (!boardDataQuery.success || !boardDataQuery.data?.board) {
      notifications.error('Board data not loaded');
      return;
    }

    const currentBoard = boardDataQuery.data.board;

    try {
      const updateResult = await updateBoardMutation.mutateAsync({
        boardId: currentBoard.id,
        updates: { is_public: true },
        currentVersion: currentBoard.version || 0,
      });

      if (updateResult.success && updateResult.data) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.boardEdit.data(boardId),
        });
        notifications.success('Board published successfully!');
      }
    } catch {
      notifications.error('Failed to publish board');
    }
  }, [boardId, queryClient, updateBoardMutation]);

  // Helper actions for compatibility
  const startSaving = useCallback(() => {
    uiActions.setIsSaving(true);
  }, [uiActions]);

  const completeSaving = useCallback(
    (success: boolean) => {
      uiActions.setIsSaving(false);
      if (success) {
        uiActions.setShowSaveSuccess(true);
      }
    },
    [uiActions]
  );

  const handleSave = useCallback(async () => {
    await saveBoard();
    return true; // Always return true for compatibility
  }, [saveBoard]);

  return {
    saveBoard,
    publishBoard,
    startSaving,
    completeSaving,
    handleSave,
  };
}
