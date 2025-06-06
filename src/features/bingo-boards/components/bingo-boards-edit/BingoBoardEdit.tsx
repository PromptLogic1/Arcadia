'use client';

import React, { useEffect, useCallback } from 'react';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ROUTES } from '@/src/config/routes';
import { notifications } from '@/lib/notifications';
import { log } from '@/lib/logger';
import {
  DEFAULT_BINGO_CARD,
  createEmptyBingoCard,
  createNewBingoCard,
} from '@/src/types';
import { BaseErrorBoundary } from '@/components/error-boundaries';

// Components
import { BoardHeader } from './BoardHeader';
import { CardManagementTabs } from './CardManagementTabs';
import { BoardSettingsPanel } from './BoardSettingsPanel';
import { BingoGrid } from './BingoGrid';
import { BingoCardEditDialog } from './BingoCardEditDialog';
import { GridPositionSelectDialog } from './GridPositionSelectDialog';
import { TrashDropZone } from './TrashDropZone';

// Hooks
import { useBingoBoardEdit } from '../../hooks/useBingoBoardEdit';
import {
  useBingoCardsState,
  useBingoCardsActions,
} from '@/lib/stores/bingo-cards-store';
import { useAuth } from '@/lib/stores/auth-store';
import { usePublicCardsQuery, useVoteCardMutation } from '@/hooks/queries';

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
  const { isAuthenticated, loading: isAuthLoading } = useAuth();

  // Modern hook combining TanStack Query + Zustand
  const boardEdit = useBingoBoardEdit(boardId);

  // Store hooks for UI state only
  const { filters } = useBingoCardsState();
  const { setFilters, updateGridCard } = useBingoCardsActions();

  // Query hooks for server data
  const { data: publicCardsData, isLoading: isLoadingPublicCards } =
    usePublicCardsQuery(
      {
        gameType: boardEdit.board?.game_type,
        difficulty: filters.difficulty || undefined,
        search: filters.searchTerm,
      },
      1, // page
      50 // limit
    );
  const publicCards = publicCardsData?.response?.cards || [];
  const voteCardMutation = useVoteCardMutation();

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
      boardEdit.startSaving();
      const success = await boardEdit.handleSave();
      boardEdit.completeSaving(success);
      if (success) {
        onSaveSuccess?.();
      }
    } catch (error) {
      boardEdit.completeSaving(false);
      log.error('Failed to save board', error, { component: 'BingoBoardEdit' });
    }
  }, [boardEdit, onSaveSuccess]);

  // Card selection with validation
  const handleCardSelect = useCallback(
    (card: BingoCard) => {
      boardEdit.handleCardSelect(card);
    },
    [boardEdit]
  );

  // Card editing
  const handleCardEdit = useCallback(
    (card: BingoCard, index: number) => {
      boardEdit.openCardEditor(card, index);
    },
    [boardEdit]
  );

  // Position selection for grid placement
  const handlePositionSelect = useCallback(
    (index: number) => {
      boardEdit.handlePositionSelect(index);
    },
    [boardEdit]
  );

  // Create new card
  const handleCreateNewCard = useCallback(() => {
    if (!boardEdit.board) {
      log.error('Cannot create card: Board not initialized', undefined, {
        component: 'BingoBoardEdit',
      });
      return;
    }

    const newCard = createNewBingoCard(
      DEFAULT_BINGO_CARD,
      boardEdit.board.game_type,
      boardEdit.board.creator_id || ''
    );

    boardEdit.openCardEditor(newCard, -1);
  }, [boardEdit]);

  // Tab change handler
  const handleTabChange = useCallback(
    async (value: string) => {
      // Query will automatically refetch when filters change
      if (value === 'public') {
        // Reset filters when switching to public tab
        setFilters({
          gameCategory: boardEdit.board?.game_type || null,
          difficulty: null,
          tags: [],
          searchTerm: '',
        });
      }
    },
    [boardEdit, setFilters]
  );

  // Public card filtering
  const handleFilterPublicCards = useCallback(
    async (filterOptions: FilterOptions) => {
      setFilters({
        gameCategory: boardEdit.board?.game_type || null,
        difficulty:
          (filterOptions.difficulty === 'all'
            ? null
            : filterOptions.difficulty) || null,
        tags: filterOptions.tags || [],
        searchTerm: filterOptions.search || '',
      });
    },
    [boardEdit, setFilters]
  );

  const handleClearPublicFilters = useCallback(async () => {
    setFilters({
      gameCategory: boardEdit.board?.game_type || null,
      difficulty: null,
      tags: [],
      searchTerm: '',
    });
  }, [boardEdit, setFilters]);

  // Card voting
  const handleVoteCard = useCallback(
    async (card: BingoCard) => {
      await voteCardMutation.mutateAsync(card.id);
    },
    [voteCardMutation]
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
    async (formData: Partial<BingoCard>, index: number) => {
      if (!boardEdit.editingCard) return;

      if (
        !boardEdit.editingCard.card.id ||
        boardEdit.editingCard.card.id.startsWith('temp-')
      ) {
        // Creating a new card
        if (index === -1) {
          // Create private card (not placed in grid)
          const newCard = await boardEdit.createCard({
            title: formData.title || '',
            description: formData.description || undefined,
            tags: formData.tags || undefined,
          });
          if (newCard) {
            boardEdit.addPrivateCard(newCard);
          }
        } else {
          // Create card and place in grid
          const newCard = await boardEdit.createCard({
            title: formData.title || '',
            description: formData.description || undefined,
            tags: formData.tags || undefined,
          });
          if (newCard) {
            boardEdit.placeCardInGrid(newCard, index);
          }
        }
      } else {
        // Updating existing card
        await boardEdit.updateCard(boardEdit.editingCard.card.id, formData);
      }

      // Close the dialog
      boardEdit.closeCardEditor();
    },
    [boardEdit]
  );

  // Card return handler
  const handleCardReturnToPrivate = useCallback(
    (card: BingoCard) => {
      // Add card to private collection if not already there
      if (!boardEdit.localPrivateCards.find(c => c.id === card.id)) {
        boardEdit.addPrivateCard(card);
      }
    },
    [boardEdit]
  );

  // Card Library handlers
  const handleShuffle = useCallback(
    async (cards: BingoCard[]) => {
      if (!boardEdit.board) return;

      try {
        const gridSize = boardEdit.board.size || 5;
        const totalCells = gridSize * gridSize;

        // Shuffle cards and take the needed amount
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        const selectedCards = shuffledCards.slice(0, totalCells);

        // Fill any remaining slots with empty cards
        while (selectedCards.length < totalCells) {
          selectedCards.push(
            createEmptyBingoCard(
              boardEdit.board.game_type,
              boardEdit.board.creator_id || ''
            )
          );
        }

        // Update grid with shuffled cards
        boardEdit.setLocalGridCards(selectedCards);

        notifications.success('Board shuffled successfully!', {
          description: `Applied ${selectedCards.length} shuffled cards to your board.`,
        });
      } catch (error) {
        log.error('Failed to shuffle cards', error as Error);
        notifications.error('Failed to shuffle cards', {
          description: 'Please try again or contact support.',
        });
      }
    },
    [boardEdit]
  );

  const handleUseCollection = useCallback(
    async (cards: BingoCard[]) => {
      if (!boardEdit.board) return;

      try {
        const gridSize = boardEdit.board.size || 5;
        const totalCells = gridSize * gridSize;

        // Take cards up to grid size, shuffle if we have more than needed
        let selectedCards = cards.slice(0, totalCells);
        if (cards.length > totalCells) {
          selectedCards = [...cards]
            .sort(() => Math.random() - 0.5)
            .slice(0, totalCells);
        }

        // Fill any remaining slots with empty cards
        while (selectedCards.length < totalCells) {
          selectedCards.push(
            createEmptyBingoCard(
              boardEdit.board.game_type,
              boardEdit.board.creator_id || ''
            )
          );
        }

        // Update grid with collection cards
        boardEdit.setLocalGridCards(selectedCards);

        notifications.success('Collection applied successfully!', {
          description: `Applied ${selectedCards.length} cards from collection to your board.`,
        });
      } catch (error) {
        log.error('Failed to apply collection', error as Error);
        notifications.error('Failed to apply collection', {
          description: 'Please try again or contact support.',
        });
      }
    },
    [boardEdit]
  );

  const handleBulkAddCards = useCallback(
    async (cards: BingoCard[]) => {
      try {
        // Add selected cards to private cards collection
        for (const card of cards) {
          boardEdit.addPrivateCard(card);
        }

        notifications.success('Cards added successfully!', {
          description: `Added ${cards.length} cards to your private collection.`,
        });
      } catch (error) {
        log.error('Failed to add cards', error as Error);
        notifications.error('Failed to add cards', {
          description: 'Please try again or contact support.',
        });
      }
    },
    [boardEdit]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(active.id);

      const activeIdStr = active.id.toString();

      // Check if dragging from grid
      if (activeIdStr.startsWith('grid-')) {
        const parts = activeIdStr.split('-');
        if (parts[1]) {
          const gridIndex = parseInt(parts[1]);
          if (!isNaN(gridIndex)) {
            const card = boardEdit.localGridCards[gridIndex];
            if (card && card.id) {
              setDraggedCard(card);
              setDraggedFromIndex(gridIndex);
              boardEdit.setDraggedCard(card);
              boardEdit.setDraggedFromIndex(gridIndex);
            }
          }
        }
      } else {
        // Dragging from private cards
        const card = boardEdit.localPrivateCards.find(
          c => c.id === activeIdStr
        );
        if (card) {
          setDraggedCard(card);
          setDraggedFromIndex(null);
          boardEdit.setDraggedCard(card);
          boardEdit.setDraggedFromIndex(null);
        }
      }
    },
    [boardEdit]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;

      if (!over || !draggedCard) {
        setActiveId(null);
        setDraggedCard(null);
        setDraggedFromIndex(null);
        return;
      }

      const overId = over.id.toString();

      // Create empty card helper
      const createEmptyCard = (): BingoCard =>
        createEmptyBingoCard(
          boardEdit.board?.game_type || 'All Games',
          boardEdit.board?.creator_id || ''
        );

      // Check if dropping on trash zone
      if (overId === 'trash-drop-zone') {
        if (draggedFromIndex !== null) {
          // Remove from specific grid position
          boardEdit.placeCardInGrid(createEmptyCard(), draggedFromIndex);
          notifications.success('Card removed from grid!');
        }
      }
      // Check if dropping on private cards area
      else if (overId === 'private-cards-drop-zone') {
        if (draggedFromIndex !== null) {
          // Card is being moved from grid to private cards
          boardEdit.placeCardInGrid(createEmptyCard(), draggedFromIndex);

          // Add to private cards if not already there
          if (
            !boardEdit.localPrivateCards.find(
              card => card.id === draggedCard.id
            )
          ) {
            boardEdit.addPrivateCard(draggedCard);
          }

          notifications.success('Card moved to private collection!');
        }
      }
      // Check if dropping on grid position
      else if (overId.startsWith('grid-')) {
        const parts = overId.split('-');
        if (parts[1]) {
          const targetIndex = parseInt(parts[1]);
          if (!isNaN(targetIndex)) {
            // Check if card already exists in grid (prevent duplicates)
            const isAlreadyInGrid = boardEdit.localGridCards.some(
              (card, idx) =>
                card.id === draggedCard.id && idx !== draggedFromIndex
            );

            if (isAlreadyInGrid) {
              notifications.error('This card is already in the grid!');
            } else {
              const existingCard = boardEdit.localGridCards[targetIndex];

              // If dragging from another grid position
              if (
                draggedFromIndex !== null &&
                draggedFromIndex !== targetIndex
              ) {
                // Get both cards
                const sourceCard = boardEdit.localGridCards[draggedFromIndex];
                const targetCard = boardEdit.localGridCards[targetIndex];

                // Create a new grid array to update both positions at once
                const newGridCards = [...boardEdit.localGridCards];

                // Swap the cards
                newGridCards[targetIndex] = sourceCard || createEmptyCard();
                newGridCards[draggedFromIndex] =
                  targetCard || createEmptyCard();

                // Update the entire grid at once to prevent duplication
                boardEdit.setLocalGridCards(newGridCards);

                log.debug('Swapped grid cards', {
                  metadata: {
                    sourceIndex: draggedFromIndex,
                    targetIndex,
                    sourceCard: sourceCard?.title || 'empty',
                    targetCard: targetCard?.title || 'empty',
                  },
                });
              } else if (draggedFromIndex === null) {
                // Dragging from private cards
                if (existingCard?.id) {
                  // Move existing card back to private cards if it's not empty
                  if (
                    !boardEdit.localPrivateCards.find(
                      card => card.id === existingCard.id
                    )
                  ) {
                    boardEdit.addPrivateCard(existingCard);
                  }
                }
                boardEdit.placeCardInGrid(draggedCard, targetIndex);
              }
            }
          }
        }
      }

      setActiveId(null);
      setDraggedCard(null);
      setDraggedFromIndex(null);
      boardEdit.setDraggedCard(null);
      boardEdit.setDraggedFromIndex(null);
    },
    [draggedCard, draggedFromIndex, boardEdit]
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

  if (!boardEdit.board || !boardEdit.formData) {
    return null;
  }

  // Check for form errors
  const hasErrors = Object.values(boardEdit.fieldErrors).some(
    error => error !== undefined
  );

  return (
    <BaseErrorBoundary level="component">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="container mx-auto p-6">
          {/* Header */}
          <BoardHeader
            board={boardEdit.board}
            title={boardEdit.formData.board_title}
            isSaving={boardEdit.isSaving}
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
              privateCards={boardEdit.localPrivateCards}
              publicCards={publicCards}
              currentBoard={{
                game_type: boardEdit.board.game_type,
                size: boardEdit.board.size || 5,
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
              onShuffle={handleShuffle}
              onUseCollection={handleUseCollection}
              onBulkAddCards={handleBulkAddCards}
              onCardReturnToPrivate={handleCardReturnToPrivate}
            />

            {/* Main Content - Settings and Grid */}
            <div className="flex-1">
              {/* Board Settings */}
              <BoardSettingsPanel
                formData={boardEdit.formData}
                fieldErrors={boardEdit.fieldErrors}
                onUpdateField={boardEdit.updateFormField}
                onFormDataChange={updater => {
                  const currentData = boardEdit.formData;
                  const newData = updater(currentData);
                  boardEdit.setFormData(newData);
                }}
              />

              {/* Bingo Grid */}
              <div className="mt-4">
                <BingoGrid
                  gridCards={boardEdit.localGridCards}
                  gridSize={boardEdit.board?.size || 5}
                  isLoading={boardEdit.isLoadingCards}
                  onCardClick={handleCardEdit}
                  onRemoveCard={handleRemoveGridCard}
                />
              </div>
            </div>
          </div>

          {/* Dialogs */}
          {boardEdit.editingCard && (
            <BingoCardEditDialog
              card={boardEdit.editingCard.card}
              index={boardEdit.editingCard.index}
              isOpen={true}
              onClose={boardEdit.closeCardEditor}
              onSave={handleCardDialogSave}
            />
          )}

          {boardEdit.selectedCard && (
            <GridPositionSelectDialog
              isOpen={true}
              onClose={boardEdit.clearSelectedCard}
              onSelect={handlePositionSelect}
              gridSize={boardEdit.board?.size || 5}
              takenPositions={boardEdit.localGridCards
                .map((card, index) => (card.id ? index : -1))
                .filter(index => index !== -1)}
            />
          )}

          {/* Success Message */}
          {boardEdit.showSaveSuccess && (
            <div className="animate-fade-in fixed right-4 bottom-4 rounded-md border border-green-500/50 bg-green-500/20 px-4 py-2 text-green-400 shadow-lg">
              {UI_MESSAGES.SAVE.SUCCESS}
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedCard && (
            <div className="rounded-lg border border-purple-500/50 bg-gray-800/90 p-3 shadow-lg">
              <h4 className="font-medium text-purple-300">
                {draggedCard.title}
              </h4>
              <p className="text-sm text-gray-400">{draggedCard.description}</p>
            </div>
          )}
        </DragOverlay>

        {/* Floating Trash Zone */}
        {activeId && <TrashDropZone />}
      </DndContext>
    </BaseErrorBoundary>
  );
}

// ✅ Ready for review
