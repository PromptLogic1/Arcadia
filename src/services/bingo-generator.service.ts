/**
 * Bingo Board Generator Service
 *
 * Handles board generation logic following the established service pattern.
 * - Pure functions only (no state management)
 * - Returns ServiceResponse pattern
 * - All state managed by Zustand store
 * - Server operations handled by TanStack Query
 */

import { createClient } from '@/lib/supabase';
import type { BingoCard } from '@/types';
import type { CardCategory } from '@/features/bingo-boards/types/generator.types';
import type { Enums, Database } from '@/types/database-generated';
import { logger } from '@/lib/logger';

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

type DifficultyLevel = Enums<'difficulty_level'>;

export interface GenerateBoardParams {
  gameCategory: string;
  difficulty: DifficultyLevel;
  cardPoolSize: 'Small' | 'Medium' | 'Large';
  minVotes: number;
  selectedCategories: CardCategory[];
  cardSource: 'public' | 'private' | 'publicprivate';
  gridSize: number;
  userId?: string;
}

export interface GenerateBoardResult {
  cards: BingoCard[];
  totalAvailable: number;
}

/**
 * Pool size limits for card generation
 */
const POOL_SIZE_LIMITS = {
  Small: 50,
  Medium: 100,
  Large: 200,
} as const;

/**
 * Generate a new bingo board based on specified criteria
 */
async function generateBoard(
  params: GenerateBoardParams
): Promise<ServiceResponse<GenerateBoardResult>> {
  try {
    const supabase = createClient();

    // Build query based on parameters
    let query = supabase
      .from('bingo_cards')
      .select('*')
      .eq(
        'game_type',
        params.gameCategory as Database['public']['Enums']['game_category']
      )
      .eq('difficulty', params.difficulty);

    // Apply card source filter
    if (params.cardSource === 'public') {
      query = query.eq('is_public', true);
    } else if (params.cardSource === 'private' && params.userId) {
      query = query.eq('creator_id', params.userId);
    } else if (params.cardSource === 'publicprivate' && params.userId) {
      query = query.or(`is_public.eq.true,creator_id.eq.${params.userId}`);
    }

    // Apply minimum votes filter if specified
    if (params.minVotes > 0) {
      // Note: votes column doesn't exist in current schema
      // This would need to be implemented with a votes table
      logger.warn(
        'Minimum votes filter not implemented - votes column missing',
        {
          component: 'BingoGeneratorService',
          metadata: { minVotes: params.minVotes },
        }
      );
    }

    // Apply category filter if categories are selected
    if (params.selectedCategories.length > 0) {
      // Note: tags/categories not in current schema
      logger.warn('Category filter not implemented - tags column missing', {
        component: 'BingoGeneratorService',
        metadata: { categories: params.selectedCategories },
      });
    }

    // Limit results based on pool size
    const limit = POOL_SIZE_LIMITS[params.cardPoolSize];
    query = query.limit(limit);

    const { data: cards, error } = await query;

    if (error) {
      logger.error('Failed to fetch cards for generation', error, {
        component: 'BingoGeneratorService',
        metadata: { params },
      });
      return {
        data: null,
        error: error.message,
      };
    }

    if (!cards || cards.length < params.gridSize) {
      return {
        data: null,
        error: `Not enough cards available. Found ${cards?.length || 0} cards but need ${params.gridSize}`,
      };
    }

    // Shuffle and select cards for the grid
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, params.gridSize);

    logger.info('Board generated successfully', {
      component: 'BingoGeneratorService',
      metadata: {
        totalAvailable: cards.length,
        selected: selectedCards.length,
        params,
      },
    });

    return {
      data: {
        cards: selectedCards,
        totalAvailable: cards.length,
      },
      error: null,
    };
  } catch (error) {
    logger.error('Error generating board', error as Error, {
      component: 'BingoGeneratorService',
      metadata: { params },
    });

    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Failed to generate board',
    };
  }
}

/**
 * Reshuffle an existing set of cards
 */
async function reshuffleCards(
  cards: BingoCard[],
  gridSize: number
): Promise<ServiceResponse<BingoCard[]>> {
  try {
    if (cards.length < gridSize) {
      return {
        data: null,
        error: `Not enough cards to reshuffle. Have ${cards.length} but need ${gridSize}`,
      };
    }

    // Create a new shuffled array
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const reshuffled = shuffled.slice(0, gridSize);

    logger.info('Cards reshuffled successfully', {
      component: 'BingoGeneratorService',
      metadata: {
        totalCards: cards.length,
        gridSize,
      },
    });

    return {
      data: reshuffled,
      error: null,
    };
  } catch (error) {
    logger.error('Error reshuffling cards', error as Error, {
      component: 'BingoGeneratorService',
      metadata: {
        cardCount: cards.length,
        gridSize,
      },
    });

    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Failed to reshuffle cards',
    };
  }
}

/**
 * Validate generation parameters
 */
function validateGenerationParams(params: GenerateBoardParams): string | null {
  if (!params.gameCategory) {
    return 'Game category is required';
  }

  if (!params.difficulty) {
    return 'Difficulty level is required';
  }

  if (params.gridSize < 9 || params.gridSize > 49) {
    return 'Grid size must be between 9 and 49';
  }

  if (params.cardSource === 'private' && !params.userId) {
    return 'User ID is required for private cards';
  }

  return null;
}

export const bingoGeneratorService = {
  generateBoard,
  reshuffleCards,
  validateGenerationParams,
  POOL_SIZE_LIMITS,
};
