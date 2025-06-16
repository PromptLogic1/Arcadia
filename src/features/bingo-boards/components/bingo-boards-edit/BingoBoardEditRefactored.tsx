'use client';

import React, { useEffect, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ROUTES } from '@/src/config/routes';
import { notifications } from '@/lib/notifications';
import { log } from '@/lib/logger';
import { createEmptyBingoCard } from '@/src/types';
import { toError } from '@/lib/error-guards';

// Components
import { BoardHeader } from './BoardHeader';
import { CardManagementTabs } from './CardManagementTabs';
import { BoardSettingsPanel } from './BoardSettingsPanel';
import { BingoGrid } from './BingoGrid';
import { TrashDropZone } from './TrashDropZone';

// Lazy load heavy dialog components
const BingoCardEditDialog = lazy(() =>
  import('./BingoCardEditDialog').then(module => ({
    default: module.BingoCardEditDialog,
  }))
);
const GridPositionSelectDialog = lazy(() =>
  import('./GridPositionSelectDialog').then(module => ({
    default: module.GridPositionSelectDialog,
  }))
);

// Refactored focused hooks
import { useBoardData } from '../../hooks/useBoardData';
import { useBoardUIState } from '../../hooks/useBoardUIState';
import { useBoardActions } from '../../hooks/useBoardActions';
import { useBoardSaveActions } from '../../hooks/useBoardSaveActions';
import { useBoardGridOperations } from '../../hooks/useBoardGridOperations';
import { useCardOperations } from '../../hooks/useBoardActions';

import {
  useBingoCardsState,
  useBingoCardsActions,
} from '@/lib/stores/bingo-cards-store';
import { useAuth } from '@/lib/stores/auth-store';
import { usePublicCardsQuery, useVoteCardMutation } from '@/hooks/queries';

// Constants and Types
import { UI_MESSAGES } from './constants';
import type { BingoCard } from '@/types';

interface BingoBoardEditProps {
  boardId: string;
  onSaveSuccess?: () => void;
}

/**
 * Refactored BingoBoardEdit component using focused hooks
 *
 * Key improvements:
 * - Uses focused hooks instead of massive useBingoBoardEdit
 * - Better performance with reduced re-renders
 * - Cleaner separation of concerns
 * - Maintains backward compatibility
 */
