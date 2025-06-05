/**
 * Bingo Board Edit Service
 *
 * Specialized service for board editing operations.
 * Extracted from the massive useBingoBoardEdit hook.
 */

import { createClient } from '@/lib/supabase';
import type { BingoBoard, BingoCard, GameCategory, Difficulty } from '@/types';
import type {
  CompositeTypes,
  TablesInsert,
  TablesUpdate,
} from '@/types/database-generated';

// Type alias for clean usage
type BoardCell = CompositeTypes<'board_cell'>;

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
  creator_id: string;
  is_public?: boolean;
}

export const bingoBoardEditService = {
  /**
   * Get board with cards for editing
   */
  async getBoardForEdit(boardId: string): Promise<{
    board: BingoBoard | null;
    cards: BingoCard[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get the board
      const { data: board, error: boardError } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) {
        return { board: null, cards: [], error: boardError.message };
      }

      // Get user's private cards for this board
      const { data: cards, error: cardsError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('creator_id', board.creator_id || '')
        .eq('game_type', board.game_type)
        .order('created_at', { ascending: false });

      if (cardsError) {
        return {
          board: board as BingoBoard,
          cards: [],
          error: cardsError.message,
        };
      }

      return {
        board: board as BingoBoard,
        cards: (cards || []) as BingoCard[],
      };
    } catch (error) {
      return {
        board: null,
        cards: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load board for editing',
      };
    }
  },

  /**
   * Save multiple cards at once
   */
  async saveCards(cards: CardInsertData[]): Promise<{
    savedCards: BingoCard[];
    error?: string;
  }> {
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
          return { savedCards: [], error: cardError.message };
        }

        savedCards.push(savedCard as BingoCard);
      }

      return { savedCards };
    } catch (error) {
      return {
        savedCards: [],
        error: error instanceof Error ? error.message : 'Failed to save cards',
      };
    }
  },

  /**
   * Update board with optimistic concurrency control
   */
  async updateBoard(
    boardId: string,
    updates: BoardEditData,
    currentVersion: number
  ): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();

      const boardUpdate: TablesUpdate<'bingo_boards'> = {
        title: updates.title,
        description: updates.description,
        difficulty: updates.difficulty,
        is_public: updates.is_public,
        board_state: updates.board_state,
        version: currentVersion + 1,
      };

      const { data: updatedBoard, error: updateError } = await supabase
        .from('bingo_boards')
        .update({
          ...boardUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boardId)
        .eq('version', currentVersion) // Optimistic concurrency control
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // No rows affected
          return {
            board: null,
            error:
              'Board was modified by another user. Please refresh and try again.',
          };
        }
        return { board: null, error: updateError.message };
      }

      return { board: updatedBoard as BingoBoard };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error ? error.message : 'Failed to update board',
      };
    }
  },

  /**
   * Create a new card for the board
   */
  async createCard(cardData: CardInsertData): Promise<{
    card: BingoCard | null;
    error?: string;
  }> {
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
        return { card: null, error: error.message };
      }

      return { card: newCard as BingoCard };
    } catch (error) {
      return {
        card: null,
        error: error instanceof Error ? error.message : 'Failed to create card',
      };
    }
  },

  /**
   * Update an existing card
   */
  async updateCard(
    cardId: string,
    updates: Partial<BingoCard>
  ): Promise<{ card: BingoCard | null; error?: string }> {
    try {
      const supabase = createClient();

      const { data: updatedCard, error } = await supabase
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

      return { card: updatedCard as BingoCard };
    } catch (error) {
      return {
        card: null,
        error: error instanceof Error ? error.message : 'Failed to update card',
      };
    }
  },

  /**
   * Initialize board data and convert legacy grid data
   */
  async initializeBoardData(boardId: string): Promise<{
    success: boolean;
    board?: BingoBoard;
    gridCards?: BingoCard[];
    privateCards?: BingoCard[];
    error?: string;
  }> {
    try {
      const { board, cards, error } = await this.getBoardForEdit(boardId);

      if (error || !board) {
        return { success: false, error: error || 'Board not found' };
      }

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
          tags: [],
          creator_id: board.creator_id || '',
          is_public: false,
          requirements: null,
          reward_type: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          votes: 0,
        })
      );

      // Filter cards: those in grid vs private collection
      const privateCards = cards.filter(card => !card.title.includes('grid-'));

      return {
        success: true,
        board,
        gridCards,
        privateCards,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to initialize board data',
      };
    }
  },
};
