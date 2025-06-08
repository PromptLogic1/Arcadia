import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import type { Tables, Enums } from '@/types/database.types';

// Type aliases from database-generated
type BingoCard = Tables<'bingo_cards'>;
type GameCategory = Enums<'game_category'>;
type DifficultyLevel = Enums<'difficulty_level'>;
import { useShallow } from 'zustand/shallow';

interface BingoCardsState {
  // UI State only - no server data
  selectedCardId: string | null;
  selectedCards: BingoCard[];
  gridCards: BingoCard[];
  filters: {
    gameCategory: GameCategory | null;
    difficulty: DifficultyLevel | null;
    tags: string[];
    searchTerm: string;
  };

  // UI Actions
  setSelectedCardId: (id: string | null) => void;
  setSelectedCards: (cards: BingoCard[]) => void;
  setGridCards: (cards: BingoCard[]) => void;
  addSelectedCard: (card: BingoCard) => void;
  removeSelectedCard: (cardId: string) => void;
  clearSelectedCards: () => void;
  updateGridCard: (index: number, card: BingoCard) => void;
  removeGridCard: (index: number) => void;
  setFilters: (filters: Partial<BingoCardsState['filters']>) => void;
  clearFilters: () => void;
}

export const useBingoCardsStore = createWithEqualityFn<BingoCardsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedCardId: null,
      selectedCards: [],
      gridCards: [],
      filters: {
        gameCategory: null,
        difficulty: null,
        tags: [],
        searchTerm: '',
      },

      // UI Actions
      setSelectedCardId: selectedCardId =>
        set({ selectedCardId }, false, 'bingoCards/setSelectedCardId'),

      setSelectedCards: selectedCards =>
        set({ selectedCards }, false, 'bingoCards/setSelectedCards'),

      setGridCards: gridCards =>
        set({ gridCards }, false, 'bingoCards/setGridCards'),

      addSelectedCard: card => {
        const { selectedCards } = get();
        if (!selectedCards.find(c => c.id === card.id)) {
          set(
            { selectedCards: [...selectedCards, card] },
            false,
            'bingoCards/addSelectedCard'
          );
        }
      },

      removeSelectedCard: cardId => {
        const { selectedCards } = get();
        set(
          {
            selectedCards: selectedCards.filter(card => card.id !== cardId),
          },
          false,
          'bingoCards/removeSelectedCard'
        );
      },

      clearSelectedCards: () =>
        set({ selectedCards: [] }, false, 'bingoCards/clearSelectedCards'),

      updateGridCard: (index: number, card: BingoCard): void => {
        const { gridCards } = get();
        const updatedGridCards = [...gridCards];
        updatedGridCards[index] = card;
        set(
          { gridCards: updatedGridCards },
          false,
          'bingoCards/updateGridCard'
        );
      },

      removeGridCard: (index: number): void => {
        const { gridCards } = get();
        const updatedGridCards = [...gridCards];
        updatedGridCards.splice(index, 1);
        set(
          { gridCards: updatedGridCards },
          false,
          'bingoCards/removeGridCard'
        );
      },

      setFilters: newFilters => {
        const { filters } = get();
        set(
          { filters: { ...filters, ...newFilters } },
          false,
          'bingoCards/setFilters'
        );
      },

      clearFilters: () =>
        set(
          {
            filters: {
              gameCategory: null,
              difficulty: null,
              tags: [],
              searchTerm: '',
            },
          },
          false,
          'bingoCards/clearFilters'
        ),
    }),
    {
      name: 'bingo-cards-store',
    }
  )
);

// Selectors for UI state
export const useBingoCardsState = () =>
  useBingoCardsStore(
    useShallow(state => ({
      selectedCardId: state.selectedCardId,
      selectedCards: state.selectedCards,
      gridCards: state.gridCards,
      filters: state.filters,
    }))
  );

export const useBingoCardsActions = () =>
  useBingoCardsStore(
    useShallow(state => ({
      setSelectedCardId: state.setSelectedCardId,
      setSelectedCards: state.setSelectedCards,
      setGridCards: state.setGridCards,
      addSelectedCard: state.addSelectedCard,
      removeSelectedCard: state.removeSelectedCard,
      clearSelectedCards: state.clearSelectedCards,
      updateGridCard: state.updateGridCard,
      removeGridCard: state.removeGridCard,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
    }))
  );
