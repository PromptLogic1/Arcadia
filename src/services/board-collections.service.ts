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
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import {
  zBoardState,
  sessionSettingsSchema,
} from '@/lib/validation/schemas/bingo';

// Type from database
type DBBingoBoard = Database['public']['Tables']['bingo_boards']['Row'];
type BoardCell = Database['public']['CompositeTypes']['board_cell'];

// Export the board state cell type for use in components
export type BoardStateCell = BoardCell;

// Use the domain type with strongly typed board_state
import type { BingoBoardDomain } from '@/types/domains/bingo';
export type BoardCollection = BingoBoardDomain;

// Transform database board to domain board
const _transformDbBoardToDomain = (
  board: DBBingoBoard
): BingoBoardDomain | null => {
  const boardStateParseResult = zBoardState.safeParse(board.board_state);
  const settingsParseResult = sessionSettingsSchema.safeParse(board.settings);

  if (!boardStateParseResult.success || !settingsParseResult.success) {
    log.error(
      'Failed to parse board state or settings from DB',
      new Error('Board data parsing failed'),
      {
        metadata: {
          boardId: board.id,
          boardStateError: boardStateParseResult.success
            ? undefined
            : boardStateParseResult.error,
          settingsError: settingsParseResult.success
            ? undefined
            : settingsParseResult.error,
        },
      }
    );
    return null;
  }

  return {
    ...board,
    board_state: boardStateParseResult.data,
    settings: settingsParseResult.data,
    updated_at: board.updated_at || null,
  };
};

export interface BoardCollectionFilters {
  search: string;
  difficulty: Difficulty | 'all';
  sortBy: 'newest' | 'popular' | 'trending' | 'bookmarks';
  gameType: GameCategory;
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
  ): Promise<ServiceResponse<BoardCollection[]>> {
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
        log.error('Failed to load board collections', error, {
          metadata: {
            service: 'boardCollections',
            method: 'getCollections',
            filters,
          },
        });
        return createServiceError(error.message);
      }

      // Validate the data with Zod schema
      const transformedBoards = (data || [])
        .map(_transformDbBoardToDomain)
        .filter((b): b is BingoBoardDomain => b !== null);

      return createServiceSuccess(transformedBoards);
    } catch (error) {
      log.error(
        'Unexpected error loading board collections',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'boardCollections',
            method: 'getCollections',
            filters,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get a single board collection by ID
   */
  async getCollection(
    collectionId: string
  ): Promise<ServiceResponse<BoardCollection | null>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', collectionId)
        .eq('is_public', true)
        .single();

      if (error) {
        // Handle not found gracefully
        if (error.code === 'PGRST116') {
          return createServiceSuccess(null);
        }

        log.error('Failed to load board collection', error, {
          metadata: {
            service: 'boardCollections',
            method: 'getCollection',
            collectionId,
          },
        });
        return createServiceError(error.message);
      }

      if (!data) {
        return createServiceSuccess(null);
      }

      // Validate the data with Zod schema
      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData) {
        return createServiceError('Invalid board collection data format');
      }

      return createServiceSuccess(transformedData);
    } catch (error) {
      log.error(
        'Unexpected error loading board collection',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'boardCollections',
            method: 'getCollection',
            collectionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
