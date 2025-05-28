import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { createClient } from '@/lib/supabase';
import type {
  BingoCard,
  GameCategory,
  DifficultyLevel,
  FilterOptions,
} from '@/types';
import { logger } from '@/src/lib/logger';
import { useShallow } from 'zustand/shallow';

interface CreateBingoCardDTO {
  title: string;
  description?: string | null;
  difficulty: DifficultyLevel;
  game_type: GameCategory;
  tags?: string[] | null;
  is_public?: boolean | null;
}

const DEFAULT_BINGO_CARD: BingoCard = {
  id: '',
  title: '',
  description: null,
  difficulty: 'easy',
  game_type: 'All Games',
  tags: [],
  creator_id: null,
  created_at: null,
  updated_at: null,
  is_public: false,
  votes: null,
};

interface BingoCardsState {
  // State
  cards: BingoCard[];
  userCards: BingoCard[];
  publicCards: BingoCard[];
  selectedCards: BingoCard[];
  cardsForSelection: BingoCard[];
  gridCards: BingoCard[];
  selectedCardId: string | null;
  loading: boolean;
  error: string | null;
  filters: {
    gameCategory: GameCategory | null;
    difficulty: DifficultyLevel | null;
    tags: string[];
    searchTerm: string;
  };

  // Basic Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCards: (cards: BingoCard[]) => void;
  setUserCards: (cards: BingoCard[]) => void;
  setPublicCards: (cards: BingoCard[]) => void;
  setSelectedCards: (cards: BingoCard[]) => void;
  setCardsForSelection: (cards: BingoCard[]) => void;
  setGridCards: (cards: BingoCard[]) => void;
  setSelectedCardId: (id: string | null) => void;
  addCard: (card: BingoCard) => void;
  updateCard: (id: string, updates: Partial<BingoCard>) => void;
  removeCard: (id: string) => void;
  selectCard: (card: BingoCard) => void;
  deselectCard: (cardId: string) => void;
  clearSelectedCards: () => void;
  clearGridCards: () => void;
  clearPublicCards: () => void;
  setFilters: (filters: Partial<BingoCardsState['filters']>) => void;
  clearFilters: () => void;

  // Service Methods
  initializeCards: (
    userId: string,
    gameCategory: GameCategory
  ) => Promise<BingoCard[]>;
  getCardById: (cardId: string) => Promise<BingoCard | null>;
  createCard: (
    cardData: CreateBingoCardDTO,
    userId: string
  ) => Promise<BingoCard | null>;
  updateCardService: (
    cardId: string,
    updates: Partial<BingoCard>,
    userId: string,
    gameCategory: GameCategory
  ) => Promise<BingoCard | null>;
  deleteCard: (
    cardId: string,
    userId: string,
    gameCategory: GameCategory
  ) => Promise<boolean>;
  voteCard: (cardId: string) => Promise<boolean>;
  getCardsByGameCategory: (gameCategory: GameCategory) => Promise<BingoCard[]>;
  filterCards: (filters: {
    gameCategory?: GameCategory;
    cardType?: string;
    difficulty?: DifficultyLevel;
    searchTerm?: string;
  }) => Promise<BingoCard[]>;
  getCardsByIds: (cardIds: string[]) => Promise<BingoCard[]>;
  initGridCards: (layoutIds: string[]) => Promise<void>;
  updateGridCard: (index: number, card: BingoCard) => void;
  removeGridCard: (index: number) => void;
  initializePublicCards: (
    gameCategory: GameCategory,
    page?: number
  ) => Promise<void>;
  filterPublicCards: (
    filters: FilterOptions,
    gameCategory: GameCategory,
    page?: number
  ) => Promise<void>;
}

