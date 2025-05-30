'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ROUTES } from '@/src/config/routes';
import { notifications } from '@/lib/notifications';
import { log } from '@/lib/logger';
import { DEFAULT_BINGO_CARD } from '@/types';

// Components
import { BoardHeader } from './BoardHeader';
import { CardManagementTabs } from './CardManagementTabs';
import { BoardSettingsPanel } from './BoardSettingsPanel';
import { BingoGrid } from './BingoGrid';
import { BingoCardEditDialog } from './BingoCardEditDialog';
import { GridPositionSelectDialog } from './GridPositionSelectDialog';

// Hooks
import { useBoardEditState } from './hooks/useBoardEditState';
import { useBingoBoardEdit } from '../../hooks/useBingoBoardEdit';
import {
  useBingoCardsStore,
  useBingoCardsActions,
} from '@/lib/stores/bingo-cards-store';
import { useAuth } from '@/hooks/useAuth';

// Constants and Types
import { UI_MESSAGES } from './constants';
import type { BingoCard, FilterOptions } from '@/types';

interface BingoBoardEditProps {
  boardId: string;
  onSaveSuccess?: () => void;
}

/**
 * Refactored BingoBoardEdit component using compound pattern
 *
 * Key improvements:
 * - Extracted UI state to custom hook
 * - Broken down into focused sub-components
 * - Cleaner separation of concerns
 * - Better type safety and maintainability
 */
