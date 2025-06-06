/**
 * Bingo Boards Service
 *
 * Pure functions for bingo boards operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from '@/types/database-generated';
// Only import what's actually used
import { validateBingoBoard } from '@/lib/validation/validators';
// Available if needed: createServiceSuccess, createServiceError, ServiceResponse
// validateBingoBoardArray, validateSupabaseResponse, validateSupabaseArrayResponse

// Type aliases for clean usage
type BoardCell = CompositeTypes<'board_cell'>;
export type BingoBoard = Tables<'bingo_boards'>;
export type BingoBoardInsert = TablesInsert<'bingo_boards'>;
export type BingoBoardUpdate = TablesUpdate<'bingo_boards'>;
export type GameCategory = Enums<'game_category'>;
export type DifficultyLevel = Enums<'difficulty_level'>;

// SAFE BOARD CONVERSION - REPLACES type assertion `} as BingoBoard`
function convertDbBoardToAppBoard(dbBoard: Tables<'bingo_boards'>): BingoBoard {
  // SAFE VALIDATION - Use proper validation instead of type assertion
  const validation = validateBingoBoard({
    ...dbBoard,
    created_at: dbBoard.created_at || new Date().toISOString(),
    updated_at: dbBoard.updated_at || new Date().toISOString(),
  });

  if (!validation.success) {
    // Fallback to original data if validation fails
    return dbBoard;
  }

  return validation.data;
}

export interface CreateBoardData {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: DifficultyLevel;
  size?: number;
  tags?: string[];
  is_public?: boolean;
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
  sortBy?: 'newest' | 'oldest' | 'popular' | 'difficulty';
}

export type BoardSection = 'all' | 'my-boards' | 'bookmarked';

export interface BoardsQueryParams {
  section: BoardSection;
  filters: BoardFilters;
  page: number;
  limit: number;
  userId?: string;
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
  async getBoardById(
    boardId: string
  ): Promise<{ board: BingoBoard | null; error?: string }> {
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

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error: error instanceof Error ? error.message : 'Failed to fetch board',
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
        return {
          response: { boards: [], totalCount: 0, hasMore: false },
          error: error.message,
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          boards: (data || []).map(convertDbBoardToAppBoard),
          totalCount,
          hasMore,
        },
      };
    } catch (error) {
      return {
        response: { boards: [], totalCount: 0, hasMore: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch public boards',
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
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
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
          error: error.message,
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          boards: (data || []).map(convertDbBoardToAppBoard),
          totalCount,
          hasMore,
        },
      };
    } catch (error) {
      return {
        response: { boards: [], totalCount: 0, hasMore: false },
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch user boards',
      };
    }
  },

  /**
   * Create a new board
   */
  async createBoard(
    boardData: CreateBoardData
  ): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();

      // Get current user for creator_id
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { board: null, error: 'Must be authenticated to create board' };
      }

      const gridSize = boardData.size || 5;
      const totalCells = gridSize * gridSize;

      // Create empty board state
      const emptyBoardState: BoardCell[] = Array.from(
        { length: totalCells },
        () => ({
          cell_id: null,
          text: null,
          colors: null,
          completed_by: null,
          blocked: false,
          is_marked: false,
          version: 1,
          last_updated: Date.now(),
          last_modified_by: user.id,
        })
      );

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
          creator_id: user.id,
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

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error ? error.message : 'Failed to create board',
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
            error:
              'Board was modified by another user. Please refresh and try again.',
          };
        }
        return { board: null, error: error.message };
      }

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error ? error.message : 'Failed to update board',
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
        error:
          error instanceof Error ? error.message : 'Failed to delete board',
      };
    }
  },

  /**
   * Vote on a board (increment vote count)
   */
  async voteBoard(
    boardId: string
  ): Promise<{ board: BingoBoard | null; error?: string }> {
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

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error ? error.message : 'Failed to vote on board',
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
          // tags: (originalBoard.tags as string[]) || [], // TODO: Add tags when board_tags table is implemented
          is_public: false, // Cloned boards are private by default
          creator_id: userId,
          board_state: originalBoard.board_state,
          votes: 0,
          version: 1,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error: error instanceof Error ? error.message : 'Failed to clone board',
      };
    }
  },

  /**
   * Update board state (for real-time game play)
   */
  async updateBoardState(
    boardId: string,
    boardState: BoardCell[],
    currentVersion?: number
  ): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('bingo_boards')
        .update({
          board_state: boardState,
          version: (currentVersion || 0) + 1,
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
            error:
              'Board was modified by another user. Please refresh and try again.',
          };
        }
        return { board: null, error: error.message };
      }

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update board state',
      };
    }
  },

  /**
   * Update board settings only (title, description, etc.)
   */
  async updateBoardSettings(
    boardId: string,
    settings: Partial<
      Pick<
        BingoBoardUpdate,
        'title' | 'description' | 'difficulty' | 'is_public'
      >
    >,
    currentVersion?: number
  ): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('bingo_boards')
        .update({
          ...settings,
          version: (currentVersion || 0) + 1,
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
            error:
              'Board was modified by another user. Please refresh and try again.',
          };
        }
        return { board: null, error: error.message };
      }

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update board settings',
      };
    }
  },

  /**
   * Get board with creator information for display
   */
  async getBoardWithCreator(boardId: string): Promise<{
    board:
      | (BingoBoard & {
          creator?: { username: string; avatar_url: string | null };
        })
      | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select(
          `
          *,
          users!bingo_boards_creator_id_fkey(
            username,
            avatar_url
          )
        `
        )
        .eq('id', boardId)
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      // Transform data to include creator information
      const board = convertDbBoardToAppBoard(data);
      const boardWithCreator = {
        ...board,
        creator: data.users
          ? {
              username: data.users.username,
              avatar_url: data.users.avatar_url,
            }
          : undefined,
      };

      return { board: boardWithCreator };
    } catch (error) {
      return {
        board: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch board with creator',
      };
    }
  },

  /**
   * Unified method to get boards by section with filters and pagination
   */
  async getBoardsBySection(
    params: BoardsQueryParams
  ): Promise<{ response: PaginatedBoardsResponse; error?: string }> {
    try {
      const supabase = createClient();
      const { section, filters, page, limit, userId } = params;

      let query = supabase.from('bingo_boards').select(
        `
          *,
          users!bingo_boards_creator_id_fkey(
            username,
            avatar_url,
            id
          )
        `,
        { count: 'exact' }
      );

      // Apply section filters
      switch (section) {
        case 'my-boards':
          if (!userId) {
            return {
              response: { boards: [], totalCount: 0, hasMore: false },
              error: 'User ID required for my-boards section',
            };
          }
          query = query.eq('creator_id', userId);
          break;
        case 'bookmarked':
          // TODO: Implement bookmarks functionality when user_bookmarks table is added
          return {
            response: { boards: [], totalCount: 0, hasMore: false },
            error: 'Bookmarks functionality not yet implemented',
          };
        case 'all':
        default:
          query = query.eq('is_public', true);
          break;
      }

      // Apply user filters
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

      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('votes', { ascending: false });
          break;
        case 'difficulty':
          query = query.order('difficulty', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query.range(start, end);

      if (error) {
        return {
          response: { boards: [], totalCount: 0, hasMore: false },
          error: error.message,
        };
      }

      const totalCount = count || 0;
      const hasMore = totalCount > end + 1;

      return {
        response: {
          boards: (data || []).map(convertDbBoardToAppBoard),
          totalCount,
          hasMore,
        },
      };
    } catch (error) {
      return {
        response: { boards: [], totalCount: 0, hasMore: false },
        error:
          error instanceof Error ? error.message : 'Failed to fetch boards',
      };
    }
  },

  /**
   * Get boards with filters (for API route)
   */
  async getBoards(params: {
    game?: GameCategory | null;
    difficulty?: DifficultyLevel | null;
    limit?: number;
    offset?: number;
  }): Promise<{ boards: (BingoBoard & { creator?: { username: string; avatar_url: string | null } })[] | null; error?: string }> {
    try {
      const supabase = createClient();
      const { game, difficulty, limit = 10, offset = 0 } = params;

      let query = supabase
        .from('bingo_boards')
        .select(
          `
          *,
          creator:creator_id(
            username,
            avatar_url
          )
        `
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (game && game !== 'All Games') {
        query = query.eq('game_type', game);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      const { data, error } = await query;

      if (error) {
        return { boards: null, error: error.message };
      }

      // Transform data to include creator information
      const boards = (data || []).map(board => {
        const convertedBoard = convertDbBoardToAppBoard(board);
        return {
          ...convertedBoard,
          creator: board.creator
            ? {
                username: board.creator.username,
                avatar_url: board.creator.avatar_url,
              }
            : undefined,
        };
      });

      return { boards };
    } catch (error) {
      return {
        boards: null,
        error: error instanceof Error ? error.message : 'Failed to fetch boards',
      };
    }
  },

  /**
   * Create a board from API route data
   */
  async createBoardFromAPI(params: {
    title: string;
    size: number;
    settings: CompositeTypes<'board_settings'>;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    is_public: boolean;
    board_state: BoardCell[];
    userId: string;
  }): Promise<{ board: BingoBoard | null; error?: string }> {
    try {
      const supabase = createClient();
      const {
        title,
        size,
        settings,
        game_type,
        difficulty,
        is_public,
        board_state,
        userId,
      } = params;

      const { data, error } = await supabase
        .from('bingo_boards')
        .insert({
          title,
          creator_id: userId,
          size,
          settings,
          game_type,
          difficulty,
          is_public,
          board_state,
          status: 'draft' as const,
          cloned_from: null,
        })
        .select()
        .single();

      if (error) {
        return { board: null, error: error.message };
      }

      return { board: convertDbBoardToAppBoard(data) };
    } catch (error) {
      return {
        board: null,
        error: error instanceof Error ? error.message : 'Failed to create board',
      };
    }
  },
};
