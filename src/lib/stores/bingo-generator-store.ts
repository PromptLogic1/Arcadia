import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import type { BingoCard } from './types';
import type { GameCategory, Difficulty } from '@/types';
import type { Enums } from '@/types/database-generated';
import { DIFFICULTIES } from '@/src/types/index';
import { CARD_CATEGORIES, type CardCategory } from '@/features/bingo-boards/types/generator.types';

type DifficultyLevel = Enums<'difficulty_level'>;
type GeneratorDifficulty = DifficultyLevel;

interface GeneratorSettings {
  difficulty: GeneratorDifficulty;
  cardPoolSize: 'Small' | 'Medium' | 'Large';
  minVotes: number;
  selectedCategories: CardCategory[];
  gameCategory: GameCategory | null;
  cardSource: 'public' | 'private' | 'publicprivate';
}

interface BingoGeneratorState {
  // State
  cardsForSelection: BingoCard[];
  selectedCards: BingoCard[];
  isLoading: boolean;
  error: string | null;
  
  // Generator Panel Settings
  settings: GeneratorSettings;
}

interface BingoGeneratorActions {
  // Actions
  setCardsForSelection: (cards: BingoCard[]) => void;
  setSelectedCards: (cards: BingoCard[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCardsForSelection: () => void;
  clearSelectedCards: () => void;
  reset: () => void;
  
  // Generator Panel Actions
  updateSettings: (settings: Partial<GeneratorSettings>) => void;
  setDifficulty: (difficulty: GeneratorDifficulty) => void;
  setCardPoolSize: (size: 'Small' | 'Medium' | 'Large') => void;
  setMinVotes: (votes: number) => void;
  setSelectedCategories: (categories: CardCategory[]) => void;
  setGameCategory: (category: GameCategory) => void;
  setCardSource: (source: 'public' | 'private' | 'publicprivate') => void;
}

type BingoGeneratorStore = BingoGeneratorState & BingoGeneratorActions;

const initialState: BingoGeneratorState = {
  cardsForSelection: [],
  selectedCards: [],
  isLoading: false,
  error: null,
  settings: {
    difficulty: DIFFICULTIES[2] || 'medium',
    cardPoolSize: 'Medium',
    minVotes: 0,
    selectedCategories: [...CARD_CATEGORIES],
    gameCategory: null,
    cardSource: 'publicprivate',
  },
};

export const useBingoGeneratorStore =
  createWithEqualityFn<BingoGeneratorStore>()(
    devtools(
      set => ({
        ...initialState,

        // Actions
        setCardsForSelection: cards =>
          set({ cardsForSelection: cards }, false, 'setCardsForSelection'),

        setSelectedCards: cards =>
          set({ selectedCards: cards }, false, 'setSelectedCards'),

        setIsLoading: loading =>
          set({ isLoading: loading }, false, 'setIsLoading'),

        setError: error => set({ error }, false, 'setError'),

        clearCardsForSelection: () =>
          set({ cardsForSelection: [] }, false, 'clearCardsForSelection'),

        clearSelectedCards: () =>
          set({ selectedCards: [] }, false, 'clearSelectedCards'),

        reset: () => set(initialState, false, 'reset'),
        
        // Generator Panel Actions
        updateSettings: settings =>
          set(
            state => ({
              settings: { ...state.settings, ...settings },
            }),
            false,
            'updateSettings'
          ),
          
        setDifficulty: difficulty =>
          set(
            state => ({
              settings: { ...state.settings, difficulty },
            }),
            false,
            'setDifficulty'
          ),
          
        setCardPoolSize: cardPoolSize =>
          set(
            state => ({
              settings: { ...state.settings, cardPoolSize },
            }),
            false,
            'setCardPoolSize'
          ),
          
        setMinVotes: minVotes =>
          set(
            state => ({
              settings: { ...state.settings, minVotes },
            }),
            false,
            'setMinVotes'
          ),
          
        setSelectedCategories: selectedCategories =>
          set(
            state => ({
              settings: { ...state.settings, selectedCategories },
            }),
            false,
            'setSelectedCategories'
          ),
          
        setGameCategory: gameCategory =>
          set(
            state => ({
              settings: { ...state.settings, gameCategory },
            }),
            false,
            'setGameCategory'
          ),
          
        setCardSource: cardSource =>
          set(
            state => ({
              settings: { ...state.settings, cardSource },
            }),
            false,
            'setCardSource'
          ),
      }),
      {
        name: 'bingo-generator-store',
      }
    )
  );

// Selector hooks for better performance
export const useBingoGenerator = () => {
  const cardsForSelection = useBingoGeneratorStore(
    state => state.cardsForSelection
  );
  const selectedCards = useBingoGeneratorStore(state => state.selectedCards);
  const isLoading = useBingoGeneratorStore(state => state.isLoading);
  const error = useBingoGeneratorStore(state => state.error);
  const settings = useBingoGeneratorStore(state => state.settings);

  return {
    cardsForSelection,
    selectedCards,
    isLoading,
    error,
    settings,
  };
};

// Separate selector for just generator settings
export const useBingoGeneratorSettings = () => {
  return useBingoGeneratorStore(state => state.settings);
};

export const useBingoGeneratorActions = () => {
  const setCardsForSelection = useBingoGeneratorStore(
    state => state.setCardsForSelection
  );
  const setSelectedCards = useBingoGeneratorStore(
    state => state.setSelectedCards
  );
  const setIsLoading = useBingoGeneratorStore(state => state.setIsLoading);
  const setError = useBingoGeneratorStore(state => state.setError);
  const clearCardsForSelection = useBingoGeneratorStore(
    state => state.clearCardsForSelection
  );
  const clearSelectedCards = useBingoGeneratorStore(
    state => state.clearSelectedCards
  );
  const reset = useBingoGeneratorStore(state => state.reset);
  
  // Generator Panel Actions
  const updateSettings = useBingoGeneratorStore(state => state.updateSettings);
  const setDifficulty = useBingoGeneratorStore(state => state.setDifficulty);
  const setCardPoolSize = useBingoGeneratorStore(state => state.setCardPoolSize);
  const setMinVotes = useBingoGeneratorStore(state => state.setMinVotes);
  const setSelectedCategories = useBingoGeneratorStore(state => state.setSelectedCategories);
  const setGameCategory = useBingoGeneratorStore(state => state.setGameCategory);
  const setCardSource = useBingoGeneratorStore(state => state.setCardSource);

  return {
    setCardsForSelection,
    setSelectedCards,
    setIsLoading,
    setError,
    clearCardsForSelection,
    clearSelectedCards,
    reset,
    updateSettings,
    setDifficulty,
    setCardPoolSize,
    setMinVotes,
    setSelectedCategories,
    setGameCategory,
    setCardSource,
  };
};
