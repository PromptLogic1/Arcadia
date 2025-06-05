/**
 * Board Edit Store (Zustand)
 *
 * UI state management for board editing functionality.
 * Server data is handled by TanStack Query hooks.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { Tables, Enums } from '@/types/database-generated';

// Type aliases from database-generated
type BingoCard = Tables<'bingo_cards'>;
type Difficulty = Enums<'difficulty_level'>;

export interface EditingCardState {
  card: BingoCard;
  index: number;
}

export interface BoardEditFormData {
  board_title: string;
  board_description: string;
  board_tags: string[];
  board_difficulty: Difficulty;
  is_public: boolean;
}

export interface BoardEditState {
  // Modal and dialog states
  editingCard: EditingCardState | null;
  selectedCard: BingoCard | null;
  showPositionSelectDialog: boolean;
  showCardEditDialog: boolean;

  // Loading and feedback states
  isSaving: boolean;
  showSaveSuccess: boolean;

  // Form state (UI-specific, not persisted)
  formData: BoardEditFormData | null;
  fieldErrors: Record<string, string>;

  // Grid state (local UI state before save)
  localGridCards: BingoCard[];
  localPrivateCards: BingoCard[];

  // Active drag state
  draggedCard: BingoCard | null;
  draggedFromIndex: number | null;
}

export interface BoardEditActions {
  // Modal management
  setEditingCard: (editingCard: EditingCardState | null) => void;
  setSelectedCard: (card: BingoCard | null) => void;
  setShowPositionSelectDialog: (show: boolean) => void;
  setShowCardEditDialog: (show: boolean) => void;

  // Loading states
  setIsSaving: (saving: boolean) => void;
  setShowSaveSuccess: (show: boolean) => void;

  // Form management
  setFormData: (data: BoardEditFormData | null) => void;
  updateFormField: (
    field: keyof BoardEditFormData,
    value: string | string[] | boolean | Difficulty
  ) => void;
  setFieldErrors: (errors: Record<string, string>) => void;
  clearFieldError: (field: string) => void;

  // Grid management
  setLocalGridCards: (cards: BingoCard[]) => void;
  setLocalPrivateCards: (cards: BingoCard[]) => void;
  updateGridCard: (index: number, card: BingoCard) => void;
  addPrivateCard: (card: BingoCard) => void;
  removePrivateCard: (cardId: string) => void;

  // Drag state
  setDraggedCard: (card: BingoCard | null) => void;
  setDraggedFromIndex: (index: number | null) => void;

  // Utility actions
  reset: () => void;
  openCardEditor: (card: BingoCard, index: number) => void;
  closeCardEditor: () => void;
  handleCardSelect: (card: BingoCard) => void;
  clearSelectedCard: () => void;
}

const initialState: BoardEditState = {
  editingCard: null,
  selectedCard: null,
  showPositionSelectDialog: false,
  showCardEditDialog: false,
  isSaving: false,
  showSaveSuccess: false,
  formData: null,
  fieldErrors: {},
  localGridCards: [],
  localPrivateCards: [],
  draggedCard: null,
  draggedFromIndex: null,
};

const useBoardEditStore = createWithEqualityFn<
  BoardEditState & BoardEditActions
>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Modal management
      setEditingCard: editingCard =>
        set({ editingCard }, false, 'setEditingCard'),

      setSelectedCard: selectedCard =>
        set({ selectedCard }, false, 'setSelectedCard'),

      setShowPositionSelectDialog: show =>
        set(
          { showPositionSelectDialog: show },
          false,
          'setShowPositionSelectDialog'
        ),

      setShowCardEditDialog: show =>
        set({ showCardEditDialog: show }, false, 'setShowCardEditDialog'),

      // Loading states
      setIsSaving: isSaving => set({ isSaving }, false, 'setIsSaving'),

      setShowSaveSuccess: show => {
        set({ showSaveSuccess: show }, false, 'setShowSaveSuccess');
        if (show) {
          // Auto-hide after 3 seconds
          setTimeout(() => {
            set({ showSaveSuccess: false }, false, 'autoHideSaveSuccess');
          }, 3000);
        }
      },

      // Form management
      setFormData: formData => set({ formData }, false, 'setFormData'),

      updateFormField: (field, value) =>
        set(
          state => ({
            formData: state.formData
              ? { ...state.formData, [field]: value }
              : null,
          }),
          false,
          'updateFormField'
        ),

      setFieldErrors: fieldErrors =>
        set({ fieldErrors }, false, 'setFieldErrors'),

      clearFieldError: field =>
        set(
          state => {
            const newErrors = { ...state.fieldErrors };
            delete newErrors[field];
            return { fieldErrors: newErrors };
          },
          false,
          'clearFieldError'
        ),

      // Grid management
      setLocalGridCards: localGridCards =>
        set({ localGridCards }, false, 'setLocalGridCards'),

      setLocalPrivateCards: localPrivateCards =>
        set({ localPrivateCards }, false, 'setLocalPrivateCards'),

      updateGridCard: (index, card) =>
        set(
          state => {
            const newGridCards = [...state.localGridCards];
            newGridCards[index] = card;
            return { localGridCards: newGridCards };
          },
          false,
          'updateGridCard'
        ),

      addPrivateCard: card =>
        set(
          state => ({
            localPrivateCards: [...state.localPrivateCards, card],
          }),
          false,
          'addPrivateCard'
        ),

      removePrivateCard: cardId =>
        set(
          state => ({
            localPrivateCards: state.localPrivateCards.filter(
              card => card.id !== cardId
            ),
          }),
          false,
          'removePrivateCard'
        ),

      // Drag state
      setDraggedCard: draggedCard =>
        set({ draggedCard }, false, 'setDraggedCard'),

      setDraggedFromIndex: draggedFromIndex =>
        set({ draggedFromIndex }, false, 'setDraggedFromIndex'),

      // Utility actions
      reset: () => set(initialState, false, 'reset'),

      openCardEditor: (card, index) =>
        set(
          {
            editingCard: { card, index },
            showCardEditDialog: true,
          },
          false,
          'openCardEditor'
        ),

      closeCardEditor: () =>
        set(
          {
            editingCard: null,
            showCardEditDialog: false,
          },
          false,
          'closeCardEditor'
        ),

      handleCardSelect: card => {
        const state = get();
        if (state.selectedCard?.id === card.id) {
          // Deselect if same card
          set({ selectedCard: null }, false, 'deselectCard');
        } else {
          set({ selectedCard: card }, false, 'selectCard');
        }
      },

      clearSelectedCard: () =>
        set({ selectedCard: null }, false, 'clearSelectedCard'),
    }),
    {
      name: 'board-edit-store',
    }
  )
);

// Selectors for performance optimization
export const useBoardEditState = () =>
  useBoardEditStore(
    useShallow(state => ({
      editingCard: state.editingCard,
      selectedCard: state.selectedCard,
      showPositionSelectDialog: state.showPositionSelectDialog,
      showCardEditDialog: state.showCardEditDialog,
      isSaving: state.isSaving,
      showSaveSuccess: state.showSaveSuccess,
      formData: state.formData,
      fieldErrors: state.fieldErrors,
      localGridCards: state.localGridCards,
      localPrivateCards: state.localPrivateCards,
      draggedCard: state.draggedCard,
      draggedFromIndex: state.draggedFromIndex,
    }))
  );

export const useBoardEditActions = () =>
  useBoardEditStore(
    useShallow(state => ({
      setEditingCard: state.setEditingCard,
      setSelectedCard: state.setSelectedCard,
      setShowPositionSelectDialog: state.setShowPositionSelectDialog,
      setShowCardEditDialog: state.setShowCardEditDialog,
      setIsSaving: state.setIsSaving,
      setShowSaveSuccess: state.setShowSaveSuccess,
      setFormData: state.setFormData,
      updateFormField: state.updateFormField,
      setFieldErrors: state.setFieldErrors,
      clearFieldError: state.clearFieldError,
      setLocalGridCards: state.setLocalGridCards,
      setLocalPrivateCards: state.setLocalPrivateCards,
      updateGridCard: state.updateGridCard,
      addPrivateCard: state.addPrivateCard,
      removePrivateCard: state.removePrivateCard,
      setDraggedCard: state.setDraggedCard,
      setDraggedFromIndex: state.setDraggedFromIndex,
      reset: state.reset,
      openCardEditor: state.openCardEditor,
      closeCardEditor: state.closeCardEditor,
      handleCardSelect: state.handleCardSelect,
      clearSelectedCard: state.clearSelectedCard,
    }))
  );

export default useBoardEditStore;
