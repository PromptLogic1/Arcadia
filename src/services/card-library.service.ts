/**
 * Card Library Service
 *
 * Pure functions for card library operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, TablesInsert, Enums } from '@/types/database-generated';

// Use types directly from database-generated (no duplicate exports)
type BingoCard = Tables<'bingo_cards'>;
type GameCategory = Enums<'game_category'>;
type Difficulty = Enums<'difficulty_level'>;

export interface CardLibraryFilters {
  search: string;
  difficulty: Difficulty | 'all';
  sortBy: 'popular' | 'newest' | 'rating' | 'title';
  gameType: GameCategory;
}

export interface CardLibraryPaginatedResponse {
  cards: BingoCard[];
  totalCount: number;
  hasMore: boolean;
}

export const cardLibraryService = {
  /**
   * Get public cards with filtering and pagination
   */
  async getPublicCards(
    filters: CardLibraryFilters,
    page = 1,
    limit = 50
  ): Promise<{ response: CardLibraryPaginatedResponse; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_cards')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .eq('game_type', filters.gameType);

      // Apply difficulty filter
      if (filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      // Apply search filter
      if (filters.search.trim()) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'popular':
          query = query.order('votes', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'rating':
          query = query.order('votes', { ascending: false });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
        default:
          query = query.order('votes', { ascending: false });
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query.range(start, end);

      if (error) {
        return {
          response: { cards: [], totalCount: 0, hasMore: false },
          error: error.message,
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          cards: data || [],
          totalCount,
          hasMore,
        },
      };
    } catch (error) {
      return {
        response: { cards: [], totalCount: 0, hasMore: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch public cards',
      };
    }
  },

  /**
   * Create multiple cards at once
   */
  async createBulkCards(
    cards: Omit<BingoCard, 'id' | 'created_at' | 'updated_at' | 'votes'>[]
  ): Promise<{
    cards: BingoCard[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get current user for creator_id
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { cards: [], error: 'Must be authenticated to create cards' };
      }

      const cardInserts: TablesInsert<'bingo_cards'>[] = cards.map(card => ({
        title: card.title,
        description: card.description,
        game_type: card.game_type,
        difficulty: card.difficulty,
        tags: card.tags || [],
        creator_id: user.id,
        is_public: card.is_public || false,
      }));

      const { data, error } = await supabase
        .from('bingo_cards')
        .insert(cardInserts)
        .select();

      if (error) {
        return { cards: [], error: error.message };
      }

      return { cards: data || [] };
    } catch (error) {
      return {
        cards: [],
        error:
          error instanceof Error ? error.message : 'Failed to create cards',
      };
    }
  },

  /**
   * Generate random cards from a collection
   */
  async getRandomCards(
    filters: Pick<CardLibraryFilters, 'gameType' | 'difficulty'>,
    count: number
  ): Promise<{ cards: BingoCard[]; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_cards')
        .select('*')
        .eq('is_public', true)
        .eq('game_type', filters.gameType);

      if (filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      // Get random cards using TABLESAMPLE or ORDER BY RANDOM()
      // Note: TABLESAMPLE is more efficient for large tables
      const { data, error } = await query
        .order('created_at', { ascending: false }) // Fallback ordering
        .limit(count * 3); // Get more than needed for randomization

      if (error) {
        return { cards: [], error: error.message };
      }

      // Randomize in JavaScript (for simplicity)
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return { cards: shuffled.slice(0, count) };
    } catch (error) {
      return {
        cards: [],
        error:
          error instanceof Error ? error.message : 'Failed to get random cards',
      };
    }
  },

  /**
   * Get featured card collections
   */
  async getFeaturedCollections(gameType: GameCategory): Promise<{
    collections: Array<{
      name: string;
      description: string;
      difficulty: Difficulty;
      cardCount: number;
      cards: BingoCard[];
    }>;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get top-rated cards grouped by difficulty
      const collections = await Promise.all([
        // Beginner collection
        supabase
          .from('bingo_cards')
          .select('*')
          .eq('is_public', true)
          .eq('game_type', gameType)
          .eq('difficulty', 'beginner')
          .order('votes', { ascending: false })
          .limit(25),

        // Medium collection
        supabase
          .from('bingo_cards')
          .select('*')
          .eq('is_public', true)
          .eq('game_type', gameType)
          .eq('difficulty', 'medium')
          .order('votes', { ascending: false })
          .limit(25),

        // Expert collection
        supabase
          .from('bingo_cards')
          .select('*')
          .eq('is_public', true)
          .eq('game_type', gameType)
          .eq('difficulty', 'expert')
          .order('votes', { ascending: false })
          .limit(25),
      ]);

      const result = [
        {
          name: 'Beginner Favorites',
          description: 'Easy and fun cards perfect for new players',
          difficulty: 'beginner' as Difficulty,
          cardCount: collections[0].data?.length || 0,
          cards: collections[0].data || [],
        },
        {
          name: 'Community Picks',
          description: 'Most popular medium difficulty cards',
          difficulty: 'medium' as Difficulty,
          cardCount: collections[1].data?.length || 0,
          cards: collections[1].data || [],
        },
        {
          name: 'Expert Challenge',
          description: 'Hardcore cards for experienced players',
          difficulty: 'expert' as Difficulty,
          cardCount: collections[2].data?.length || 0,
          cards: collections[2].data || [],
        },
      ].filter(collection => collection.cardCount > 0);

      return { collections: result };
    } catch (error) {
      return {
        collections: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get featured collections',
      };
    }
  },
};
