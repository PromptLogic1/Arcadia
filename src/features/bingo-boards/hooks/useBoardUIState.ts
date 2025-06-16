/**
 * Focused hook for board UI state only
 * Part of the refactored useBingoBoardEdit split
 */

import { useShallow } from 'zustand/react/shallow';
import useBoardEditStore from '@/lib/stores/board-edit-store';

// Memoized selectors for specific UI state slices
export function useBoardUIState() {
  return useBoardEditStore(
    useShallow(state => ({
      selectedCard: state.selectedCard,
      draggedCard: state.draggedCard,
      isEditMode: state.isEditMode,
      isSaving: state.isSaving,
      editingCard: state.editingCard,
      showSaveSuccess: state.showSaveSuccess,
      showAdvancedSettings: state.showAdvancedSettings,
      autoSave: state.autoSave,
      formData: state.formData,
      fieldErrors: state.fieldErrors,
    }))
  );
}

// Granular hooks for specific UI state
export function useSelectedCard() {
  return useBoardEditStore(state => state.selectedCard);
}

export function useDraggedCard() {
  return useBoardEditStore(state => state.draggedCard);
}

export function useIsEditMode() {
  return useBoardEditStore(state => state.isEditMode);
}

export function useIsSaving() {
  return useBoardEditStore(state => state.isSaving);
}

export function useEditingCard() {
  return useBoardEditStore(state => state.editingCard);
}

// Hook for grid state
export function useBoardGridState() {
  return useBoardEditStore(
    useShallow(state => ({
      localGridCards: state.localGridCards,
      localPrivateCards: state.localPrivateCards,
    }))
  );
}

// Hook for grid cards only
export function useGridCards() {
  return useBoardEditStore(state => state.localGridCards);
}

// Hook for private cards only
export function usePrivateCards() {
  return useBoardEditStore(state => state.localPrivateCards);
}
