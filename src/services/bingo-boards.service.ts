/**
 * Bingo Boards Service
 * 
 * Pure functions for bingo boards operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { BingoBoard, GameCategory, DifficultyLevel } from '@/types';
import type { BoardCell } from '@/types/database-core';

export interface CreateBoardData {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: DifficultyLevel;
  size?: number;
  tags?: string[];
  is_public?: boolean;
  creator_id: string;
}

export interface UpdateBoardData {
  title?: string;
  description?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  is_public?: boolean;
  board_state?: BoardCell[];
  version?: number;
}

export interface BoardFilters {
  gameType?: GameCategory;
  difficulty?: DifficultyLevel | 'all';
  search?: string;
  isPublic?: boolean;
  creatorId?: string;
}

export interface PaginatedBoardsResponse {
  boards: BingoBoard[];
  totalCount: number;
  hasMore: boolean;
}

export const bingoBoardsService = {
  /**
   * Get board by ID
   */
  async getBoardById(boardId: string): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      return { board: data as BingoBoard };
    } catch (error) {
      return { 
        board: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch board' 
      };
    }
  },

  /**
   * Get public boards with filtering and pagination
   */
  async getPublicBoards(
    filters: BoardFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ response: PaginatedBoardsResponse; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_boards')
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
          response: { boards: [], totalCount: 0, hasMore: false }, 
          error: error.message 
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          boards: (data || []) as BingoBoard[],
          totalCount,
          hasMore,
        }
      };
    } catch (error) {
      return { 
        response: { boards: [], totalCount: 0, hasMore: false },
        error: error instanceof Error ? error.message : 'Failed to fetch public boards' 
      };
    }
  },

  /**
   * Get user's boards
   */
  async getUserBoards(
    userId: string,
    filters: BoardFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ response: PaginatedBoardsResponse; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_boards')
        .select('*', { count: 'exact' })
        .eq('creator_id', userId);

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

      if (typeof filters.isPublic === 'boolean') {
        query = query.eq('is_public', filters.isPublic);
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(start, end);

      if (error) {
        return { 
          response: { boards: [], totalCount: 0, hasMore: false }, 
          error: error.message 
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          boards: (data || []) as BingoBoard[],
          totalCount,
          hasMore,
        }
      };
    } catch (error) {
      return { 
        response: { boards: [], totalCount: 0, hasMore: false },
        error: error instanceof Error ? error.message : 'Failed to fetch user boards' 
      };
    }
  },

  /**
   * Create a new board
   */
  async createBoard(boardData: CreateBoardData): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();
      const gridSize = boardData.size || 5;
      const totalCells = gridSize * gridSize;

      // Create empty board state
      const emptyBoardState: BoardCell[] = Array.from({ length: totalCells }, () => ({
        cell_id: null,
        text: null,
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: false,
        version: 1,
        last_updated: Date.now(),
        last_modified_by: boardData.creator_id,
      }));

      const { data, error } = await supabase
        .from('bingo_boards')
        .insert({
          title: boardData.title,
          description: boardData.description || null,
          game_type: boardData.game_type,
          difficulty: boardData.difficulty,
          size: gridSize,
          tags: boardData.tags || [],
          is_public: boardData.is_public || false,
          creator_id: boardData.creator_id,
          board_state: emptyBoardState,
          votes: 0,
          version: 1,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      return { board: data as BingoBoard };
    } catch (error) {
      return { 
        board: null, 
        error: error instanceof Error ? error.message : 'Failed to create board' 
      };
    }
  },

  /**
   * Update an existing board
   */
  async updateBoard(
    boardId: string, 
    updates: UpdateBoardData,
    currentVersion?: number
  ): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();
      
      let query = supabase
        .from('bingo_boards')
        .update({
          ...updates,
          version: (updates.version || currentVersion || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boardId);

      // Optimistic concurrency control
      if (currentVersion !== undefined) {
        query = query.eq('version', currentVersion);
      }

      const { data, error } = await query.select().single();

      if (error) {
        // Handle version conflict
        if (error.code === 'PGRST116') {
          return { 
            board: null, 
            error: 'Board was modified by another user. Please refresh and try again.' 
          };
        }
        return { board: null, error: error.message };
      }

      return { board: data as BingoBoard };
    } catch (error) {
      return { 
        board: null, 
        error: error instanceof Error ? error.message : 'Failed to update board' 
      };
    }
  },

  /**
   * Delete a board
   */
  async deleteBoard(boardId: string): Promise<{ error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bingo_boards')
        .delete()
        .eq('id', boardId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete board' 
      };
    }
  },

  /**
   * Vote on a board (increment vote count)
   */
  async voteBoard(boardId: string): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();
      
      // First get current vote count
      const { data: currentBoard, error: fetchError } = await supabase
        .from('bingo_boards')
        .select('votes')
        .eq('id', boardId)
        .single();

      if (fetchError) {
        return { board: null, error: fetchError.message };
      }

      // Increment vote count
      const newVoteCount = (currentBoard.votes || 0) + 1;

      const { data, error } = await supabase
        .from('bingo_boards')
        .update({ votes: newVoteCount })
        .eq('id', boardId)
        .select()
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      return { board: data as BingoBoard };
    } catch (error) {
      return { 
        board: null, 
        error: error instanceof Error ? error.message : 'Failed to vote on board' 
      };
    }
  },

  /**
   * Clone/duplicate a board
   */
  async cloneBoard(
    boardId: string, 
    userId: string, 
    newTitle?: string
  ): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();
      
      // First get the original board
      const { data: originalBoard, error: fetchError } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (fetchError) {
        return { board: null, error: fetchError.message };
      }

      // Create new board with same structure
      const { data, error } = await supabase
        .from('bingo_boards')
        .insert({
          title: newTitle || `${originalBoard.title} (Copy)`,
          description: originalBoard.description,
          game_type: originalBoard.game_type,
          difficulty: originalBoard.difficulty,
          size: originalBoard.size,
          tags: originalBoard.tags || [],
          is_public: false, // Cloned boards are private by default
          creator_id: userId,
          board_state: originalBoard.board_state,
          votes: 0,
          version: 1,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      return { board: data as BingoBoard };
    } catch (error) {
      return { 
        board: null, 
        error: error instanceof Error ? error.message : 'Failed to clone board' 
      };
    }
  },
};