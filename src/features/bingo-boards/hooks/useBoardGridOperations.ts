/**
 * Focused hook for board grid operations
 * Part of the refactored useBingoBoardEdit split
 */

import { useCallback, useMemo } from 'react';
import useBoardEditStore, {
  useBoardEditState,
  useBoardEditActions,
} from '@/lib/stores/board-edit-store';
import { useAuth } from '@/lib/stores/auth-store';
import { useBoardData } from './useBoardData';
import type { BingoCard, GameCategory, Difficulty } from '@/types';

// Type-safe default values
const DEFAULT_GAME_CATEGORY: GameCategory = 'All Games';
const DEFAULT_DIFFICULTY: Difficulty = 'medium';

export function useBoardGridOperations(boardId: string) {
  const { board } = useBoardData(boardId);
  const { authUser } = useAuth();
  const uiActions = useBoardEditActions();
  const { localGridCards, localPrivateCards } = useBoardEditState();

  // Memoized move card to grid action
  const moveCardToGrid = useCallback(
    (card: BingoCard, position: number) => {
      const updatedGrid = [...localGridCards];

      // Handle existing card at position
      const existingCard = updatedGrid[position];
      if (existingCard?.title) {
        // Move existing card back to private collection
        if (!existingCard.id.startsWith('temp-')) {
          uiActions.setLocalPrivateCards([...localPrivateCards, existingCard]);
        }
      }

      // Place new card in grid
      updatedGrid[position] = card;
      uiActions.setLocalGridCards(updatedGrid);

      // Remove from private cards if it was there
      if (localPrivateCards.some((pc: BingoCard) => pc.id === card.id)) {
        uiActions.setLocalPrivateCards(
          localPrivateCards.filter((pc: BingoCard) => pc.id !== card.id)
        );
      }
    },
    [localGridCards, localPrivateCards, uiActions]
  );

  // Memoized remove card from grid action
  const removeCardFromGrid = useCallback(
    (position: number) => {
      const updatedGrid = [...localGridCards];
      const removedCard = updatedGrid[position];

      if (removedCard?.title) {
        // Create empty card for this position
        updatedGrid[position] = {
          id: `empty-${position}`,
          title: '',
          description: null,
          game_type: board?.game_type || DEFAULT_GAME_CATEGORY,
          difficulty: board?.difficulty || DEFAULT_DIFFICULTY,
          tags: [],
          creator_id: authUser?.id || '',
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          votes: 0,
        };
        uiActions.setLocalGridCards(updatedGrid);

        // Add back to private cards if not public
        if (
          removedCard.id.startsWith('temp-') ||
          removedCard.creator_id === authUser?.id
        ) {
          uiActions.setLocalPrivateCards([...localPrivateCards, removedCard]);
        }
      }
    },
    [localGridCards, localPrivateCards, board, authUser, uiActions]
  );

  // Memoized swap cards action
  const swapGridCards = useCallback(
    (position1: number, position2: number) => {
      const updatedGrid = [...localGridCards];
      const card1 = updatedGrid[position1];
      const card2 = updatedGrid[position2];

      if (card1 !== undefined && card2 !== undefined) {
        updatedGrid[position1] = card2;
        updatedGrid[position2] = card1;
        uiActions.setLocalGridCards(updatedGrid);
      }
    },
    [localGridCards, uiActions]
  );

  // Memoized place card in grid (alias for moveCardToGrid)
  const placeCardInGrid = useCallback(
    (card: BingoCard, index: number) => {
      moveCardToGrid(card, index);
    },
    [moveCardToGrid]
  );

  // Memoized handle position select
  const handlePositionSelect = useCallback(
    (index: number) => {
      const selectedCard = useBoardEditStore.getState().selectedCard;
      if (selectedCard) {
        moveCardToGrid(selectedCard, index);
        uiActions.clearSelectedCard();
      }
    },
    [moveCardToGrid, uiActions]
  );

  // Memoized has changes check
  const hasChanges = useMemo(() => {
    if (!board || !localGridCards) return false;

    // Compare current grid state with saved state
    const originalCells = board.board_state;
    const currentCells = localGridCards;

    if (originalCells.length !== currentCells.length) return true;

    return originalCells.some((original, index) => {
      const current = currentCells[index];
      return (
        original.text !== current?.title ||
        original.cell_id !==
          (current?.id?.startsWith('temp-') ? null : current?.id)
      );
    });
  }, [board, localGridCards]);

  return {
    // Grid operations
    moveCardToGrid,
    removeCardFromGrid,
    swapGridCards,
    placeCardInGrid,
    handlePositionSelect,

    // State
    hasChanges,
    gridCards: localGridCards,
    privateCards: localPrivateCards,
  };
}
