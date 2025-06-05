/**
 * Bingo Board Edit Hook
 *
 * Combines TanStack Query + Zustand + Service Layer pattern.
 * This replaces the legacy useBoardEditState hook with the modern architecture.
 *
 * - TanStack Query: Server state (board data, cards)
 * - Zustand Store: UI state (modals, forms, loading states)
 * - Service Layer: Pure API functions
 */

import { useCallback, useEffect, useRef } from 'react';
import type { BingoCard, BingoBoard, Difficulty } from '@/types';
import type {
  CardInsertData,
  BoardEditData,
} from '../../../services/bingo-board-edit.service';
import { useBoardEditOperations } from '@/hooks/queries/useBingoBoardEditQueries';
import {
  useBoardEditState,
  useBoardEditActions,
  type BoardEditFormData,
} from '@/lib/stores/board-edit-store';
import { useAuth } from '@/lib/stores/auth-store';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

export interface UseBingoBoardEditReturn {
  // Server state (from TanStack Query)
  board: BingoBoard | null;
  cards: BingoCard[];
  isLoadingBoard: boolean;
  isLoadingCards: boolean;
  isSaving: boolean;
  error: string | null;

  // UI state (from Zustand store)
  editingCard: { card: BingoCard; index: number } | null;
  selectedCard: BingoCard | null;
  showPositionSelectDialog: boolean;
  showCardEditDialog: boolean;
  showSaveSuccess: boolean;
  formData: BoardEditFormData | null;
  fieldErrors: Record<string, string>;
  localGridCards: BingoCard[];
  localPrivateCards: BingoCard[];
  draggedCard: BingoCard | null;
  draggedFromIndex: number | null;

  // Actions - Modal management
  openCardEditor: (card: BingoCard, index: number) => void;
  closeCardEditor: () => void;
  setSelectedCard: (card: BingoCard | null) => void;
  clearSelectedCard: () => void;
  handleCardSelect: (card: BingoCard) => void;
  setShowPositionSelectDialog: (show: boolean) => void;

  // Actions - Form management
  setFormData: (data: BoardEditFormData | null) => void;
  updateFormField: (
    field: keyof BoardEditFormData,
    value: string | string[] | boolean | Difficulty
  ) => void;
  setFieldErrors: (errors: Record<string, string>) => void;
  clearFieldError: (field: string) => void;

  // Actions - Grid management
  setLocalGridCards: (cards: BingoCard[]) => void;
  setLocalPrivateCards: (cards: BingoCard[]) => void;
  updateGridCard: (index: number, card: BingoCard) => void;
  addPrivateCard: (card: BingoCard) => void;
  removePrivateCard: (cardId: string) => void;
  placeCardInGrid: (card: BingoCard, index: number) => void;

  // Actions - Drag state
  setDraggedCard: (card: BingoCard | null) => void;
  setDraggedFromIndex: (index: number | null) => void;

  // Actions - Position selection
  handlePositionSelect: (index: number) => void;

  // Actions - Save operations
  startSaving: () => void;
  completeSaving: (success: boolean) => void;
  handleSave: () => Promise<boolean>;

  // Actions - Board operations
  initializeBoard: () => Promise<void>;
  createCard: (cardData: Partial<BingoCard>) => Promise<BingoCard | null>;
  updateCard: (
    cardId: string,
    updates: Partial<BingoCard>
  ) => Promise<BingoCard | null>;

  // Validation
  validateField: (
    field: string,
    value: string | string[] | boolean
  ) => string | null;

  // Utility
  reset: () => void;
}

/**
 * Modern board edit hook combining TanStack Query + Zustand
 */
