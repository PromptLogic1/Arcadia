/**
 * Focused hook for board actions only
 * Part of the refactored useBingoBoardEdit split
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useBoardEditStore, {
  useBoardEditActions,
} from '@/lib/stores/board-edit-store';
import { useAuth } from '@/lib/stores/auth-store';
import {
  useCreateCardMutation,
  useUpdateCardMutation,
} from '@/hooks/queries/useBingoBoardEditQueries';
import { queryKeys } from '@/hooks/queries';
import type { BingoCard } from '@/types';

export function useBoardActions(boardId: string) {
  const queryClient = useQueryClient();
  const uiActions = useBoardEditActions();
  const { authUser } = useAuth();
  const createCardMutation = useCreateCardMutation();
  const updateCardMutation = useUpdateCardMutation();

  // Memoized card selection action
  const selectCard = useCallback(
    (card: BingoCard | null) => {
      uiActions.setSelectedCard(card);
    },
    [uiActions]
  );

  // Memoized drag action
  const setDraggedCard = useCallback(
    (card: BingoCard | null) => {
      uiActions.setDraggedCard(card);
    },
    [uiActions]
  );

  // Memoized toggle actions
  const toggleEditMode = useCallback(() => {
    const store = useBoardEditStore.getState();
    uiActions.setIsEditMode(!store.isEditMode);
  }, [uiActions]);

  const toggleAdvancedSettings = useCallback(() => {
    const store = useBoardEditStore.getState();
    uiActions.setShowAdvancedSettings(!store.showAdvancedSettings);
  }, [uiActions]);

  // Memoized clear actions
  const clearSelectedCard = useCallback(() => {
    uiActions.clearSelectedCard();
  }, [uiActions]);

  const closeCardEditor = useCallback(() => {
    uiActions.closeCardEditor();
  }, [uiActions]);

  return {
    // Selection actions
    selectCard,
    setDraggedCard,
    clearSelectedCard,

    // UI toggle actions
    toggleEditMode,
    toggleAdvancedSettings,

    // Editor actions
    openCardEditor: uiActions.openCardEditor,
    closeCardEditor,

    // Form actions
    updateFormField: uiActions.updateFormField,
    setFormData: uiActions.setFormData,

    // Grid management
    setLocalGridCards: uiActions.setLocalGridCards,
    setLocalPrivateCards: uiActions.setLocalPrivateCards,
    addPrivateCard: uiActions.addPrivateCard,

    // Save state
    setIsSaving: uiActions.setIsSaving,
    setShowSaveSuccess: uiActions.setShowSaveSuccess,
    setAutoSave: uiActions.setAutoSave,

    // Reset
    reset: uiActions.reset,
  };
}

// Separate hook for card CRUD operations
export function useCardOperations(boardId: string) {
  const { authUser } = useAuth();
  const uiActions = useBoardEditActions();
  const createCardMutation = useCreateCardMutation();
  const updateCardMutation = useUpdateCardMutation();

  const createCard = useCallback(
    async (cardData: {
      title: string;
      description?: string;
      tags?: string[];
    }) => {
      if (!authUser) return null;

      try {
        const result = await createCardMutation.mutateAsync({
          title: cardData.title,
          description: cardData.description || '',
          tags: cardData.tags || [],
          creator_id: authUser.id,
          is_public: false,
          game_type: 'All Games',
          difficulty: 'medium',
        });

        if (result.success && result.data) {
          return result.data;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    [authUser, createCardMutation]
  );

  const updateCard = useCallback(
    async (cardId: string, updates: Partial<BingoCard>) => {
      try {
        const result = await updateCardMutation.mutateAsync({
          cardId,
          updates,
        });

        return result.success;
      } catch (error) {
        return false;
      }
    },
    [updateCardMutation]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      // This will be handled by the UI store
      const store = useBoardEditStore.getState();
      const currentPrivateCards = store.localPrivateCards || [];
      uiActions.setLocalPrivateCards(
        currentPrivateCards.filter((card: BingoCard) => card.id !== cardId)
      );
    },
    [uiActions]
  );

  return {
    createCard,
    updateCard,
    deleteCard,
  };
}
