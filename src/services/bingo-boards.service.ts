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
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import { bingoBoardSchema, bingoBoardsArraySchema } from '@/lib/validation/schemas/bingo';
import { log } from '@/lib/logger';

// Type aliases for clean usage
type BoardCell = CompositeTypes<'board_cell'>;
export type BingoBoard = Tables<'bingo_boards'>;
export type BingoBoardInsert = TablesInsert<'bingo_boards'>;
export type BingoBoardUpdate = TablesUpdate<'bingo_boards'>;
export type GameCategory = Enums<'game_category'>;
export type DifficultyLevel = Enums<'difficulty_level'>;

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

export interface BoardWithCreator extends BingoBoard {
  creator?: { username: string; avatar_url: string | null };
}

export const bingoBoardsService = {
  /**
   * Get board by ID
   */
  async getBoardById(boardId: string): Promise<ServiceResponse<BingoBoard>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) {
        log.error('Failed to get board by ID', error, {
          metadata: { service: 'bingo-boards', method: 'getBoardById', boardId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Board validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'getBoardById', boardId },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error getting board', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'getBoardById', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get public boards with filtering and pagination
   */
  async getPublicBoards(
    filters: BoardFilters = {},
    page = 1,
    limit = 20
  ): Promise<ServiceResponse<PaginatedBoardsResponse>> {
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
        log.error('Failed to get public boards', error, {
          metadata: { service: 'bingo-boards', method: 'getPublicBoards', filters },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardsArraySchema.safeParse(data || []);
      if (!validationResult.success) {
        log.error('Boards validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'getPublicBoards' },
        });
        return createServiceError('Invalid boards data format');
      }

      return createServiceSuccess({
        boards: validationResult.data,
        totalCount: count || 0,
        hasMore: (count || 0) > end + 1,
      });
    } catch (error) {
      log.error('Unexpected error getting public boards', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'getPublicBoards', filters },
      });
      return createServiceError(getErrorMessage(error));
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
  ): Promise<ServiceResponse<PaginatedBoardsResponse>> {
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
        log.error('Failed to get user boards', error, {
          metadata: { service: 'bingo-boards', method: 'getUserBoards', userId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardsArraySchema.safeParse(data || []);
      if (!validationResult.success) {
        log.error('User boards validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'getUserBoards', userId },
        });
        return createServiceError('Invalid boards data format');
      }

      return createServiceSuccess({
        boards: validationResult.data,
        totalCount: count || 0,
        hasMore: (count || 0) > end + 1,
      });
    } catch (error) {
      log.error('Unexpected error getting user boards', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'getUserBoards', userId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Create a new board
   */
  async createBoard(boardData: CreateBoardData): Promise<ServiceResponse<BingoBoard>> {
    try {
      const supabase = createClient();

      // Get current user for creator_id
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      
      if (userError || !user) {
        log.error('User authentication failed for board creation', userError || new Error('No user'), {
          metadata: { service: 'bingo-boards', method: 'createBoard' },
        });
        return createServiceError('Must be authenticated to create board');
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
        log.error('Failed to create board', error, {
          metadata: { service: 'bingo-boards', method: 'createBoard', userId: user.id },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Created board validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'createBoard' },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error creating board', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'createBoard' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update an existing board
   */
  async updateBoard(
    boardId: string,
    updates: UpdateBoardData,
    currentVersion?: number
  ): Promise<ServiceResponse<BingoBoard>> {
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
          log.warn('Board version conflict', {
            metadata: { service: 'bingo-boards', method: 'updateBoard', boardId, currentVersion, errorCode: error.code },
          });
          return createServiceError('Board was modified by another user. Please refresh and try again.');
        }
        log.error('Failed to update board', error, {
          metadata: { service: 'bingo-boards', method: 'updateBoard', boardId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Updated board validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'updateBoard', boardId },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error updating board', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'updateBoard', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Delete a board
   */
  async deleteBoard(boardId: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bingo_boards')
        .delete()
        .eq('id', boardId);

      if (error) {
        log.error('Failed to delete board', error, {
          metadata: { service: 'bingo-boards', method: 'deleteBoard', boardId },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error('Unexpected error deleting board', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'deleteBoard', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Clone/duplicate a board
   */
  async cloneBoard(
    boardId: string,
    userId: string,
    newTitle?: string
  ): Promise<ServiceResponse<BingoBoard>> {
    try {
      const supabase = createClient();

      // First get the original board
      const { data: originalBoard, error: fetchError } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (fetchError) {
        log.error('Failed to fetch board for cloning', fetchError, {
          metadata: { service: 'bingo-boards', method: 'cloneBoard', boardId },
        });
        return createServiceError(fetchError.message);
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
        log.error('Failed to clone board', error, {
          metadata: { service: 'bingo-boards', method: 'cloneBoard', boardId, userId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Cloned board validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'cloneBoard', boardId },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error cloning board', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'cloneBoard', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Vote on a board (increment vote count)
   */
  async voteBoard(boardId: string): Promise<ServiceResponse<BingoBoard>> {
    try {
      const supabase = createClient();

      // First get current vote count
      const { data: currentBoard, error: fetchError } = await supabase
        .from('bingo_boards')
        .select('votes')
        .eq('id', boardId)
        .single();

      if (fetchError) {
        log.error('Failed to fetch board for voting', fetchError, {
          metadata: { service: 'bingo-boards', method: 'voteBoard', boardId },
        });
        return createServiceError(fetchError.message);
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
        log.error('Failed to update vote count', error, {
          metadata: { service: 'bingo-boards', method: 'voteBoard', boardId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Voted board validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'voteBoard', boardId },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error voting on board', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'voteBoard', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update board state (for real-time game play)
   */
  async updateBoardState(
    boardId: string,
    boardState: BoardCell[],
    currentVersion?: number
  ): Promise<ServiceResponse<BingoBoard>> {
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
          log.warn('Board state version conflict', {
            metadata: { service: 'bingo-boards', method: 'updateBoardState', boardId, currentVersion, errorCode: error.code },
          });
          return createServiceError('Board was modified by another user. Please refresh and try again.');
        }
        log.error('Failed to update board state', error, {
          metadata: { service: 'bingo-boards', method: 'updateBoardState', boardId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Updated board state validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'updateBoardState', boardId },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error updating board state', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'updateBoardState', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get board with creator information
   */
  async getBoardWithCreator(boardId: string): Promise<ServiceResponse<BingoBoard & {
    creator?: { username: string; avatar_url: string | null };
  }>> {
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
        log.error('Failed to get board with creator', error, {
          metadata: { service: 'bingo-boards', method: 'getBoardWithCreator', boardId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Board with creator validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'getBoardWithCreator', boardId },
        });
        return createServiceError('Invalid board data format');
      }

      const boardWithCreator = {
        ...validationResult.data,
        creator: data.users
          ? {
              username: data.users.username,
              avatar_url: data.users.avatar_url,
            }
          : undefined,
      };

      return createServiceSuccess(boardWithCreator);
    } catch (error) {
      log.error('Unexpected error getting board with creator', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'getBoardWithCreator', boardId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get boards by section with filters
   */
  async getBoardsBySection(
    params: BoardsQueryParams
  ): Promise<ServiceResponse<PaginatedBoardsResponse>> {
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
            return createServiceError('User ID required for my-boards section');
          }
          query = query.eq('creator_id', userId);
          break;
        case 'bookmarked':
          // TODO: Implement bookmarks functionality when user_bookmarks table is added
          return createServiceError('Bookmarks functionality not yet implemented');
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
        log.error('Failed to get boards by section', error, {
          metadata: { service: 'bingo-boards', method: 'getBoardsBySection', section, userId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardsArraySchema.safeParse(data || []);
      if (!validationResult.success) {
        log.error('Boards by section validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'getBoardsBySection', section },
        });
        return createServiceError('Invalid boards data format');
      }

      return createServiceSuccess({
        boards: validationResult.data,
        totalCount: count || 0,
        hasMore: (count || 0) > end + 1,
      });
    } catch (error) {
      log.error('Unexpected error getting boards by section', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'getBoardsBySection', params },
      });
      return createServiceError(getErrorMessage(error));
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
  }): Promise<ServiceResponse<BoardWithCreator[]>> {
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
        log.error('Failed to get boards', error, {
          metadata: { service: 'bingo-boards', method: 'getBoards', params },
        });
        return createServiceError(error.message);
      }

      // Transform and validate data
      const boards: BoardWithCreator[] = [];
      for (const board of data || []) {
        const validationResult = bingoBoardSchema.safeParse(board);
        if (validationResult.success) {
          boards.push({
            ...validationResult.data,
            creator: board.creator
              ? {
                  username: board.creator.username,
                  avatar_url: board.creator.avatar_url,
                }
              : undefined,
          });
        }
      }

      return createServiceSuccess(boards);
    } catch (error) {
      log.error('Unexpected error getting boards', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'getBoards', params },
      });
      return createServiceError(getErrorMessage(error));
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
  }): Promise<ServiceResponse<BingoBoard>> {
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
          tags: [],
          votes: 0,
          version: 1,
          description: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        log.error('Failed to create board from API', error, {
          metadata: { service: 'bingo-boards', method: 'createBoardFromAPI', userId },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoBoardSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Created board validation failed', validationResult.error, {
          metadata: { service: 'bingo-boards', method: 'createBoardFromAPI' },
        });
        return createServiceError('Invalid board data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error('Unexpected error creating board from API', isError(error) ? error : new Error(String(error)), {
        metadata: { service: 'bingo-boards', method: 'createBoardFromAPI' },
      });
      return createServiceError(getErrorMessage(error));
    }
  },
};