/**
 * Board Collections Service
 *
 * Service layer for fetching public bingo boards that can be used as card collections/templates.
 * Follows the TanStack Query + Zustand + Service Layer pattern.
 */

import { createClient } from '../lib/supabase';
import { log } from '../lib/logger';
import type { GameCategory, Difficulty } from '../types';
import type { Database } from '../../types/database-generated';

// Type from database
type DBBingoBoard = Database['public']['Tables']['bingo_boards']['Row'];
type BoardCell = Database['public']['CompositeTypes']['board_cell'];

// Export the board state cell type for use in components
export type BoardStateCell = BoardCell;

// Use the database type directly
export type BoardCollection = DBBingoBoard;

export interface BoardCollectionFilters {
  search: string;
  difficulty: Difficulty | 'all';
  sortBy: 'newest' | 'popular' | 'trending' | 'bookmarks';
  gameType: GameCategory;
}

export interface BoardCollectionsResponse {
  collections: BoardCollection[];
  error?: string;
}

/**
 * Board Collections Service
 */
export const boardCollectionsService = {
  /**
   * Fetch public board collections based on filters
   */
  async getCollections(
    filters: BoardCollectionFilters
  ): Promise<BoardCollectionsResponse> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_boards')
        .select('*')
        .eq('is_public', true)
        .eq('game_type', filters.gameType)
        .not('board_state', 'is', null); // Only boards with actual card content

      // Apply difficulty filter
      if (filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('votes', { ascending: false });
          break;
        case 'bookmarks':
          query = query.order('bookmarked_count', { ascending: false });
          break;
        case 'trending':
          // For trending, combine votes and recent activity
          query = query.order('votes', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(50);

      if (error) {
        throw error;
      }

      return {
        collections: (data as BoardCollection[]) || [],
        error: undefined,
      };
    } catch (error) {
      log.error('Failed to load board collections', error as Error, {
        metadata: {
          service: 'boardCollections',
          method: 'getCollections',
          filters,
        },
      });
      return {
        collections: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load board collections',
      };
    }
  },

  /**
   * Get a single board collection by ID
   */
  async getCollection(
    collectionId: string
  ): Promise<{ collection: BoardCollection | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', collectionId)
        .eq('is_public', true)
        .single();

      if (error) {
        throw error;
      }

      return {
        collection: data as BoardCollection | null,
        error: undefined,
      };
    } catch (error) {
      log.error('Failed to load board collection', error as Error, {
        metadata: {
          service: 'boardCollections',
          method: 'getCollection',
          collectionId,
        },
      });
      return {
        collection: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load board collection',
      };
    }
  },
};
