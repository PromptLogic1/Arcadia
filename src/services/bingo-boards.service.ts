/**
 * Bingo Boards Service
 *
 * Pure functions for bingo boards operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import { cacheService } from '@/services/redis.service';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '@/types/database.types';
import type {
  BingoBoardDomain,
  BoardCell,
  GameBoardDomain,
} from '@/types/domains/bingo';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import { zBoardState, zBoardSettings } from '@/lib/validation/schemas/bingo';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Type aliases for clean usage
export type GameCategory = Enums<'game_category'>;
export type DifficultyLevel = Enums<'difficulty_level'>;

// Type guard for creator info
function isCreatorInfo(
  value: unknown
): value is { id: string; username: string; avatar_url: string | null } {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // Check properties exist
  if (!('id' in value) || !('username' in value) || !('avatar_url' in value)) {
    return false;
  }

  // Access properties through Object.getOwnPropertyDescriptor to avoid type assertions
  const idDesc = Object.getOwnPropertyDescriptor(value, 'id');
  const usernameDesc = Object.getOwnPropertyDescriptor(value, 'username');
  const avatarDesc = Object.getOwnPropertyDescriptor(value, 'avatar_url');

  return (
    idDesc !== undefined &&
    typeof idDesc.value === 'string' &&
    usernameDesc !== undefined &&
    typeof usernameDesc.value === 'string' &&
    avatarDesc !== undefined &&
    (avatarDesc.value === null || typeof avatarDesc.value === 'string')
  );
}

export interface CreateBoardData {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: DifficultyLevel;
  size?: number;
  is_public?: boolean;
}

export interface UpdateBoardData
  extends Omit<
    TablesUpdate<'bingo_boards'>,
    'board_state' | 'settings' | 'id' | 'updated_at'
  > {
  board_state?: BoardCell[];
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
  boards: GameBoardDomain[];
  totalCount: number;
  hasMore: boolean;
}

// Zod schema for validating cached paginated response
// We use z.any() for boards since they're already validated during transformation
const paginatedBoardsResponseSchema = z.object({
  boards: z.array(z.any()), // Already validated by _transformDbBoardToDomain
  totalCount: z.number(),
  hasMore: z.boolean(),
});

export interface BoardWithCreator extends GameBoardDomain {
  creator?: { id: string; username: string; avatar_url: string | null };
}

const _transformDbBoardToDomain = (
  board: Tables<'bingo_boards'>
): BingoBoardDomain | null => {
  try {
    // Use Zod's .catch() for resilient parsing with fallback values
    const boardStateWithFallback = zBoardState.catch([]);
    const settingsWithFallback = zBoardSettings.catch({
      team_mode: null,
      lockout: null,
      sound_enabled: null,
      win_conditions: null,
    });

    // Parse with fallback values - will never fail
    const boardState = boardStateWithFallback.parse(board.board_state);
    const settings = settingsWithFallback.parse(board.settings);

    return {
      ...board,
      board_state: boardState,
      settings: settings,
      updated_at: board.updated_at || null,
    };
  } catch (error) {
    // This should rarely happen now with .catch() fallbacks
    if (board?.id && process.env.NODE_ENV !== 'production') {
      log.debug('Unexpected board transformation error', {
        metadata: {
          boardId: board.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    return null;
  }
};

export const bingoBoardsService = {
  /**
   * Get board by ID
   */
  async getBoardById(
    boardId: string
  ): Promise<ServiceResponse<BingoBoardDomain | null>> {
    try {
      const fetchBoard = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('bingo_boards')
          .select('*')
          .eq('id', boardId)
          .single();

        if (error) throw error;
        if (!data) return null;

        const transformedData = _transformDbBoardToDomain(data);
        if (!transformedData) {
          throw new Error('Invalid board data format in database.');
        }
        return transformedData;
      };

      // Use caching only on server-side
      if (typeof window === 'undefined') {
        const cacheKey = cacheService.createKey('bingo-board', boardId);
        const cached = await cacheService.getOrSet(
          cacheKey,
          fetchBoard,
          300 // Cache for 5 minutes
        );

        if (!cached.success) {
          throw new Error(cached.error || 'Cache operation failed');
        }

        return createServiceSuccess(cached.data);
      }

      // Client-side: fetch directly without caching
      const data = await fetchBoard();
      return createServiceSuccess(data);
    } catch (error) {
      // Use environment-aware logging
      const logLevel =
        process.env.NODE_ENV === 'production' ? 'error' : 'debug';
      log[logLevel](
        'Failed to get board',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'bingo-boards',
            method: 'getBoardById',
            boardId,
          },
        }
      );
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
      const fetchBoards = async () => {
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

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data, error, count } = await query
          .order('votes', { ascending: false })
          .range(start, end);

        if (error) throw error;

        const transformedBoards = (data || [])
          .map(_transformDbBoardToDomain)
          .filter((b): b is BingoBoardDomain => b !== null);

        return {
          boards: transformedBoards,
          totalCount: count || 0,
          hasMore: (count || 0) > end + 1,
        };
      };

      // Use caching only on server-side
      if (typeof window === 'undefined') {
        const cacheKey = cacheService.createKey(
          'public-boards',
          JSON.stringify({ filters, page, limit })
        );

        const cached = await cacheService.getOrSet(
          cacheKey,
          fetchBoards,
          180, // Cache for 3 minutes
          paginatedBoardsResponseSchema
        );

        if (!cached.success) {
          throw new Error(cached.error || 'Cache operation failed');
        }

        return createServiceSuccess(
          cached.data || { boards: [], totalCount: 0, hasMore: false }
        );
      }

      // Client-side: fetch directly without caching
      const data = await fetchBoards();
      return createServiceSuccess(data);
    } catch (error) {
      // Use environment-aware logging
      const logLevel =
        process.env.NODE_ENV === 'production' ? 'error' : 'debug';
      log[logLevel](
        'Failed to get public boards',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'bingo-boards',
            method: 'getPublicBoards',
            filters,
          },
        }
      );
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
      const fetchUserBoards = async () => {
        const supabase = createClient();
        let query = supabase
          .from('bingo_boards')
          .select('*', { count: 'exact' })
          .eq('creator_id', userId);

        // Apply filters (same as getPublicBoards)
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

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data, error, count } = await query
          .order('updated_at', { ascending: false })
          .range(start, end);

        if (error) throw error;

        const transformedBoards = (data || [])
          .map(_transformDbBoardToDomain)
          .filter((b): b is BingoBoardDomain => b !== null);

        return {
          boards: transformedBoards,
          totalCount: count || 0,
          hasMore: (count || 0) > end + 1,
        };
      };

      // Use caching only on server-side
      if (typeof window === 'undefined') {
        const cacheKey = cacheService.createKey(
          'user-boards',
          JSON.stringify({ userId, filters, page, limit })
        );

        const cached = await cacheService.getOrSet(
          cacheKey,
          fetchUserBoards,
          240, // Cache for 4 minutes
          paginatedBoardsResponseSchema
        );

        if (!cached.success) {
          throw new Error(cached.error || 'Cache operation failed');
        }

        return createServiceSuccess(
          cached.data || { boards: [], totalCount: 0, hasMore: false }
        );
      }

      // Client-side: fetch directly without caching
      const data = await fetchUserBoards();
      return createServiceSuccess(data);
    } catch (error) {
      log.error(
        'Unexpected error getting user boards',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'bingo-boards',
            method: 'getUserBoards',
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Create a new board
   */
  async createBoard(
    boardData: CreateBoardData
  ): Promise<ServiceResponse<BingoBoardDomain>> {
    try {
      const supabase = createClient();

      // Get current user for creator_id
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        log.error(
          'User authentication failed for board creation',
          userError || new Error('No user'),
          {
            metadata: { service: 'bingo-boards', method: 'createBoard' },
          }
        );
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

      const insertData: TablesInsert<'bingo_boards'> = {
        title: boardData.title,
        description: boardData.description || null,
        game_type: boardData.game_type,
        difficulty: boardData.difficulty,
        size: gridSize,
        is_public: boardData.is_public || false,
        creator_id: user.id,
        board_state: emptyBoardState,
        votes: 0,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('bingo_boards')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        log.error('Failed to create board', error, {
          metadata: {
            service: 'bingo-boards',
            method: 'createBoard',
            userId: user.id,
          },
        });
        return createServiceError(error.message);
      }

      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData) {
        return createServiceError('Failed to create and transform board');
      }

      // Invalidate relevant caches after board creation
      if (transformedData.is_public) {
        await cacheService.invalidatePattern('public-boards:*');
      }
      await cacheService.invalidatePattern(
        `user-boards:*"userId":"${user.id}"*`
      );

      return createServiceSuccess(transformedData);
    } catch (error) {
      log.error(
        'Unexpected error creating board',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'createBoard' },
        }
      );
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
  ): Promise<ServiceResponse<BingoBoardDomain>> {
    try {
      const supabase = createClient();

      const updatePayload: TablesUpdate<'bingo_boards'> = {
        ...updates,
        version: (currentVersion || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      if (updates.board_state) {
        updatePayload.board_state = updates.board_state;
      }

      let query = supabase
        .from('bingo_boards')
        .update(updatePayload)
        .eq('id', boardId);

      if (currentVersion !== undefined) {
        query = query.eq('version', currentVersion);
      }

      const { data, error } = await query.select().single();

      if (error) {
        if (error.code === 'PGRST116') {
          return createServiceError(
            'Board was modified by another user. Please refresh and try again.'
          );
        }
        throw error;
      }

      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData) {
        return createServiceError('Invalid board data on update');
      }

      // Invalidate related caches after successful update
      const boardCacheKey = cacheService.createKey('bingo-board', boardId);
      await cacheService.invalidate(boardCacheKey);

      // Invalidate public boards cache (with wildcard pattern)
      await cacheService.invalidatePattern('public-boards:*');

      // Invalidate user boards cache for the board creator
      await cacheService.invalidatePattern(
        `user-boards:*"userId":"${transformedData.creator_id}"*`
      );

      return createServiceSuccess(transformedData);
    } catch (error) {
      log.error(
        'Unexpected error updating board',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'updateBoard', boardId },
        }
      );
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

      // Invalidate related caches after successful deletion
      const boardCacheKey = cacheService.createKey('bingo-board', boardId);
      await cacheService.invalidate(boardCacheKey);

      // Invalidate public boards and user boards caches
      await cacheService.invalidatePattern('public-boards:*');
      await cacheService.invalidatePattern('user-boards:*');

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error deleting board',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'deleteBoard', boardId },
        }
      );
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
  ): Promise<ServiceResponse<BingoBoardDomain>> {
    try {
      const supabase = createClient();
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
          settings: originalBoard.settings,
        })
        .select('*')
        .single();

      if (error) {
        log.error('Failed to clone board', error, {
          metadata: {
            service: 'bingo-boards',
            method: 'cloneBoard',
            boardId,
            userId,
          },
        });
        return createServiceError(error.message);
      }

      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData) {
        return createServiceError('Failed to transform cloned board');
      }
      return createServiceSuccess(transformedData);
    } catch (error) {
      log.error(
        'Unexpected error cloning board',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'cloneBoard', boardId },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Vote on a board (increment vote count)
   */
  async voteBoard(boardId: string): Promise<ServiceResponse<BingoBoardDomain>> {
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

      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData) {
        return createServiceError('Invalid board data format after voting');
      }

      return createServiceSuccess(transformedData);
    } catch (error) {
      log.error(
        'Unexpected error voting on board',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'voteBoard', boardId },
        }
      );
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
  ): Promise<ServiceResponse<BingoBoardDomain>> {
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
            metadata: {
              service: 'bingo-boards',
              method: 'updateBoardState',
              boardId,
              currentVersion,
              errorCode: error.code,
            },
          });
          return createServiceError(
            'Board was modified by another user. Please refresh and try again.'
          );
        }
        log.error('Failed to update board state', error, {
          metadata: {
            service: 'bingo-boards',
            method: 'updateBoardState',
            boardId,
          },
        });
        return createServiceError(error.message);
      }

      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData) {
        return createServiceError(
          'Invalid board data format after state update'
        );
      }

      return createServiceSuccess(transformedData);
    } catch (error) {
      log.error(
        'Unexpected error updating board state',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'bingo-boards',
            method: 'updateBoardState',
            boardId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get board with creator information
   */
  async getBoardWithCreator(
    boardId: string
  ): Promise<ServiceResponse<BoardWithCreator | null>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('*, creator:creator_id(id, username, avatar_url)')
        .eq('id', boardId)
        .single();

      if (error) throw error;
      if (!data) return createServiceSuccess(null);

      const transformedData = _transformDbBoardToDomain(data);
      if (!transformedData)
        return createServiceError('Invalid board data format');

      const creator = data.creator;

      let creatorInfo:
        | { id: string; username: string; avatar_url: string | null }
        | undefined;
      if (isCreatorInfo(creator)) {
        creatorInfo = creator;
      }

      const result: BoardWithCreator = {
        ...transformedData,
        creator: creatorInfo,
      };

      return createServiceSuccess(result);
    } catch (error) {
      log.error(
        'Unexpected error getting board with creator',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'bingo-boards',
            method: 'getBoardWithCreator',
            boardId,
          },
        }
      );
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
          return createServiceError(
            'Bookmarks functionality not yet implemented'
          );
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
          metadata: {
            service: 'bingo-boards',
            method: 'getBoardsBySection',
            section,
            userId,
          },
        });
        return createServiceError(error.message);
      }

      const transformedBoards = (data || [])
        .map(_transformDbBoardToDomain)
        .filter((b): b is BingoBoardDomain => b !== null);

      return createServiceSuccess({
        boards: transformedBoards,
        totalCount: count || 0,
        hasMore: (count || 0) > end + 1,
      });
    } catch (error) {
      log.error(
        'Unexpected error getting boards by section',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'bingo-boards',
            method: 'getBoardsBySection',
            params,
          },
        }
      );
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
        const transformedBoard = _transformDbBoardToDomain(board);
        if (transformedBoard) {
          const creator = board.creator;
          let creatorInfo:
            | { id: string; username: string; avatar_url: string | null }
            | undefined;

          if (isCreatorInfo(creator)) {
            creatorInfo = creator;
          } else if (
            creator &&
            typeof creator === 'object' &&
            'username' in creator &&
            'avatar_url' in creator &&
            board.creator_id
          ) {
            // Fallback: construct creator info from partial data
            const usernameDesc = Object.getOwnPropertyDescriptor(
              creator,
              'username'
            );
            const avatarDesc = Object.getOwnPropertyDescriptor(
              creator,
              'avatar_url'
            );

            if (usernameDesc && typeof usernameDesc.value === 'string') {
              creatorInfo = {
                id: board.creator_id,
                username: usernameDesc.value,
                avatar_url:
                  avatarDesc &&
                  (avatarDesc.value === null ||
                    typeof avatarDesc.value === 'string')
                    ? avatarDesc.value
                    : null,
              };
            }
          }

          boards.push({
            ...transformedBoard,
            creator: creatorInfo,
          });
        }
      }

      return createServiceSuccess(boards);
    } catch (error) {
      log.error(
        'Unexpected error getting boards',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'getBoards', params },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Create a board from API route data
   */
  async createBoardFromAPI(params: {
    title: string;
    size: number;
    settings: z.infer<typeof zBoardSettings>;
    game_type: GameCategory;
    difficulty: DifficultyLevel;
    is_public: boolean;
    board_state: BoardCell[];
    userId: string;
  }): Promise<ServiceResponse<BingoBoardDomain>> {
    try {
      const supabase = createClient();
      const insertData: TablesInsert<'bingo_boards'> = {
        title: params.title,
        size: params.size,
        settings: params.settings,
        game_type: params.game_type,
        difficulty: params.difficulty,
        is_public: params.is_public,
        board_state: params.board_state,
        creator_id: params.userId,
      };

      const { data, error } = await supabase
        .from('bingo_boards')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const transformed = _transformDbBoardToDomain(data);
      if (!transformed)
        return createServiceError('Failed to create board from API');

      return createServiceSuccess(transformed);
    } catch (error) {
      log.error(
        'Unexpected error creating board from API',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'bingo-boards', method: 'createBoardFromAPI' },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
