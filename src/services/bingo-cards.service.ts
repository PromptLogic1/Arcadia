/**
 * Bingo Cards Service
 *
 * Pure functions for bingo cards operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, Enums } from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';
import { getErrorMessage } from '@/lib/error-guards';
import {
  bingoCardSchema,
  bingoCardsArraySchema,
} from '@/lib/validation/schemas/bingo';

// Use types directly from database-generated (no duplicate exports)
type BingoCard = Tables<'bingo_cards'>;
type GameCategory = Enums<'game_category'>;
type DifficultyLevel = Enums<'difficulty_level'>;

export interface CreateCardData {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: DifficultyLevel;
  tags?: string[];
  is_public?: boolean;
  creator_id: string | null;
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
  async getCardsByIds(
    cardIds: string[]
  ): Promise<ServiceResponse<BingoCard[]>> {
    try {
      const validIds = cardIds.filter(id => id && id !== '');

      if (validIds.length === 0) {
        return createServiceSuccess([]);
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .in('id', validIds);

      if (error) {
        log.error('Failed to fetch cards by IDs', error, {
          metadata: { cardIds: validIds, service: 'bingoCardsService' },
        });
        return createServiceError(error.message);
      }

      // Validate the returned data
      const validation = bingoCardsArraySchema.safeParse(data || []);
      if (!validation.success) {
        log.error('Cards data validation failed', validation.error, {
          metadata: { cardIds: validIds, service: 'bingoCardsService' },
        });
        return createServiceError('Invalid cards data format');
      }

      return createServiceSuccess(validation.data);
    } catch (error) {
      log.error('Unexpected error in getCardsByIds', error, {
        metadata: { cardIds, service: 'bingoCardsService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get public cards with filtering and pagination
   */
  async getPublicCards(
    filters: CardFilters = {},
    page = 1,
    limit = 50
  ): Promise<ServiceResponse<PaginatedCardsResponse>> {
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
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('votes', { ascending: false })
        .range(start, end);

      if (error) {
        log.error('Failed to fetch public cards', error, {
          metadata: { filters, page, limit, service: 'bingoCardsService' },
        });
        return createServiceError(error.message);
      }

      // Validate the returned data
      const validation = bingoCardsArraySchema.safeParse(data || []);
      if (!validation.success) {
        log.error('Public cards data validation failed', validation.error, {
          metadata: { filters, page, limit, service: 'bingoCardsService' },
        });
        return createServiceError('Invalid cards data format');
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return createServiceSuccess({
        cards: validation.data,
        totalCount,
        hasMore,
      });
    } catch (error) {
      log.error('Unexpected error in getPublicCards', error, {
        metadata: { filters, page, limit, service: 'bingoCardsService' },
      });
      return createServiceError(getErrorMessage(error));
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
  ): Promise<ServiceResponse<PaginatedCardsResponse>> {
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
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        log.error('Failed to fetch user cards', error, {
          metadata: {
            userId,
            filters,
            page,
            limit,
            service: 'bingoCardsService',
          },
        });
        return createServiceError(error.message);
      }

      // Validate the returned data
      const validation = bingoCardsArraySchema.safeParse(data || []);
      if (!validation.success) {
        log.error('User cards data validation failed', validation.error, {
          metadata: {
            userId,
            filters,
            page,
            limit,
            service: 'bingoCardsService',
          },
        });
        return createServiceError('Invalid cards data format');
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return createServiceSuccess({
        cards: validation.data,
        totalCount,
        hasMore,
      });
    } catch (error) {
      log.error('Unexpected error in getUserCards', error, {
        metadata: {
          userId,
          filters,
          page,
          limit,
          service: 'bingoCardsService',
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Create a new card
   */
  async createCard(
    cardData: CreateCardData
  ): Promise<ServiceResponse<BingoCard>> {
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
        log.error('Failed to create card', error, {
          metadata: { cardData, service: 'bingoCardsService' },
        });
        return createServiceError(error.message);
      }

      if (!data) {
        return createServiceError('Card creation failed - no data returned');
      }

      // Validate the returned data
      const validation = bingoCardSchema.safeParse(data);
      if (!validation.success) {
        log.error('Created card data validation failed', validation.error, {
          metadata: { data, service: 'bingoCardsService' },
        });
        return createServiceError('Invalid card data format');
      }

      return createServiceSuccess(validation.data);
    } catch (error) {
      log.error('Unexpected error in createCard', error, {
        metadata: { cardData, service: 'bingoCardsService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update an existing card
   */
  async updateCard(
    cardId: string,
    updates: UpdateCardData
  ): Promise<ServiceResponse<BingoCard>> {
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
        log.error('Failed to update card', error, {
          metadata: { cardId, updates, service: 'bingoCardsService' },
        });
        return createServiceError(error.message);
      }

      if (!data) {
        return createServiceError('Card update failed - no data returned');
      }

      // Validate the returned data
      const validation = bingoCardSchema.safeParse(data);
      if (!validation.success) {
        log.error('Updated card data validation failed', validation.error, {
          metadata: { data, service: 'bingoCardsService' },
        });
        return createServiceError('Invalid card data format');
      }

      return createServiceSuccess(validation.data);
    } catch (error) {
      log.error('Unexpected error in updateCard', error, {
        metadata: { cardId, updates, service: 'bingoCardsService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Delete a card
   */
  async deleteCard(cardId: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bingo_cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        log.error('Failed to delete card', error, {
          metadata: { cardId, service: 'bingoCardsService' },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error('Unexpected error in deleteCard', error, {
        metadata: { cardId, service: 'bingoCardsService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Vote on a card (increment vote count)
   */
  async voteCard(cardId: string): Promise<ServiceResponse<BingoCard>> {
    try {
      const supabase = createClient();

      // First get current vote count
      const { data: currentCard, error: fetchError } = await supabase
        .from('bingo_cards')
        .select('votes')
        .eq('id', cardId)
        .single();

      if (fetchError) {
        log.error('Failed to fetch card for voting', fetchError, {
          metadata: { cardId, service: 'bingoCardsService' },
        });
        return createServiceError(fetchError.message);
      }

      if (!currentCard) {
        return createServiceError('Card not found');
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
        log.error('Failed to update vote count', error, {
          metadata: { cardId, newVoteCount, service: 'bingoCardsService' },
        });
        return createServiceError(error.message);
      }

      if (!data) {
        return createServiceError('Vote update failed - no data returned');
      }

      // Validate the returned data
      const validation = bingoCardSchema.safeParse(data);
      if (!validation.success) {
        log.error('Voted card data validation failed', validation.error, {
          metadata: { data, service: 'bingoCardsService' },
        });
        return createServiceError('Invalid card data format');
      }

      return createServiceSuccess(validation.data);
    } catch (error) {
      log.error('Unexpected error in voteCard', error, {
        metadata: { cardId, service: 'bingoCardsService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Bulk create cards
   */
  async createCards(
    cardsData: CreateCardData[]
  ): Promise<ServiceResponse<BingoCard[]>> {
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
        log.error('Failed to bulk create cards', error, {
          metadata: {
            cardsCount: cardsData.length,
            service: 'bingoCardsService',
          },
        });
        return createServiceError(error.message);
      }

      // Validate the returned data
      const validation = bingoCardsArraySchema.safeParse(data || []);
      if (!validation.success) {
        log.error(
          'Bulk created cards data validation failed',
          validation.error,
          {
            metadata: {
              cardsCount: cardsData.length,
              service: 'bingoCardsService',
            },
          }
        );
        return createServiceError('Invalid cards data format');
      }

      return createServiceSuccess(validation.data);
    } catch (error) {
      log.error('Unexpected error in createCards', error, {
        metadata: {
          cardsCount: cardsData.length,
          service: 'bingoCardsService',
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },
};
