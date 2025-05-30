import { useState, useCallback } from 'react';
import type { BingoCard } from '@/types';
import { ANIMATIONS } from '../constants';

/**
 * Interface for editing card state
 */
export interface EditingCardState {
  card: BingoCard;
  index: number;
}

/**
 * Custom hook to manage UI state for BingoBoardEdit component
 * Handles modal states, loading states, and UI interactions
 */
export function useBoardEditState() {
  // Modal and dialog states
  const [editingCard, setEditingCard] = useState<EditingCardState | null>(null);
  const [selectedCard, setSelectedCard] = useState<BingoCard | null>(null);

  // Loading and feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Card selection handler
  const handleCardSelect = useCallback((card: BingoCard) => {
    setSelectedCard(card);
  }, []);

  // Card editing handlers
  const openCardEditor = useCallback((card: BingoCard, index: number) => {
    setEditingCard({ card, index });
  }, []);

  const closeCardEditor = useCallback(() => {
    setEditingCard(null);
  }, []);

  // Position selection handler
  const handlePositionSelect = useCallback(
    (
      index: number,
      onPlaceCard: (card: BingoCard, position: number) => void
    ) => {
      if (selectedCard) {
        onPlaceCard(selectedCard, index);
        setSelectedCard(null);

        // Close dropdown if exists (DOM manipulation kept minimal)
        const cardElement = document.querySelector(
          `[data-card-id="${selectedCard.id}"]`
        );
        if (cardElement) {
          const trigger = cardElement.querySelector('[data-state="open"]');
          if (trigger instanceof HTMLElement) {
            trigger.click();
          }
        }
      }
    },
    [selectedCard]
  );

  // Save operation handlers
  const startSaving = useCallback(() => {
    setIsSaving(true);
  }, []);

  const completeSaving = useCallback((success: boolean) => {
    setIsSaving(false);
    if (success) {
      setShowSaveSuccess(true);
      setTimeout(
        () => setShowSaveSuccess(false),
        ANIMATIONS.SAVE_SUCCESS_TIMEOUT
      );
    }
  }, []);

  // Clear selected card
  const clearSelectedCard = useCallback(() => {
    setSelectedCard(null);
  }, []);

  return {
    // State
    editingCard,
    selectedCard,
    isSaving,
    showSaveSuccess,

    // Actions
    handleCardSelect,
    openCardEditor,
    closeCardEditor,
    handlePositionSelect,
    startSaving,
    completeSaving,
    clearSelectedCard,
  };
}
