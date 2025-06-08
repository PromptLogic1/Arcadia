/**
 * Bingo Board Edit Service
 *
 * Specialized service for board editing operations.
 * Extracted from the massive useBingoBoardEdit hook.
 */

import { createClient } from '@/lib/supabase';
import type { GameCategory, Difficulty } from '@/types';
import type {
  CompositeTypes,
  TablesInsert,
  TablesUpdate,
} from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';
import { getErrorMessage } from '@/lib/error-guards';
import {
  bingoBoardSchema,
  bingoCardSchema,
  bingoCardsArraySchema,
  zBoardState,
  sessionSettingsSchema,
} from '@/lib/validation/schemas/bingo';
import type { BingoBoard, BingoCard } from '@/types';
import type { BingoBoardDomain } from '@/types/domains/bingo';

// Type alias for clean usage
type BoardCell = CompositeTypes<'board_cell'>;

// Transform database board to domain board
const _transformDbBoardToDomain = (
  board: BingoBoard
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
  };
};

export interface BoardEditData {
  title?: string;
  description?: string | null;
  difficulty?: Difficulty;
  is_public?: boolean;
  board_state?: BoardCell[];
  version?: number;
}

export interface CardInsertData {
  title: string;
  description?: string | null;
  game_type: GameCategory;
  difficulty: Difficulty;
  tags?: string[] | null;
  creator_id: string | null;
  is_public?: boolean;
}