export function useBingoBoardEdit(boardId: string): UseBingoBoardEditReturn {
  // TanStack Query for server state
  const {
    board,
    cards,
    gridCards: serverGridCards,
    privateCards: serverPrivateCards,
    isLoading,
    error: queryError,
    saveCards,
    updateBoard,
    createCard: createCardMutation,
    updateCard: updateCardMutation,
    isMutating,
    refetch,
  } = useBoardEditOperations(boardId);

  // Zustand store for UI state
  const uiState = useBoardEditState();
  const uiActions = useBoardEditActions();

  // Auth
  const { authUser } = useAuth();
  
  // Refs to prevent stale closures
  const uiStateRef = useRef(uiState);
  const boardRef = useRef(board);
  const authUserRef = useRef(authUser);
  
  // Update refs when dependencies change
  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);
  
  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  
  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  // Derived state
  const isLoadingBoard = isLoading;
  const isLoadingCards = isLoading;
  const isSaving = uiState.isSaving || isMutating;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'An error occurred'
    : null;

  // Initialize form data when board loads
  useEffect(() => {
    if (board && !uiState.formData) {
      const formData: BoardEditFormData = {
        board_title: board.title,
        board_description: board.description || '',
        board_tags: [], // Tags not in current database schema
        board_difficulty: board.difficulty,
        is_public: board.is_public || false,
      };
      uiActions.setFormData(formData);
    }
  }, [board, uiState.formData, uiActions]);

  // Initialize local grid and private cards from server data
  useEffect(() => {
    if (serverGridCards && serverGridCards.length > 0) {
      uiActions.setLocalGridCards(serverGridCards);
    }
    if (serverPrivateCards && serverPrivateCards.length > 0) {
      uiActions.setLocalPrivateCards(serverPrivateCards);
    }
  }, [serverGridCards, serverPrivateCards, uiActions]);

  // Validation
  const validateField = useCallback(
    (field: string, value: string | string[] | boolean): string | null => {
      switch (field) {
        case 'board_title':
          if (
            typeof value === 'string' &&
            (value.length < 3 || value.length > 50)
          ) {
            return 'Title must be between 3 and 50 characters';
          }
          break;
        case 'board_description':
          if (typeof value === 'string' && value.length > 255) {
            return 'Description cannot exceed 255 characters';
          }
          break;
        case 'board_tags':
          if (Array.isArray(value) && value.length > 5) {
            return 'Maximum of 5 tags allowed';
          }
          break;
        case 'title':
          if (
            typeof value === 'string' &&
            (value.length === 0 || value.length > 50)
          ) {
            return 'Content must be between 1 and 50 characters';
          }
          break;
        case 'description':
          if (typeof value === 'string' && value.length > 255) {
            return 'Explanation cannot exceed 255 characters';
          }
          break;
        case 'tags':
          if (Array.isArray(value) && value.length > 5) {
            return 'Maximum of 5 tags allowed';
          }
          break;
      }
      return null;
    },
    []
  );

  // Enhanced form field update with validation
  const updateFormField = useCallback(
    (
      field: keyof BoardEditFormData,
      value: string | string[] | boolean | Difficulty
    ) => {
      const error = validateField(field, value);

      if (error) {
        uiActions.setFieldErrors({ ...uiState.fieldErrors, [field]: error });
      } else {
        uiActions.clearFieldError(field);
      }

      uiActions.updateFormField(field, value);
    },
    [validateField, uiActions, uiState.fieldErrors]
  );

  // Position selection handler
  const handlePositionSelect = useCallback(
    (index: number) => {
      const currentSelectedCard = uiStateRef.current.selectedCard;
      if (currentSelectedCard) {
        uiActions.updateGridCard(index, currentSelectedCard);
        uiActions.setSelectedCard(null);
        uiActions.setShowPositionSelectDialog(false);

        // Defer DOM manipulation to avoid React render conflicts
        setTimeout(() => {
          const cardElement = document.querySelector(
            `[data-card-id="${currentSelectedCard.id}"]`
          );
          if (cardElement) {
            const trigger = cardElement.querySelector('[data-state="open"]');
            if (trigger instanceof HTMLElement) {
              trigger.click();
            }
          }
        }, 0);
      }
    },
    [uiActions] // Removed uiState.selectedCard dependency
  );

  // Enhanced card selection with validation
  const handleCardSelect = useCallback(
    (card: BingoCard) => {
      // Check if card is already in grid
      const isCardInGrid = uiState.localGridCards.some(
        gc => gc.id === card.id && gc.id !== ''
      );

      if (isCardInGrid) {
        notifications.error('This card is already in the grid!');
        return;
      }

      uiActions.handleCardSelect(card);
      uiActions.setShowPositionSelectDialog(true);
    },
    [uiState.localGridCards, uiActions]
  );

  // Place card in grid
  const placeCardInGrid = useCallback(
    (card: BingoCard, index: number) => {
      uiActions.updateGridCard(index, card);

      logger.debug('Placed card in grid', {
        metadata: { hook: 'useBingoBoardEditModern', cardId: card.id, index },
      });
    },
    [uiActions]
  );

  // Save operation (fixed stale closures)
  const handleSave = useCallback(async (): Promise<boolean> => {
    const currentBoard = boardRef.current;
    const currentUiState = uiStateRef.current;
    const currentAuthUser = authUserRef.current;
    
    if (!currentBoard || !currentUiState.formData || !currentAuthUser) {
      logger.error('Cannot save: missing required data', undefined, {
        metadata: {
          hook: 'useBingoBoardEditModern',
          hasBoard: !!currentBoard,
          hasFormData: !!currentUiState.formData,
          hasUser: !!currentAuthUser,
        },
      });
      return false;
    }

    try {
      uiActions.setIsSaving(true);

      // Save any new cards first
      const cardsToSave = [
        ...currentUiState.localPrivateCards.filter(card =>
          card.id.startsWith('temp-')
        ),
        ...currentUiState.localGridCards.filter(
          card => card.id.startsWith('temp-') && card.title.trim() !== ''
        ),
      ];

      // Remove duplicates
      const uniqueCardsToSave = cardsToSave.filter(
        (card, index, self) =>
          index ===
          self.findIndex(
            c => c.title === card.title && c.game_type === card.game_type
          )
      );

      if (uniqueCardsToSave.length > 0) {
        const cardInsertData: CardInsertData[] = uniqueCardsToSave
          .filter(card => card.title.trim())
          .map(card => ({
            title: card.title,
            description: card.description || null,
            game_type: card.game_type,
            difficulty: card.difficulty,
            tags: card.tags || [],
            creator_id: currentAuthUser.id,
            is_public: card.is_public || false,
          }));

        if (cardInsertData.length > 0) {
          const saveResult = await saveCards(cardInsertData);

          if (saveResult.error) {
            throw new Error(saveResult.error);
          }

          // Update local state with saved cards
          const savedCards = saveResult.savedCards;

          // Update grid cards with new IDs
          const updatedGridCards = currentUiState.localGridCards.map(card => {
            if (card.id?.startsWith('temp-')) {
              const savedCard = savedCards.find(
                sc => sc.title === card.title && sc.game_type === card.game_type
              );
              return savedCard || card;
            }
            return card;
          });
          uiActions.setLocalGridCards(updatedGridCards);

          // Update private cards with new IDs
          const updatedPrivateCards = currentUiState.localPrivateCards.map(card => {
            if (card.id.startsWith('temp-')) {
              const saved = savedCards.find(
                sc => sc.title === card.title && sc.game_type === card.game_type
              );
              return saved || card;
            }
            return card;
          });
          uiActions.setLocalPrivateCards(updatedPrivateCards);
        }
      }

      // Convert grid cards to board cells for board_state
      const boardCells = currentUiState.localGridCards.map(card => ({
        cell_id: card.id.startsWith('temp-') ? null : card.id,
        text: card.title || null,
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: false,
        version: (currentBoard.version || 0) + 1,
        last_updated: Date.now(),
        last_modified_by: currentAuthUser.id,
      }));

      // Update the board
      const boardData: BoardEditData = {
        title: currentUiState.formData.board_title,
        description: currentUiState.formData.board_description || null,
        difficulty: currentUiState.formData.board_difficulty,
        is_public: currentUiState.formData.is_public,
        board_state: boardCells,
      };

      const updateResult = await updateBoard(boardData, currentBoard.version || 0);

      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      uiActions.setShowSaveSuccess(true);
      notifications.success('Board saved successfully!');

      logger.info('Board saved successfully', {
        metadata: { hook: 'useBingoBoardEditModern', boardId: currentBoard.id },
      });

      return true;
    } catch (error) {
      logger.error('Failed to save board changes', error as Error, {
        metadata: { hook: 'useBingoBoardEditModern', boardId },
      });

      notifications.error('Failed to save board', {
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or contact support.',
      });

      return false;
    } finally {
      uiActions.setIsSaving(false);
    }
  }, [
    saveCards,
    updateBoard,
    uiActions,
    boardId,
  ]); // Removed all state dependencies, using refs instead

  // Initialize board (refresh data)
  const initializeBoard = useCallback(async () => {
    try {
      await refetch();
      logger.info('Board data refreshed', {
        metadata: { hook: 'useBingoBoardEditModern', boardId },
      });
    } catch (error) {
      logger.error('Failed to refresh board data', error as Error, {
        metadata: { hook: 'useBingoBoardEditModern', boardId },
      });
      notifications.error('Failed to refresh board data', {
        description: 'Please try again or contact support.',
      });
    }
  }, [refetch, boardId]);

  // Create card wrapper
  const createCard = useCallback(
    async (cardData: Partial<BingoCard>): Promise<BingoCard | null> => {
      if (!board || !authUser) return null;

      try {
        const insertData: CardInsertData = {
          title: cardData.title || '',
          description: cardData.description || null,
          game_type: board.game_type,
          difficulty: cardData.difficulty || board.difficulty,
          tags: cardData.tags || [],
          creator_id: authUser.id,
          is_public: cardData.is_public || false,
        };

        const result = await createCardMutation(insertData);

        if (result.error) {
          throw new Error(result.error);
        }

        return result.card;
      } catch (error) {
        logger.error('Failed to create card', error as Error, {
          metadata: { hook: 'useBingoBoardEditModern', cardData },
        });
        notifications.error('Failed to create card');
        return null;
      }
    },
    [board, authUser, createCardMutation]
  );

  // Update card wrapper
  const updateCard = useCallback(
    async (
      cardId: string,
      updates: Partial<BingoCard>
    ): Promise<BingoCard | null> => {
      try {
        const result = await updateCardMutation(cardId, updates);

        if (result.error) {
          throw new Error(result.error);
        }

        return result.card;
      } catch (error) {
        logger.error('Failed to update card', error as Error, {
          metadata: { hook: 'useBingoBoardEditModern', cardId, updates },
        });
        notifications.error('Failed to update card');
        return null;
      }
    },
    [updateCardMutation]
  );

  // Start saving wrapper
  const startSaving = useCallback(() => {
    uiActions.setIsSaving(true);
  }, [uiActions]);

  // Complete saving wrapper
  const completeSaving = useCallback(
    (success: boolean) => {
      uiActions.setIsSaving(false);
      if (success) {
        uiActions.setShowSaveSuccess(true);
      }
    },
    [uiActions]
  );

  return {
    // Server state
    board: board || null,
    cards,
    isLoadingBoard,
    isLoadingCards,
    isSaving,
    error,

    // UI state
    editingCard: uiState.editingCard,
    selectedCard: uiState.selectedCard,
    showPositionSelectDialog: uiState.showPositionSelectDialog,
    showCardEditDialog: uiState.showCardEditDialog,
    showSaveSuccess: uiState.showSaveSuccess,
    formData: uiState.formData,
    fieldErrors: uiState.fieldErrors,
    localGridCards: uiState.localGridCards,
    localPrivateCards: uiState.localPrivateCards,
    draggedCard: uiState.draggedCard,
    draggedFromIndex: uiState.draggedFromIndex,

    // Modal management
    openCardEditor: uiActions.openCardEditor,
    closeCardEditor: uiActions.closeCardEditor,
    setSelectedCard: uiActions.setSelectedCard,
    clearSelectedCard: uiActions.clearSelectedCard,
    handleCardSelect,
    setShowPositionSelectDialog: uiActions.setShowPositionSelectDialog,

    // Form management
    setFormData: uiActions.setFormData,
    updateFormField,
    setFieldErrors: uiActions.setFieldErrors,
    clearFieldError: uiActions.clearFieldError,

    // Grid management
    setLocalGridCards: uiActions.setLocalGridCards,
    setLocalPrivateCards: uiActions.setLocalPrivateCards,
    updateGridCard: uiActions.updateGridCard,
    addPrivateCard: uiActions.addPrivateCard,
    removePrivateCard: uiActions.removePrivateCard,
    placeCardInGrid,

    // Drag state
    setDraggedCard: uiActions.setDraggedCard,
    setDraggedFromIndex: uiActions.setDraggedFromIndex,

    // Position selection
    handlePositionSelect,

    // Save operations
    startSaving,
    completeSaving,
    handleSave,

    // Board operations
    initializeBoard,
    createCard,
    updateCard,

    // Validation
    validateField,

    // Utility
    reset: uiActions.reset,
  };
}
