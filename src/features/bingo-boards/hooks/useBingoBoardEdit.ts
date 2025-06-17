/**
 * Bingo Board Edit Hook
 *
 * Comprehensive hook for board editing functionality.
 * Handles board state, card management, and real-time updates.
 */

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@/lib/notifications';
import useBoardEditStore, {
  useBoardEditState,
  useBoardEditActions,
} from '@/lib/stores/board-edit-store';
import {
  useBoardEditDataQuery,
  useBoardInitializationQuery,
  useSaveCardsMutation,
  useUpdateBoardMutation,
  useCreateCardMutation,
  useUpdateCardMutation,
} from '@/hooks/queries/useBingoBoardEditQueries';
import { queryKeys } from '@/hooks/queries';
import type { BoardEditData } from '@/services/bingo-board-edit.service';
import { useAuth } from '@/lib/stores/auth-store';
import type { BingoCard, GameCategory, Difficulty } from '@/types';
import type { BingoBoardDomain, BoardCell } from '@/types/domains/bingo';

// Type-safe default values
const DEFAULT_GAME_CATEGORY: GameCategory = 'All Games';
const DEFAULT_DIFFICULTY: Difficulty = 'medium';

export interface BoardEditState {
  // Board data
  board: BingoBoardDomain | null;
  isLoading: boolean;
  error: string | null;

  // Cards
  gridCards: BingoCard[];
  privateCards: BingoCard[];
  publicCards: BingoCard[];

  // UI State
  selectedCard: BingoCard | null;
  draggedCard: BingoCard | null;
  isEditMode: boolean;
  isSaving: boolean;
  hasChanges: boolean;

  // Settings
  showAdvancedSettings: boolean;
  autoSave: boolean;
}

export interface BoardEditActions {
  // Card selection
  selectCard: (card: BingoCard | null) => void;
  setDraggedCard: (card: BingoCard | null) => void;

  // Grid operations
  moveCardToGrid: (card: BingoCard, position: number) => void;
  removeCardFromGrid: (position: number) => void;
  swapGridCards: (position1: number, position2: number) => void;

  // Card management
  createCard: (cardData: {
    title: string;
    description?: string;
    tags?: string[];
  }) => Promise<BingoCard | null>;
  updateCard: (cardId: string, updates: Partial<BingoCard>) => Promise<void>;
  deleteCard: (cardId: string) => void;

  // Board operations
  saveBoard: () => Promise<void>;
  publishBoard: () => Promise<void>;
  toggleEditMode: () => void;

  // Settings
  toggleAdvancedSettings: () => void;
  setAutoSave: (enabled: boolean) => void;
}