export const useBingoCardsStore = createWithEqualityFn<BingoCardsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      cards: [],
      userCards: [],
      publicCards: [],
      selectedCards: [],
      cardsForSelection: [],
      gridCards: [],
      selectedCardId: null,
      loading: false,
      error: null,
      filters: {
        gameCategory: null,
        difficulty: null,
        tags: [],
        searchTerm: '',
      },

      // Basic Actions
      setLoading: loading => set({ loading }, false, 'bingoCards/setLoading'),

      setError: error => set({ error }, false, 'bingoCards/setError'),

      setCards: cards =>
        set({ cards, error: null }, false, 'bingoCards/setCards'),

      setUserCards: userCards =>
        set({ userCards }, false, 'bingoCards/setUserCards'),

      setPublicCards: publicCards =>
        set({ publicCards }, false, 'bingoCards/setPublicCards'),

      setSelectedCards: selectedCards =>
        set({ selectedCards }, false, 'bingoCards/setSelectedCards'),

      setCardsForSelection: cardsForSelection =>
        set({ cardsForSelection }, false, 'bingoCards/setCardsForSelection'),

      setGridCards: gridCards =>
        set({ gridCards }, false, 'bingoCards/setGridCards'),

      setSelectedCardId: selectedCardId =>
        set({ selectedCardId }, false, 'bingoCards/setSelectedCardId'),

      addCard: card => {
        const { cards, userCards } = get();
        set(
          {
            cards: [...cards, card],
            userCards: [...userCards, card],
          },
          false,
          'bingoCards/addCard'
        );
      },

      updateCard: (id, updates) => {
        const { cards, userCards, publicCards, cardsForSelection } = get();

        const updateCards = (cardList: BingoCard[]) =>
          cardList.map(card =>
            card.id === id ? { ...card, ...updates } : card
          );

        set(
          {
            cards: updateCards(cards),
            userCards: updateCards(userCards),
            publicCards: updateCards(publicCards),
            cardsForSelection: updateCards(cardsForSelection),
          },
          false,
          'bingoCards/updateCard'
        );
      },

      removeCard: id => {
        const {
          cards,
          userCards,
          publicCards,
          selectedCards,
          cardsForSelection,
        } = get();

        const filterCards = (cardList: BingoCard[]) =>
          cardList.filter(card => card.id !== id);

        set(
          {
            cards: filterCards(cards),
            userCards: filterCards(userCards),
            publicCards: filterCards(publicCards),
            selectedCards: filterCards(selectedCards),
            cardsForSelection: filterCards(cardsForSelection),
          },
          false,
          'bingoCards/removeCard'
        );
      },

      selectCard: card => {
        const { selectedCards } = get();
        if (!selectedCards.find(c => c.id === card.id)) {
          set(
            { selectedCards: [...selectedCards, card] },
            false,
            'bingoCards/selectCard'
          );
        }
      },

      deselectCard: cardId => {
        const { selectedCards } = get();
        set(
          {
            selectedCards: selectedCards.filter(card => card.id !== cardId),
          },
          false,
          'bingoCards/deselectCard'
        );
      },

      clearSelectedCards: () =>
        set({ selectedCards: [] }, false, 'bingoCards/clearSelectedCards'),

      clearGridCards: () =>
        set({ gridCards: [] }, false, 'bingoCards/clearGridCards'),

      clearPublicCards: () =>
        set({ publicCards: [] }, false, 'bingoCards/clearPublicCards'),

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

      // Service Methods
      initializeCards: async (
        userId: string,
        gameCategory: GameCategory
      ): Promise<BingoCard[]> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          const { data: cards, error } = await supabase
            .from('bingo_cards')
            .select('*')
            .eq('creator_id', userId)
            .eq('game_type', gameCategory)
            .order('created_at', { ascending: false });

          if (error) throw error;

          get().setCards(cards || []);
          logger.debug('Bingo cards initialized', {
            metadata: { store: 'BingoCardsStore', count: cards?.length },
          });
          return cards || [];
        } catch (error) {
          logger.error('Bingo cards initialization error', error as Error, {
            metadata: { store: 'BingoCardsStore' },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to load cards'
          );
          return [];
        } finally {
          get().setLoading(false);
        }
      },

      getCardById: async (cardId: string): Promise<BingoCard | null> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          const { data: card, error } = await supabase
            .from('bingo_cards')
            .select('*')
            .eq('id', cardId)
            .single();

          if (error) throw error;

          if (card) {
            get().setSelectedCardId(card.id);
          }

          return card;
        } catch (error) {
          logger.error('Error fetching card by ID', error as Error, {
            metadata: { store: 'BingoCardsStore', cardId },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to fetch card'
          );
          return null;
        } finally {
          get().setLoading(false);
        }
      },

      createCard: async (
        cardData: CreateBingoCardDTO,
        userId: string
      ): Promise<BingoCard | null> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          logger.debug('Creating bingo card', {
            metadata: { store: 'BingoCardsStore', cardData },
          });

          const { data: card, error } = await supabase
            .from('bingo_cards')
            .insert([
              {
                ...cardData,
                creator_id: userId,
                votes: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (error) {
            logger.error('Supabase error creating card', error, {
              metadata: {
                store: 'BingoCardsStore',
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
              },
            });
            throw error;
          }

          if (!card) {
            throw new Error('No card data returned after creation');
          }

          await get().initializeCards(userId, cardData.game_type);
          return card;
        } catch (error) {
          logger.error('Error creating card', error as Error, {
            metadata: { store: 'BingoCardsStore', cardData },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to create card'
          );
          return null;
        } finally {
          get().setLoading(false);
        }
      },

      updateCardService: async (
        cardId: string,
        updates: Partial<BingoCard>,
        userId: string,
        gameCategory: GameCategory
      ): Promise<BingoCard | null> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          const { data: card, error } = await supabase
            .from('bingo_cards')
            .update(updates)
            .eq('id', cardId)
            .select()
            .single();

          if (error) throw error;

          await get().initializeCards(userId, gameCategory);

          return card;
        } catch (error) {
          logger.error('Error updating card', error as Error, {
            metadata: { store: 'BingoCardsStore', cardId, updates },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to update card'
          );
          return null;
        } finally {
          get().setLoading(false);
        }
      },

      deleteCard: async (
        cardId: string,
        userId: string,
        gameCategory: GameCategory
      ): Promise<boolean> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          const { error } = await supabase
            .from('bingo_cards')
            .delete()
            .eq('id', cardId);

          if (error) throw error;

          await get().initializeCards(userId, gameCategory);

          return true;
        } catch (error) {
          logger.error('Error deleting card', error as Error, {
            metadata: { store: 'BingoCardsStore', cardId },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to delete card'
          );
          return false;
        } finally {
          get().setLoading(false);
        }
      },

      voteCard: async (cardId: string): Promise<boolean> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          const { data: card, error: fetchError } = await supabase
            .from('bingo_cards')
            .select('votes')
            .eq('id', cardId)
            .single();

          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase
            .from('bingo_cards')
            .update({ votes: (card.votes || 0) + 1 })
            .eq('id', cardId);

          if (updateError) throw updateError;

          return true;
        } catch (error) {
          logger.error('Error voting for card', error as Error, {
            metadata: { store: 'BingoCardsStore', cardId },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to vote for card'
          );
          return false;
        } finally {
          get().setLoading(false);
        }
      },

      getCardsByGameCategory: async (
        gameCategory: GameCategory
      ): Promise<BingoCard[]> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          const { data: cards, error } = await supabase
            .from('bingo_cards')
            .select('*')
            .eq('game_type', gameCategory)
            .eq('is_public', true)
            .order('votes', { ascending: false });

          if (error) throw error;

          return cards || [];
        } catch (error) {
          logger.error(
            'Error fetching cards by game category',
            error as Error,
            { metadata: { store: 'BingoCardsStore', gameCategory } }
          );
          get().setError(
            error instanceof Error ? error.message : 'Failed to fetch cards'
          );
          return [];
        } finally {
          get().setLoading(false);
        }
      },

      filterCards: async ({
        gameCategory,
        cardType: _cardType,
        difficulty,
        searchTerm,
      }: {
        gameCategory?: GameCategory;
        cardType?: string;
        difficulty?: DifficultyLevel;
        searchTerm?: string;
      }): Promise<BingoCard[]> => {
        try {
          get().setLoading(true);
          const supabase = createClient();

          let query = supabase
            .from('bingo_cards')
            .select('*')
            .eq('is_public', true);

          if (gameCategory) {
            query = query.eq('game_type', gameCategory);
          }

          if (difficulty) {
            query = query.eq('difficulty', difficulty);
          }

          if (searchTerm) {
            query = query.ilike('title', `%${searchTerm}%`);
          }

          const { data: cards, error } = await query.order('votes', {
            ascending: false,
          });

          if (error) throw error;

          return cards || [];
        } catch (error) {
          logger.error('Error filtering cards', error as Error, {
            metadata: {
              store: 'BingoCardsStore',
              gameCategory,
              difficulty,
              searchTerm,
            },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to filter cards'
          );
          return [];
        } finally {
          get().setLoading(false);
        }
      },

      getCardsByIds: async (cardIds: string[]): Promise<BingoCard[]> => {
        try {
          const realCardIds = cardIds.filter(id => id !== '');

          if (realCardIds.length === 0) return [];

          logger.debug('Fetching cards by IDs', {
            metadata: { store: 'BingoCardsStore', cardIds: realCardIds },
          });

          const supabase = createClient();

          const { data, error } = await supabase
            .from('bingo_cards')
            .select('*')
            .in('id', realCardIds);

          if (error) {
            logger.error('Supabase error fetching cards by IDs', error, {
              metadata: {
                store: 'BingoCardsStore',
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
              },
            });
            throw new Error(`Database error: ${error.message}`);
          }

          logger.debug('Fetched cards by IDs successfully', {
            metadata: { store: 'BingoCardsStore', count: data?.length },
          });
          return data || [];
        } catch (error) {
          const _errorMessage =
            error instanceof Error
              ? error.message
              : 'Unknown error fetching cards';
          logger.error('Error fetching cards by IDs', error as Error, {
            metadata: { store: 'BingoCardsStore', cardIds },
          });
          throw error;
        }
      },

      initGridCards: async (layoutIds: string[]): Promise<void> => {
        try {
          get().setLoading(true);
          const realCardIds = layoutIds.filter(id => id !== '');
          let gridCards: BingoCard[] = [];

          if (realCardIds.length > 0) {
            const supabase = createClient();

            const { data: cards, error } = await supabase
              .from('bingo_cards')
              .select('*')
              .in('id', realCardIds);

            if (error) throw error;
            const cardMap = new Map(cards?.map(card => [card.id, card]) || []);

            gridCards = layoutIds.map(id =>
              id === ''
                ? { ...DEFAULT_BINGO_CARD }
                : cardMap.get(id) || { ...DEFAULT_BINGO_CARD }
            ) as BingoCard[];
          } else {
            gridCards = layoutIds.map(() => ({
              ...DEFAULT_BINGO_CARD,
            })) as BingoCard[];
          }

          get().setGridCards(gridCards);
        } catch (error) {
          logger.error('Error initializing grid cards', error as Error, {
            metadata: { store: 'BingoCardsStore', layoutIds },
          });
          get().setError(
            error instanceof Error
              ? error.message
              : 'Failed to initialize grid cards'
          );
        } finally {
          get().setLoading(false);
        }
      },

      updateGridCard: (index: number, card: BingoCard): void => {
        const { gridCards } = get();
        const updatedGridCards = [...gridCards];
        updatedGridCards[index] = card;
        get().setGridCards(updatedGridCards);
      },

      removeGridCard: (index: number): void => {
        const { gridCards } = get();
        const updatedGridCards = [...gridCards];
        updatedGridCards.splice(index, 1);
        get().setGridCards(updatedGridCards);
      },

      initializePublicCards: async (
        gameCategory: GameCategory,
        page = 1
      ): Promise<void> => {
        try {
          get().setLoading(true);
          get().setError(null);
          get().clearPublicCards();
          const supabase = createClient();

          const { data: cards, error } = await supabase
            .from('bingo_cards')
            .select('*')
            .eq('is_public', true)
            .eq('game_type', gameCategory)
            .order('votes', { ascending: false })
            .range((page - 1) * 50, page * 50 - 1);

          if (error) {
            logger.error('Error fetching public cards', error, {
              metadata: { store: 'BingoCardsStore', gameCategory, page },
            });
            throw error;
          }

          get().setPublicCards(cards || []);
        } catch (error) {
          logger.error('Failed to initialize public cards', error as Error, {
            metadata: { store: 'BingoCardsStore', gameCategory, page },
          });
          get().setError(
            error instanceof Error
              ? error.message
              : 'Failed to load public cards'
          );
          get().setPublicCards([]);
        } finally {
          get().setLoading(false);
        }
      },

      filterPublicCards: async (
        filters: FilterOptions,
        gameCategory: GameCategory,
        page = 1
      ): Promise<void> => {
        try {
          get().setLoading(true);
          get().setError(null);
          get().clearPublicCards();
          const supabase = createClient();

          let query = supabase
            .from('bingo_cards')
            .select('*')
            .eq('is_public', true)
            .eq('game_type', gameCategory);

          if (filters.difficulty && filters.difficulty !== 'all') {
            query = query.eq('difficulty', filters.difficulty);
          }

          const { data: cards, error } = await query
            .order('votes', { ascending: false })
            .range((page - 1) * 50, page * 50 - 1);

          if (error) {
            logger.error('Error filtering public cards', error, {
              metadata: {
                store: 'BingoCardsStore',
                filters,
                gameCategory,
                page,
              },
            });
            throw error;
          }

          get().setPublicCards(cards || []);
        } catch (error) {
          logger.error('Failed to filter public cards', error as Error, {
            metadata: { store: 'BingoCardsStore', filters, gameCategory, page },
          });
          get().setError(
            error instanceof Error ? error.message : 'Failed to filter cards'
          );
          get().setPublicCards([]);
        } finally {
          get().setLoading(false);
        }
      },
    }),
    {
      name: 'bingo-cards-store',
    }
  )
);