const BingoBoardEditRefactoredComponent = ({
  boardId,
  onSaveSuccess,
}: BingoBoardEditProps) => {
  const router = useRouter();
  const { authUser } = useAuth();

  // Focused hooks for specific data
  const {
    board,
    isLoading: isLoadingBoard,
    error: boardError,
  } = useBoardData(boardId);
  const {
    selectedCard,
    editingCard,
    showSaveSuccess,
    isSaving,
    formData,
    fieldErrors,
  } = useBoardUIState();
  const uiActions = useBoardActions(boardId);
  const saveActions = useBoardSaveActions(boardId);
  const {
    gridCards,
    privateCards,
    moveCardToGrid,
    removeCardFromGrid,
  } = useBoardGridOperations(boardId);
  const cardOperations = useCardOperations(boardId);

  // Drag and drop state
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [draggedCard, setDraggedCard] = React.useState<BingoCard | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = React.useState<number | null>(
    null
  );

  // Drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Public cards state
  const publicCardsState = useBingoCardsState();
  const publicCardsActions = useBingoCardsActions();
  const voteCardMutation = useVoteCardMutation();

  // Public cards query - transform filters to match expected type
  const publicCardsFilters = {
    gameType: publicCardsState.filters.gameCategory || undefined,
    difficulty: publicCardsState.filters.difficulty || undefined,
    search: publicCardsState.filters.searchTerm || undefined,
    tags:
      publicCardsState.filters.tags.length > 0
        ? publicCardsState.filters.tags
        : undefined,
  };

  const {
    data: publicCardsData,
    isLoading: isLoadingPublicCards,
    refetch: refetchPublicCards,
  } = usePublicCardsQuery(publicCardsFilters, 1);

  const publicCards = publicCardsData?.response?.cards || [];

  // Authorization check
  useEffect(() => {
    if (board && authUser?.id !== board.creator_id) {
      notifications.error('You are not authorized to edit this board');
      router.push(ROUTES.CHALLENGE_HUB);
    }
  }, [board, authUser, router]);

  // Navigate to preview
  const handleNavigateToPreview = useCallback(() => {
    router.push(ROUTES.CHALLENGE_BOARD(boardId));
  }, [boardId, router]);

  // Handle save success
  const handleSaveSuccess = useCallback(() => {
    uiActions.setShowSaveSuccess(true);
    onSaveSuccess?.();
  }, [onSaveSuccess, uiActions]);

  // Handle save wrapper
  const handleSave = useCallback(async () => {
    await saveActions.saveBoard();
    handleSaveSuccess();
  }, [saveActions, handleSaveSuccess]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(active.id);

      // Determine card being dragged
      const cardId = active.id as string;
      let card: BingoCard | null = null;
      let fromIndex: number | null = null;

      // Check if dragging from grid
      const gridIndex = gridCards.findIndex(c => c.id === cardId);
      if (gridIndex !== -1) {
        card = gridCards[gridIndex] || null;
        fromIndex = gridIndex;
      } else {
        // Check private cards
        card = privateCards.find(c => c.id === cardId) || null;
      }

      if (card) {
        setDraggedCard(card);
        setDraggedFromIndex(fromIndex);
        uiActions.setDraggedCard(card);
      }
    },
    [gridCards, privateCards, uiActions]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;

      setActiveId(null);
      setDraggedCard(null);
      setDraggedFromIndex(null);
      uiActions.setDraggedCard(null);

      if (!over || !draggedCard) return;

      const overId = over.id as string;

      // Handle drop on trash
      if (overId === 'trash-drop-zone') {
        if (draggedFromIndex !== null) {
          removeCardFromGrid(draggedFromIndex);
        }
        return;
      }

      // Handle drop on grid
      if (overId.startsWith('grid-')) {
        const targetIndex = parseInt(overId.replace('grid-', ''), 10);
        if (!isNaN(targetIndex)) {
          moveCardToGrid(draggedCard, targetIndex);
        }
      }
    },
    [
      draggedCard,
      draggedFromIndex,
      uiActions,
      removeCardFromGrid,
      moveCardToGrid,
    ]
  );

  // Handle card selection
  const handleCardSelect = useCallback(
    (card: BingoCard) => {
      uiActions.selectCard(card);
    },
    [uiActions]
  );

  // Handle card voting
  const handleVoteCard = useCallback(
    async (card: BingoCard) => {
      try {
        await voteCardMutation.mutateAsync(card.id);
        await refetchPublicCards();
        notifications.success('Vote recorded!');
      } catch (error) {
        log.error('Failed to vote for card', toError(error));
        notifications.error('Failed to vote for card');
      }
    },
    [voteCardMutation, refetchPublicCards]
  );

  // Loading state
  if (isLoadingBoard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  // Error state
  if (boardError || !board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-500">
            {boardError || 'Board not found'}
          </h2>
          <button
            onClick={() => router.push(ROUTES.CHALLENGE_HUB)}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Back to Challenge Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col overflow-hidden bg-gray-950">
        <BoardHeader
          board={board}
          title={board.title}
          isSaving={isSaving}
          hasErrors={false}
          onClose={handleNavigateToPreview}
          onSave={handleSave}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-6">
              <BingoGrid
                gridCards={gridCards}
                gridSize={5}
                isLoading={isLoadingBoard}
                onCardClick={(card, _index) => handleCardSelect(card)}
                onRemoveCard={removeCardFromGrid}
              />
            </div>

            {/* Trash Drop Zone */}
            {activeId && draggedFromIndex !== null && <TrashDropZone />}
          </div>

          {/* Right Sidebar */}
          <div className="w-96 overflow-hidden border-l border-gray-800 bg-gray-900/50">
            <CardManagementTabs
              privateCards={privateCards}
              publicCards={publicCards}
              currentBoard={{ game_type: board.game_type, size: 25 }}
              isLoadingPrivateCards={false}
              isLoadingPublicCards={isLoadingPublicCards}
              onCardSelect={handleCardSelect}
              onCardEdit={(card, index) =>
                uiActions.openCardEditor(card, index)
              }
              onCreateNewCard={() =>
                uiActions.openCardEditor(createEmptyBingoCard(), -1)
              }
              onTabChange={async () => {}}
              onFilterPublicCards={async filters => {
                const storeFilters = {
                  gameCategory: filters.game_type || null,
                  difficulty:
                    filters.difficulty === 'all'
                      ? null
                      : filters.difficulty || null,
                  tags: filters.tags || [],
                  searchTerm: filters.search || '',
                };
                publicCardsActions.setFilters(storeFilters);
              }}
              onClearPublicFilters={async () =>
                publicCardsActions.clearFilters()
              }
              onVoteCard={handleVoteCard}
              onShuffle={async () => {}}
            />
          </div>

          {/* Settings Panel */}
          {board.creator_id === authUser?.id && formData && (
            <BoardSettingsPanel
              formData={formData}
              fieldErrors={fieldErrors || {}}
              onUpdateField={(field, value) =>
                uiActions.updateFormField(field, value)
              }
              onFormDataChange={updater =>
                uiActions.setFormData(updater(formData))
              }
            />
          )}
        </div>

        {/* Dialogs */}
        <Suspense fallback={null}>
          {editingCard && (
            <BingoCardEditDialog
              card={editingCard.card}
              index={editingCard.index || 0}
              isOpen={true}
              onClose={() => uiActions.closeCardEditor()}
              onSave={async (updates, _index) => {
                if (editingCard.isNew) {
                  const cardData = {
                    title: updates.title || editingCard.card.title,
                    description: updates.description || undefined,
                    tags: updates.tags || undefined,
                  };
                  const newCard = await cardOperations.createCard(cardData);
                  if (newCard) {
                    uiActions.addPrivateCard(newCard);
                  }
                } else {
                  await cardOperations.updateCard(editingCard.card.id, {
                    title: updates.title,
                    description: updates.description,
                    tags: updates.tags,
                  });
                }
                uiActions.closeCardEditor();
              }}
            />
          )}

          {selectedCard && (
            <GridPositionSelectDialog
              isOpen={true}
              onClose={() => uiActions.selectCard(null)}
              onSelect={index => {
                if (selectedCard) {
                  moveCardToGrid(selectedCard, index);
                  uiActions.selectCard(null);
                }
              }}
              gridSize={25}
              takenPositions={gridCards
                .map((_, index) => index)
                .filter(index => gridCards[index] !== null)}
            />
          )}
        </Suspense>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedCard ? (
            <div className="cursor-grabbing opacity-80">
              <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
                <h4 className="font-medium text-white">{draggedCard.title}</h4>
              </div>
            </div>
          ) : null}
        </DragOverlay>

        {/* Success notification */}
        {showSaveSuccess && (
          <div className="animate-fade-in-up fixed right-4 bottom-4">
            <div className="rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg">
              {UI_MESSAGES.SAVE.SUCCESS}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
};

export const BingoBoardEditRefactored = React.memo(
  BingoBoardEditRefactoredComponent,
  (prevProps, nextProps) => {
    // Custom comparison for performance
    return prevProps.boardId === nextProps.boardId;
  }
);

BingoBoardEditRefactored.displayName = 'BingoBoardEditRefactored';
