/**
 * Bingo Cards Service
 * 
 * Pure functions for bingo cards operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { BingoCard, GameCategory, DifficultyLevel } from '@/types';

export interface CreateCardData {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: DifficultyLevel;
  tags?: string[];
  is_public?: boolean;
  creator_id: string;
}

export interface UpdateCardData {
  title?: string;
  description?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  is_public?: boolean;
}

export interface CardFilters {
  gameType?: GameCategory;
  difficulty?: DifficultyLevel | 'all';
  search?: string;
  isPublic?: boolean;
  creatorId?: string;
}

export interface PaginatedCardsResponse {
  cards: BingoCard[];
  totalCount: number;
  hasMore: boolean;
}

export const bingoCardsService = {
  /**
   * Get cards by IDs
   */
  async getCardsByIds(cardIds: string[]): Promise<{ cards: BingoCard[]; error?: string }> {
    try {
      const validIds = cardIds.filter(id => id && id !== '');
      
      if (validIds.length === 0) {
        return { cards: [] };
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .in('id', validIds);

      if (error) {
        return { cards: [], error: error.message };
      }

      return { cards: (data || []) as BingoCard[] };
    } catch (error) {
      return { 
        cards: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch cards' 
      };
    }
  },

  /**
   * Get public cards with filtering and pagination
   */
  async getPublicCards(
    filters: CardFilters = {},
    page = 1,
    limit = 50
  ): Promise<{ response: PaginatedCardsResponse; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_cards')
        .select('*', { count: 'exact' })
        .eq('is_public', true);

      // Apply filters
      if (filters.gameType) {
        query = query.eq('game_type', filters.gameType);
      }
      
      if (filters.difficulty && filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('votes', { ascending: false })
        .range(start, end);

      if (error) {
        return { 
          response: { cards: [], totalCount: 0, hasMore: false }, 
          error: error.message 
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          cards: (data || []) as BingoCard[],
          totalCount,
          hasMore,
        }
      };
    } catch (error) {
      return { 
        response: { cards: [], totalCount: 0, hasMore: false },
        error: error instanceof Error ? error.message : 'Failed to fetch public cards' 
      };
    }
  },

  /**
   * Get user's private cards
   */
  async getUserCards(
    userId: string,
    filters: CardFilters = {},
    page = 1,
    limit = 50
  ): Promise<{ response: PaginatedCardsResponse; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_cards')
        .select('*', { count: 'exact' })
        .eq('creator_id', userId)
        .eq('is_public', false);

      // Apply filters
      if (filters.gameType) {
        query = query.eq('game_type', filters.gameType);
      }
      
      if (filters.difficulty && filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        return { 
          response: { cards: [], totalCount: 0, hasMore: false }, 
          error: error.message 
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          cards: (data || []) as BingoCard[],
          totalCount,
          hasMore,
        }
      };
    } catch (error) {
      return { 
        response: { cards: [], totalCount: 0, hasMore: false },
        error: error instanceof Error ? error.message : 'Failed to fetch user cards' 
      };
    }
  },

  /**
   * Create a new card
   */
  async createCard(cardData: CreateCardData): Promise<{ card: BingoCard | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_cards')
        .insert({
          title: cardData.title,
          description: cardData.description || null,
          game_type: cardData.game_type,
          difficulty: cardData.difficulty,
          tags: cardData.tags || [],
          is_public: cardData.is_public || false,
          creator_id: cardData.creator_id,
          votes: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { card: null, error: error.message };
      }

      return { card: data as BingoCard };
    } catch (error) {
      return { 
        card: null, 
        error: error instanceof Error ? error.message : 'Failed to create card' 
      };
    }
  },

  /**
   * Update an existing card
   */
  async updateCard(
    cardId: string, 
    updates: UpdateCardData
  ): Promise<{ card: BingoCard | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cardId)
        .select()
        .single();

      if (error) {
        return { card: null, error: error.message };
      }

      return { card: data as BingoCard };
    } catch (error) {
      return { 
        card: null, 
        error: error instanceof Error ? error.message : 'Failed to update card' 
      };
    }
  },

  /**
   * Delete a card
   */
  async deleteCard(cardId: string): Promise<{ error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bingo_cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete card' 
      };
    }
  },

  /**
   * Vote on a card (increment vote count)
   */
  async voteCard(cardId: string): Promise<{ card: BingoCard | null; error?: string }> {
    try {
      const supabase = createClient();
      
      // First get current vote count
      const { data: currentCard, error: fetchError } = await supabase
        .from('bingo_cards')
        .select('votes')
        .eq('id', cardId)
        .single();

      if (fetchError) {
        return { card: null, error: fetchError.message };
      }

      // Increment vote count
      const newVoteCount = (currentCard.votes || 0) + 1;

      const { data, error } = await supabase
        .from('bingo_cards')
        .update({ votes: newVoteCount })
        .eq('id', cardId)
        .select()
        .single();

      if (error) {
        return { card: null, error: error.message };
      }

      return { card: data as BingoCard };
    } catch (error) {
      return { 
        card: null, 
        error: error instanceof Error ? error.message : 'Failed to vote on card' 
      };
    }
  },

  /**
   * Bulk create cards
   */
  async createCards(cardsData: CreateCardData[]): Promise<{ cards: BingoCard[]; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_cards')
        .insert(
          cardsData.map(card => ({
            title: card.title,
            description: card.description || null,
            game_type: card.game_type,
            difficulty: card.difficulty,
            tags: card.tags || [],
            is_public: card.is_public || false,
            creator_id: card.creator_id,
            votes: 0,
            created_at: new Date().toISOString(),
          }))
        )
        .select();

      if (error) {
        return { cards: [], error: error.message };
      }

      return { cards: (data || []) as BingoCard[] };
    } catch (error) {
      return { 
        cards: [], 
        error: error instanceof Error ? error.message : 'Failed to create cards' 
      };
    }
  },
};