export function useBingoBoardEdit(boardId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const mountedRef = useRef(true);

  // Store state - using selector hooks
  const uiState = useBoardEditState();
  const uiActions = useBoardEditActions();

  // Queries
  const {
    data: boardData,
    isLoading: loadingBoard,
    error: boardError,
  } = useBoardEditDataQuery(boardId);

  // Board data from query - no local state duplication
  const currentBoard =
    boardData?.success && boardData.data ? boardData.data.board : null;

  const {
    data: initData,
    isLoading: loadingInit,
    isError: initError,
  } = useBoardInitializationQuery(boardId, !!boardId); // Run in parallel with board data query

  // Mutations
  const saveCardsMutation = useSaveCardsMutation();
  const updateBoardMutation = useUpdateBoardMutation();
  const createCardMutation = useCreateCardMutation();
  const updateCardMutation = useUpdateCardMutation();

  // Authorization check
  useEffect(() => {
    mountedRef.current = true;

    // Check authorization when board data loads
    if (currentBoard && currentBoard.id === boardId) {
      if (currentBoard.creator_id && authUser?.id !== currentBoard.creator_id) {
        notifications.error('You are not authorized to edit this board');
        router.push('/challenge-hub');
        return;
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [currentBoard, boardId, authUser, router]);

  // Initialize grid and private cards
  useEffect(() => {
    // Only initialize if we have both board data and init data for the same board
    if (
      initData?.success &&
      initData.board &&
      initData.gridCards &&
      currentBoard &&
      initData.board.id === currentBoard.id &&
      initData.board.id === boardId
    ) {
      // Initialize local state with fetched data
      uiActions.setLocalGridCards(initData.gridCards);
      uiActions.setLocalPrivateCards(initData.privateCards || []);
    }
  }, [initData, currentBoard, boardId, uiActions]);

  // Derived state
  const isLoading = loadingBoard || loadingInit;
  const error =
    boardError || initError
      ? 'Failed to load board data'
      : boardData?.error || null;

  const hasChanges = useMemo(() => {
    if (!currentBoard || !uiState.localGridCards) return false;

    // Compare current grid state with saved state
    // board_state is now properly typed as BoardCell[]
    const originalCells = currentBoard.board_state;
    const currentCells = uiState.localGridCards;

    if (originalCells.length !== currentCells.length) return true;

    return originalCells.some((original: BoardCell, index: number) => {
      const current = currentCells[index];
      return (
        original.text !== current?.title ||
        original.cell_id !==
          (current?.id?.startsWith('temp-') ? null : current?.id)
      );
    });
  }, [currentBoard, uiState.localGridCards]);

  // Memoized individual actions
  const selectCard = useCallback(
    (card: BingoCard | null) => {
      uiActions.setSelectedCard(card);
    },
    [uiActions]
  );

  const setDraggedCard = useCallback(
    (card: BingoCard | null) => {
      uiActions.setDraggedCard(card);
    },
    [uiActions]
  );

  const moveCardToGrid = useCallback(
    (card: BingoCard, position: number) => {
      const updatedGrid = [...uiState.localGridCards];

      // Handle existing card at position
      const existingCard = updatedGrid[position];
      if (existingCard?.title) {
        // Move existing card back to private collection
        if (!existingCard.id.startsWith('temp-')) {
          uiActions.setLocalPrivateCards([
            ...uiState.localPrivateCards,
            existingCard,
          ]);
        }
      }

      // Place new card in grid
      updatedGrid[position] = card;
      uiActions.setLocalGridCards(updatedGrid);

      // Remove from private cards if it was there
      if (
        uiState.localPrivateCards.some((pc: BingoCard) => pc.id === card.id)
      ) {
        uiActions.setLocalPrivateCards(
          uiState.localPrivateCards.filter((pc: BingoCard) => pc.id !== card.id)
        );
      }
    },
    [uiState.localGridCards, uiState.localPrivateCards, uiActions]
  );

  const saveBoard = useCallback(async () => {
    if (!currentBoard || !authUser || !mountedRef.current) return;

    const currentUiState = useBoardEditStore.getState();

    try {
      uiActions.setIsSaving(true);

      // First, save any temporary cards
      const tempCards = [
        ...currentUiState.localGridCards,
        ...currentUiState.localPrivateCards,
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
        const updatedGridCards = currentUiState.localGridCards.map(card => {
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
        const updatedPrivateCards = currentUiState.localPrivateCards.map(
          card => {
            if (card.id.startsWith('temp-')) {
              const saved = savedCards.find(
                (sc: BingoCard) =>
                  sc.title === card.title && sc.game_type === card.game_type
              );
              return saved || card;
            }
            return card;
          }
        );
        uiActions.setLocalPrivateCards(updatedPrivateCards);
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

      if (!mountedRef.current) return;

      if (updateResult.success && updateResult.data) {
        // Invalidate board data to refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.boardEdit.data(boardId),
        });
        notifications.success('Board saved successfully!');
      }
    } catch (error) {
      if (mountedRef.current) {
        notifications.error(
          error instanceof Error ? error.message : 'Failed to save board'
        );
      }
    } finally {
      if (mountedRef.current) {
        uiActions.setIsSaving(false);
      }
    }
  }, [
    currentBoard,
    authUser,
    boardId,
    queryClient,
    uiActions,
    saveCardsMutation,
    updateBoardMutation,
  ]);

  // Actions
  const actions: BoardEditActions = useMemo(
    () => ({
      selectCard,
      setDraggedCard,
      moveCardToGrid,

      removeCardFromGrid: (position: number) => {
        const updatedGrid = [...uiState.localGridCards];
        const removedCard = updatedGrid[position];

        if (removedCard?.title) {
          // Create empty card for this position
          updatedGrid[position] = {
            id: `empty-${position}`,
            title: '',
            description: null,
            game_type: currentBoard?.game_type || DEFAULT_GAME_CATEGORY,
            difficulty: currentBoard?.difficulty || DEFAULT_DIFFICULTY,
            tags: [],
            creator_id: authUser?.id || '',
            is_public: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          };
          uiActions.setLocalGridCards(updatedGrid);

          // Add back to private cards if not public (temp cards are private)
          if (
            removedCard.id.startsWith('temp-') ||
            removedCard.creator_id === authUser?.id
          ) {
            uiActions.setLocalPrivateCards([
              ...uiState.localPrivateCards,
              removedCard,
            ]);
          }
        }
      },

      swapGridCards: (position1: number, position2: number) => {
        const updatedGrid = [...uiState.localGridCards];
        const card1 = updatedGrid[position1];
        const card2 = updatedGrid[position2];
        if (card1 !== undefined && card2 !== undefined) {
          updatedGrid[position1] = card2;
          updatedGrid[position2] = card1;
          uiActions.setLocalGridCards(updatedGrid);
        }
      },

      createCard: async (cardData: {
        title: string;
        description?: string;
        tags?: string[];
      }) => {
        if (!authUser || !currentBoard) return null;

        const newCard: BingoCard = {
          id: `temp-${Date.now()}`,
          title: cardData.title,
          description: cardData.description || null,
          game_type: currentBoard.game_type,
          difficulty: currentBoard.difficulty,
          tags: cardData.tags || [],
          creator_id: authUser.id,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          votes: 0,
        };

        // Add to local state immediately
        uiActions.setLocalPrivateCards([...uiState.localPrivateCards, newCard]);

        // Save to database
        try {
          const result = await createCardMutation.mutateAsync({
            title: cardData.title,
            description: cardData.description,
            game_type: currentBoard.game_type,
            difficulty: currentBoard.difficulty,
            tags: cardData.tags,
            creator_id: authUser.id,
            is_public: false,
          });

          if (!mountedRef.current) return null;

          if (result.success && result.data) {
            const savedCard = result.data;
            // Update local state with the saved card
            uiActions.setLocalPrivateCards(
              uiState.localPrivateCards.map((card: BingoCard) =>
                card.id === newCard.id ? savedCard : card
              )
            );
            return savedCard;
          }
          return null;
        } catch {
          // Remove temporary card on error
          if (mountedRef.current) {
            uiActions.setLocalPrivateCards(
              uiState.localPrivateCards.filter(
                (card: BingoCard) => card.id !== newCard.id
              )
            );
          }
          return null;
        }
      },

      updateCard: async (cardId: string, updates: Partial<BingoCard>) => {
        try {
          const result = await updateCardMutation.mutateAsync({
            cardId,
            updates,
          });

          if (mountedRef.current && result.success && result.data) {
            // Update in grid cards
            uiActions.setLocalGridCards(
              uiState.localGridCards.map((card: BingoCard) =>
                card.id === cardId ? { ...card, ...result.data } : card
              )
            );

            // Update in private cards
            uiActions.setLocalPrivateCards(
              uiState.localPrivateCards.map((card: BingoCard) =>
                card.id === cardId ? { ...card, ...result.data } : card
              )
            );
          }
        } catch {
          // Error is handled by mutation
        }
      },

      deleteCard: (cardId: string) => {
        // Remove from private cards
        uiActions.setLocalPrivateCards(
          uiState.localPrivateCards.filter(
            (card: BingoCard) => card.id !== cardId
          )
        );

        // Remove from grid and replace with empty card
        const gridIndex = uiState.localGridCards.findIndex(
          (card: BingoCard) => card.id === cardId
        );
        if (gridIndex !== -1) {
          // Inline the removeCardFromGrid logic to avoid circular dependency
          const updatedGrid = [...uiState.localGridCards];
          const removedCard = updatedGrid[gridIndex];

          if (removedCard?.title) {
            // Create empty card for this position
            updatedGrid[gridIndex] = {
              id: `empty-${gridIndex}`,
              title: '',
              description: null,
              game_type: currentBoard?.game_type || DEFAULT_GAME_CATEGORY,
              difficulty: currentBoard?.difficulty || DEFAULT_DIFFICULTY,
              tags: [],
              creator_id: authUser?.id || '',
              is_public: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              votes: 0,
            };
            uiActions.setLocalGridCards(updatedGrid);

            // Add back to private cards if not public (temp cards are private)
            if (
              removedCard.id.startsWith('temp-') ||
              removedCard.creator_id === authUser?.id
            ) {
              uiActions.setLocalPrivateCards([
                ...uiState.localPrivateCards,
                removedCard,
              ]);
            }
          }
        }
      },

      saveBoard,

      publishBoard: async () => {
        if (!currentBoard) return;

        try {
          const updateResult = await updateBoardMutation.mutateAsync({
            boardId: currentBoard.id,
            updates: { is_public: true },
            currentVersion: currentBoard.version || 0,
          });

          if (updateResult.success && updateResult.data) {
            // Invalidate board data to refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.boardEdit.data(boardId),
            });
            notifications.success('Board published successfully!');
          }
        } catch {
          // Error handled by mutation
        }
      },

      toggleEditMode: () => {
        uiActions.setIsEditMode(!uiState.isEditMode);
      },

      toggleAdvancedSettings: () => {
        uiActions.setShowAdvancedSettings(!uiState.showAdvancedSettings);
      },

      setAutoSave: (enabled: boolean) => {
        uiActions.setAutoSave(enabled);
      },
    }),
    [
      selectCard,
      setDraggedCard,
      moveCardToGrid,
      saveBoard,
      uiState,
      uiActions,
      currentBoard,
      authUser,
      boardId,
      queryClient,
      createCardMutation,
      updateCardMutation,
      updateBoardMutation,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      uiActions.reset();
    };
  }, [boardId, uiActions]);

  // Auto-save functionality
  useEffect(() => {
    if (!uiState.autoSave || !hasChanges || uiState.isSaving) return;

    const saveTimeout = setTimeout(() => {
      if (mountedRef.current) {
        actions.saveBoard();
      }
    }, 5000); // 5 second delay

    return () => clearTimeout(saveTimeout);
  }, [uiState.autoSave, hasChanges, uiState.isSaving, actions]);

  // Additional methods expected by component
  const initializeBoard = useCallback(() => {
    // Board initialization is handled by the useEffect hooks
    // This is just a no-op for compatibility
  }, []);

  const handleSave = useCallback(async () => {
    await actions.saveBoard();
    return true; // Always return true, error handling is in saveBoard
  }, [actions]);

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

  const handlePositionSelect = useCallback(
    (index: number) => {
      if (uiState.selectedCard) {
        actions.moveCardToGrid(uiState.selectedCard, index);
        uiActions.clearSelectedCard();
      }
    },
    [uiState.selectedCard, actions, uiActions]
  );

  const placeCardInGrid = useCallback(
    (card: BingoCard, index: number) => {
      actions.moveCardToGrid(card, index);
    },
    [actions]
  );

  const addPrivateCard = useCallback(
    (card: BingoCard) => {
      uiActions.addPrivateCard(card);
    },
    [uiActions]
  );

  return {
    // State
    board: currentBoard,
    isLoading,
    error,
    isLoadingBoard: loadingBoard,
    isLoadingCards: loadingInit,
    gridCards: uiState.localGridCards,
    privateCards: uiState.localPrivateCards,
    localGridCards: uiState.localGridCards,
    localPrivateCards: uiState.localPrivateCards,
    publicCards: [], // Public cards come from query, not from store
    selectedCard: uiState.selectedCard,
    draggedCard: uiState.draggedCard,
    isEditMode: uiState.isEditMode,
    isSaving: uiState.isSaving,
    hasChanges,
    showAdvancedSettings: uiState.showAdvancedSettings,
    autoSave: uiState.autoSave,
    editingCard: uiState.editingCard,
    showSaveSuccess: uiState.showSaveSuccess,
    formData: uiState.formData,
    fieldErrors: uiState.fieldErrors,

    // Actions
    ...actions,

    // Additional actions for component compatibility
    initializeBoard,
    handleSave,
    startSaving,
    completeSaving,
    handleCardSelect: uiActions.handleCardSelect,
    openCardEditor: uiActions.openCardEditor,
    closeCardEditor: uiActions.closeCardEditor,
    handlePositionSelect,
    clearSelectedCard: uiActions.clearSelectedCard,
    setDraggedCard: uiActions.setDraggedCard,
    setDraggedFromIndex: uiActions.setDraggedFromIndex,
    placeCardInGrid,
    addPrivateCard,
    setLocalGridCards: uiActions.setLocalGridCards,
    updateFormField: uiActions.updateFormField,
    setFormData: uiActions.setFormData,
  };
}