export const bingoBoardEditService = {
  /**
   * Get board with cards for editing
   */
  async getBoardForEdit(boardId: string): Promise<
    ServiceResponse<{
      board: BingoBoardDomain;
      cards: BingoCard[];
    }>
  > {
    try {
      const supabase = createClient();

      // Get the board
      const { data: board, error: boardError } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) {
        log.error('Failed to fetch board', boardError, {
          metadata: { boardId, service: 'bingoBoardEditService' },
        });
        return createServiceError(boardError.message);
      }

      if (!board) {
        return createServiceError('Board not found');
      }

      // Validate and transform board data
      const boardValidation = bingoBoardSchema.safeParse(board);
      if (!boardValidation.success) {
        log.error('Board data validation failed', boardValidation.error, {
          metadata: { boardId, service: 'bingoBoardEditService' },
        });
        return createServiceError('Invalid board data format');
      }

      const transformedBoard = _transformDbBoardToDomain(boardValidation.data);
      if (!transformedBoard) {
        return createServiceError('Failed to transform board data');
      }

      // Get user's private cards for this board
      const { data: cards, error: cardsError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('creator_id', boardValidation.data.creator_id || '')
        .eq('game_type', boardValidation.data.game_type)
        .order('created_at', { ascending: false });

      if (cardsError) {
        log.error('Failed to fetch cards', cardsError, {
          metadata: { boardId, service: 'bingoBoardEditService' },
        });
        return createServiceError(cardsError.message);
      }

      // Validate cards data
      const cardsValidation = bingoCardsArraySchema.safeParse(cards || []);
      if (!cardsValidation.success) {
        log.error('Cards data validation failed', cardsValidation.error, {
          metadata: { boardId, service: 'bingoBoardEditService' },
        });
        return createServiceError('Invalid cards data format');
      }

      return createServiceSuccess({
        board: transformedBoard,
        cards: cardsValidation.data,
      });
    } catch (error) {
      log.error('Unexpected error in getBoardForEdit', error, {
        metadata: { boardId, service: 'bingoBoardEditService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Save multiple cards at once
   */
  async saveCards(
    cards: CardInsertData[]
  ): Promise<ServiceResponse<BingoCard[]>> {
    try {
      const supabase = createClient();
      const savedCards: BingoCard[] = [];

      for (const card of cards) {
        // Skip empty cards
        if (!card.title.trim()) continue;

        const cardInsert: TablesInsert<'bingo_cards'> = {
          title: card.title,
          description: card.description || null,
          game_type: card.game_type,
          difficulty: card.difficulty,
          tags: card.tags || [],
          creator_id: card.creator_id,
          is_public: card.is_public || false,
        };

        const { data: savedCard, error: cardError } = await supabase
          .from('bingo_cards')
          .insert(cardInsert)
          .select()
          .single();

        if (cardError) {
          log.error('Failed to save card', cardError, {
            metadata: { card: cardInsert, service: 'bingoBoardEditService' },
          });
          return createServiceError(cardError.message);
        }

        if (!savedCard) {
          return createServiceError('Failed to save card - no data returned');
        }

        // Validate saved card
        const cardValidation = bingoCardSchema.safeParse(savedCard);
        if (!cardValidation.success) {
          log.error('Saved card validation failed', cardValidation.error, {
            metadata: { savedCard, service: 'bingoBoardEditService' },
          });
          return createServiceError('Invalid saved card data format');
        }

        savedCards.push(cardValidation.data);
      }

      return createServiceSuccess(savedCards);
    } catch (error) {
      log.error('Unexpected error in saveCards', error, {
        metadata: {
          cardsCount: cards.length,
          service: 'bingoBoardEditService',
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update board with optimistic concurrency control
   */
  async updateBoard(
    boardId: string,
    updates: BoardEditData,
    currentVersion: number
  ): Promise<ServiceResponse<BingoBoardDomain>> {
    try {
      const supabase = createClient();

      const boardUpdate: TablesUpdate<'bingo_boards'> = {
        title: updates.title,
        description: updates.description,
        difficulty: updates.difficulty,
        is_public: updates.is_public,
        board_state: updates.board_state,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedBoard, error: updateError } = await supabase
        .from('bingo_boards')
        .update(boardUpdate)
        .eq('id', boardId)
        .eq('version', currentVersion) // Optimistic concurrency control
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // No rows affected
          return createServiceError(
            'Board was modified by another user. Please refresh and try again.'
          );
        }
        log.error('Failed to update board', updateError, {
          metadata: {
            boardId,
            currentVersion,
            service: 'bingoBoardEditService',
          },
        });
        return createServiceError(updateError.message);
      }

      if (!updatedBoard) {
        return createServiceError('Board update failed - no data returned');
      }

      // Validate and transform updated board
      const boardValidation = bingoBoardSchema.safeParse(updatedBoard);
      if (!boardValidation.success) {
        log.error('Updated board validation failed', boardValidation.error, {
          metadata: { updatedBoard, service: 'bingoBoardEditService' },
        });
        return createServiceError('Invalid updated board data format');
      }

      const transformedBoard = _transformDbBoardToDomain(boardValidation.data);
      if (!transformedBoard) {
        return createServiceError('Failed to transform updated board data');
      }

      return createServiceSuccess(transformedBoard);
    } catch (error) {
      log.error('Unexpected error in updateBoard', error, {
        metadata: { boardId, currentVersion, service: 'bingoBoardEditService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Create a new card for the board
   */
  async createCard(
    cardData: CardInsertData
  ): Promise<ServiceResponse<BingoCard>> {
    try {
      const supabase = createClient();

      const newCardInsert: TablesInsert<'bingo_cards'> = {
        title: cardData.title,
        description: cardData.description || null,
        game_type: cardData.game_type,
        difficulty: cardData.difficulty,
        tags: cardData.tags || [],
        creator_id: cardData.creator_id,
        is_public: cardData.is_public || false,
      };

      const { data: newCard, error } = await supabase
        .from('bingo_cards')
        .insert(newCardInsert)
        .select()
        .single();

      if (error) {
        log.error('Failed to create card', error, {
          metadata: { cardData, service: 'bingoBoardEditService' },
        });
        return createServiceError(error.message);
      }

      if (!newCard) {
        return createServiceError('Card creation failed - no data returned');
      }

      // Validate new card
      const cardValidation = bingoCardSchema.safeParse(newCard);
      if (!cardValidation.success) {
        log.error('New card validation failed', cardValidation.error, {
          metadata: { newCard, service: 'bingoBoardEditService' },
        });
        return createServiceError('Invalid new card data format');
      }

      return createServiceSuccess(cardValidation.data);
    } catch (error) {
      log.error('Unexpected error in createCard', error, {
        metadata: { cardData, service: 'bingoBoardEditService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update an existing card
   */
  async updateCard(
    cardId: string,
    updates: Partial<BingoCard>
  ): Promise<ServiceResponse<BingoCard>> {
    try {
      const supabase = createClient();

      const cardUpdate: TablesUpdate<'bingo_cards'> = {
        title: updates.title,
        description: updates.description,
        game_type: updates.game_type,
        difficulty: updates.difficulty,
        tags: updates.tags,
        is_public: updates.is_public,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedCard, error } = await supabase
        .from('bingo_cards')
        .update(cardUpdate)
        .eq('id', cardId)
        .select()
        .single();

      if (error) {
        log.error('Failed to update card', error, {
          metadata: { cardId, updates, service: 'bingoBoardEditService' },
        });
        return createServiceError(error.message);
      }

      if (!updatedCard) {
        return createServiceError('Card update failed - no data returned');
      }

      // Validate updated card
      const cardValidation = bingoCardSchema.safeParse(updatedCard);
      if (!cardValidation.success) {
        log.error('Updated card validation failed', cardValidation.error, {
          metadata: { updatedCard, service: 'bingoBoardEditService' },
        });
        return createServiceError('Invalid updated card data format');
      }

      return createServiceSuccess(cardValidation.data);
    } catch (error) {
      log.error('Unexpected error in updateCard', error, {
        metadata: { cardId, service: 'bingoBoardEditService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Initialize board data and convert legacy grid data
   */
  async initializeBoardData(boardId: string): Promise<
    ServiceResponse<{
      board: BingoBoard;
      gridCards: BingoCard[];
      privateCards: BingoCard[];
    }>
  > {
    try {
      const result = await this.getBoardForEdit(boardId);

      if (!result.success || !result.data) {
        return createServiceError(result.error || 'Board not found');
      }

      const { board, cards } = result.data;

      // Create grid cards from board state
      const gridSize = board.size || 5;
      const totalCells = gridSize * gridSize;

      // Initialize empty grid cards
      const gridCards: BingoCard[] = Array.from(
        { length: totalCells },
        (_, index) => ({
          id: `empty-${index}`,
          title: '',
          description: null,
          game_type: board.game_type,
          difficulty: board.difficulty,
          tags: null, // Should be null, not empty array
          creator_id: board.creator_id,
          is_public: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          votes: null,
        })
      );

      // Filter cards: those in grid vs private collection
      const privateCards = cards.filter(card => !card.title.includes('grid-'));

      return createServiceSuccess({
        board,
        gridCards,
        privateCards,
      });
    } catch (error) {
      log.error('Unexpected error in initializeBoardData', error, {
        metadata: { boardId, service: 'bingoBoardEditService' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },
};