export function BingoBoardEdit({
  boardId,
  onSaveSuccess,
}: BingoBoardEditProps) {
  const router = useRouter();
  const { isAuthenticated, loading: isAuthLoading } = useAuth();

  // Custom hooks for state management
  const uiState = useBoardEditState();
  const boardEdit = useBingoBoardEdit(boardId);

  // Store hooks
  const { publicCards, loading: isLoadingPublicCards } = useBingoCardsStore();
  const { initializePublicCards, filterPublicCards, voteCard, updateGridCard } =
    useBingoCardsActions();

  // Initialize board when authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      boardEdit.initializeBoard();
    }
  }, [isAuthLoading, isAuthenticated, boardId, boardEdit]);

  // Navigation handlers
  const handleClose = useCallback(() => {
    router.push(ROUTES.CHALLENGE_HUB);
  }, [router]);

  // Save operation
  const handleSave = useCallback(async () => {
    try {
      uiState.startSaving();
      const success = await boardEdit.handleSave();
      uiState.completeSaving(success);
      if (success) {
        onSaveSuccess?.();
      }
    } catch (error) {
      uiState.completeSaving(false);
      log.error('Failed to save board', error, { component: 'BingoBoardEdit' });
    }
  }, [boardEdit, uiState, onSaveSuccess]);

  // Card selection with validation
  const handleCardSelect = useCallback(
    (card: BingoCard) => {
      const isCardInGrid = boardEdit.gridCards.some(gc => gc.id === card.id);
      if (isCardInGrid) {
        notifications.cardAlreadyInGrid();
        return;
      }
      uiState.handleCardSelect(card);
    },
    [boardEdit.gridCards, uiState]
  );

  // Card editing
  const handleCardEdit = useCallback(
    (card: BingoCard, index: number) => {
      uiState.openCardEditor(card, index);
    },
    [uiState]
  );

  // Position selection for grid placement
  const handlePositionSelect = useCallback(
    (index: number) => {
      uiState.handlePositionSelect(index, boardEdit.placeCardInGrid);
    },
    [uiState, boardEdit]
  );

  // Create new card
  const handleCreateNewCard = useCallback(() => {
    if (!boardEdit.currentBoard) {
      log.error('Cannot create card: Board not initialized', undefined, {
        component: 'BingoBoardEdit',
      });
      return;
    }

    const newCard: BingoCard = {
      id: '',
      title: DEFAULT_BINGO_CARD.title || '',
      difficulty: DEFAULT_BINGO_CARD.difficulty || 'medium',
      game_type: boardEdit.currentBoard.game_type,
      description: DEFAULT_BINGO_CARD.description ?? null,
      tags: DEFAULT_BINGO_CARD.tags ?? null,
      creator_id: DEFAULT_BINGO_CARD.creator_id ?? null,
      created_at: DEFAULT_BINGO_CARD.created_at ?? null,
      updated_at: DEFAULT_BINGO_CARD.updated_at ?? null,
      is_public: DEFAULT_BINGO_CARD.is_public ?? null,
      votes: DEFAULT_BINGO_CARD.votes ?? null,
    };

    uiState.openCardEditor(newCard, -1);
  }, [boardEdit, uiState]);

  // Tab change handler
  const handleTabChange = useCallback(
    async (value: string) => {
      if (value === 'public' && boardEdit.currentBoard) {
        await initializePublicCards(boardEdit.currentBoard.game_type);
      }
    },
    [boardEdit, initializePublicCards]
  );

  // Public card filtering
  const handleFilterPublicCards = useCallback(
    async (filters: FilterOptions) => {
      if (boardEdit.currentBoard) {
        await filterPublicCards(filters, boardEdit.currentBoard.game_type);
      }
    },
    [boardEdit, filterPublicCards]
  );

  const handleClearPublicFilters = useCallback(async () => {
    if (boardEdit.currentBoard) {
      await initializePublicCards(boardEdit.currentBoard.game_type);
    }
  }, [boardEdit, initializePublicCards]);

  // Card voting
  const handleVoteCard = useCallback(
    async (card: BingoCard) => {
      await voteCard(card.id);
      if (boardEdit.currentBoard) {
        await initializePublicCards(boardEdit.currentBoard.game_type);
      }
    },
    [voteCard, boardEdit, initializePublicCards]
  );

  // Grid card removal
  const handleRemoveGridCard = useCallback(
    (index: number) => {
      updateGridCard(index, { ...DEFAULT_BINGO_CARD } as BingoCard);
    },
    [updateGridCard]
  );

  // Card dialog save
  const handleCardDialogSave = useCallback(
    (formData: Partial<BingoCard>, index: number) => {
      if (!uiState.editingCard) return;

      if (!uiState.editingCard.card.id) {
        boardEdit.createNewCard(formData, index);
      } else {
        boardEdit.updateExistingCard(formData, index);
      }
    },
    [uiState.editingCard, boardEdit]
  );

  // Loading and error states
  if (isAuthLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-cyan-400">
          {UI_MESSAGES.AUTH.LOGIN_REQUIRED}
        </h2>
      </div>
    );
  }

  if (boardEdit.isLoadingBoard || boardEdit.isLoadingCards) {
    return <LoadingSpinner />;
  }

  if (boardEdit.error) {
    return <div className="text-red-500">Error: {boardEdit.error}</div>;
  }

  if (!boardEdit.currentBoard || !boardEdit.formData) {
    return null;
  }

  // Check for form errors
  const hasErrors = Object.values(boardEdit.fieldErrors).some(
    error => error !== undefined
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <BoardHeader
        board={boardEdit.currentBoard}
        title={boardEdit.formData.board_title}
        isSaving={uiState.isSaving}
        hasErrors={hasErrors}
        onClose={handleClose}
        onSave={handleSave}
      />

      {/* Error Display */}
      {boardEdit.error && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{boardEdit.error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-wrap justify-center gap-6">
        {/* Sidebar - Card Management */}
        <CardManagementTabs
          privateCards={boardEdit.cards}
          publicCards={publicCards}
          currentBoard={{
            game_type: boardEdit.currentBoard.game_type,
            size: boardEdit.currentBoard.size || 5,
          }}
          isLoadingPrivateCards={boardEdit.isLoadingCards}
          isLoadingPublicCards={isLoadingPublicCards}
          onCardSelect={handleCardSelect}
          onCardEdit={handleCardEdit}
          onCreateNewCard={handleCreateNewCard}
          onTabChange={handleTabChange}
          onFilterPublicCards={handleFilterPublicCards}
          onClearPublicFilters={handleClearPublicFilters}
          onVoteCard={handleVoteCard}
        />

        {/* Main Content - Settings and Grid */}
        <div className="flex-1">
          {/* Board Settings */}
          <BoardSettingsPanel
            formData={boardEdit.formData}
            fieldErrors={boardEdit.fieldErrors}
            onUpdateField={boardEdit.updateFormField}
            onFormDataChange={boardEdit.setFormData}
          />

          {/* Bingo Grid */}
          <div className="mt-4">
            <BingoGrid
              gridCards={boardEdit.gridCards}
              gridSize={boardEdit.gridSize}
              isLoading={boardEdit.isLoadingCards}
              onCardClick={handleCardEdit}
              onRemoveCard={handleRemoveGridCard}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {uiState.editingCard && (
        <BingoCardEditDialog
          card={uiState.editingCard.card}
          index={uiState.editingCard.index}
          isOpen={true}
          onClose={uiState.closeCardEditor}
          onSave={handleCardDialogSave}
        />
      )}

      {uiState.selectedCard && (
        <GridPositionSelectDialog
          isOpen={true}
          onClose={uiState.clearSelectedCard}
          onSelect={handlePositionSelect}
          gridSize={boardEdit.gridSize}
          takenPositions={boardEdit.gridCards
            .map((card, index) => (card.id ? index : -1))
            .filter(index => index !== -1)}
        />
      )}

      {/* Success Message */}
      {uiState.showSaveSuccess && (
        <div className="animate-fade-in fixed bottom-4 right-4 rounded-md border border-green-500/50 bg-green-500/20 px-4 py-2 text-green-400 shadow-lg">
          {UI_MESSAGES.SAVE.SUCCESS}
        </div>
      )}
    </div>
  );
}

// ✅ Ready for review