// Selectors
export const useBingoCards = () =>
  useBingoCardsStore(
    useShallow(state => ({
      cards: state.cards,
      userCards: state.userCards,
      publicCards: state.publicCards,
      selectedCards: state.selectedCards,
      cardsForSelection: state.cardsForSelection,
      gridCards: state.gridCards,
      selectedCardId: state.selectedCardId,
      loading: state.loading,
      error: state.error,
      filters: state.filters,
    }))
  );

export const useBingoCardsActions = () =>
  useBingoCardsStore(
    useShallow(state => ({
      setLoading: state.setLoading,
      setError: state.setError,
      setCards: state.setCards,
      setUserCards: state.setUserCards,
      setPublicCards: state.setPublicCards,
      setSelectedCards: state.setSelectedCards,
      setCardsForSelection: state.setCardsForSelection,
      setGridCards: state.setGridCards,
      setSelectedCardId: state.setSelectedCardId,
      addCard: state.addCard,
      updateCard: state.updateCard,
      removeCard: state.removeCard,
      selectCard: state.selectCard,
      deselectCard: state.deselectCard,
      clearSelectedCards: state.clearSelectedCards,
      clearGridCards: state.clearGridCards,
      clearPublicCards: state.clearPublicCards,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
      initializeCards: state.initializeCards,
      getCardById: state.getCardById,
      createCard: state.createCard,
      updateCardService: state.updateCardService,
      deleteCard: state.deleteCard,
      voteCard: state.voteCard,
      getCardsByGameCategory: state.getCardsByGameCategory,
      filterCards: state.filterCards,
      getCardsByIds: state.getCardsByIds,
      initGridCards: state.initGridCards,
      updateGridCard: state.updateGridCard,
      removeGridCard: state.removeGridCard,
      initializePublicCards: state.initializePublicCards,
      filterPublicCards: state.filterPublicCards,
    }))
  );
