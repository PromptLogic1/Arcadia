/**
 * @jest-environment node
 */

/**
 * Bingo Boards Service Tests
 *
 * Comprehensive test suite for bingo boards operations including:
 * - Board CRUD operations
 * - Caching strategies
 * - Validation and transformation
 * - Error handling
 * - Pagination and filtering
 * - Board state management
 * - Voting and cloning functionality
 */

import { bingoBoardsService } from '../bingo-boards.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
  mockSupabaseUser,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import { cacheService } from '@/services/redis.service';
import { zBoardState, zBoardSettings } from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformBoardSettings,
} from '@/lib/validation/transforms';
import type {
  CreateBoardData,
  UpdateBoardData,
  BoardsQueryParams,
  GameCategory,
  DifficultyLevel,
} from '../bingo-boards.service';
import type { BoardCell } from '@/types/domains/bingo';
import { AuthError } from '@supabase/auth-js';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock createClient
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

// Mock cache service
jest.mock('@/services/redis.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidate: jest.fn(),
    invalidatePattern: jest.fn(),
    createKey: jest.fn(
      (prefix: string, ...args: any[]) => `${prefix}:${args.join(':')}`
    ),
    getOrSet: jest.fn(),
  },
}));

// Mock validation schemas with catch method
jest.mock('@/lib/validation/schemas/bingo', () => ({
  zBoardState: {
    safeParse: jest.fn(),
    catch: jest.fn(() => ({
      parse: jest.fn(data => data || []),
    })),
  },
  zBoardSettings: {
    safeParse: jest.fn(),
    catch: jest.fn(() => ({
      parse: jest.fn(
        data =>
          data || {
            team_mode: null,
            lockout: null,
            sound_enabled: null,
            win_conditions: null,
          }
      ),
    })),
  },
}));

// Mock transforms
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn(data => data),
  transformBoardSettings: jest.fn(data => data),
}));

import { createClient } from '@/lib/supabase';

describe('BingoBoardsService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const _mockUser = mockSupabaseUser({
    id: 'user-123',
    email: 'test@example.com',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);

    // Default validation behavior
    (zBoardState.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: [],
    });
    (zBoardSettings.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: {},
    });
    (transformBoardState as jest.Mock).mockImplementation(data => data);
    (transformBoardSettings as jest.Mock).mockImplementation(data => data);

    // Mock window for server-side tests
    delete (global as any).window;
  });

  describe('createBoard', () => {
    const mockUser = mockSupabaseUser({
      id: 'user-123',
      email: 'test@example.com',
    });
    const createData: CreateBoardData = {
      title: 'Test Board',
      description: 'A test board',
      game_type: 'All Games',
      difficulty: 'medium',
      size: 5,
      is_public: true,
    };

    it('should create a board successfully', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockFrom = mockSupabase.from as jest.Mock;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newBoard = factories.bingoBoard({
        title: createData.title,
        description: createData.description,
        game_type: createData.game_type,
        difficulty: createData.difficulty,
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newBoard)),
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        title: createData.title,
        description: createData.description,
        game_type: createData.game_type,
        difficulty: createData.difficulty,
      });
      expect(mockFrom).toHaveBeenCalledWith('bingo_boards');
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        `user-boards:*"userId":"${mockUser.id}"*`
      );
    });

    it('should handle unauthenticated user', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockSupabaseUser() },
        error: null,
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Must be authenticated to create board');
    });

    it('should handle auth error', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      const authError = new AuthError('Auth service unavailable', 500, 'AUTH_ERROR');
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Must be authenticated to create board');
      expect(log.error).toHaveBeenCalledWith(
        'User authentication failed for board creation',
        authError,
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'createBoard',
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockFrom = mockSupabase.from as jest.Mock;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Insert failed')),
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  // Update updateBoard tests to fix cache invalidation
  describe('updateBoard', () => {
    const boardId = 'board-123';
    const updateData: UpdateBoardData = {
      title: 'Updated Title',
      description: 'Updated description',
    };

    it('should update board successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const updatedBoard = factories.bingoBoard({
        id: boardId,
        title: updateData.title,
        description: updateData.description,
        creator_id: 'user-123',
      });

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedBoard)),
      });

      const result = await bingoBoardsService.updateBoard(boardId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: boardId,
        title: updateData.title,
        description: updateData.description,
        creator_id: 'user-123',
      });
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        `bingo-board:${boardId}`
      );
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'public-boards:*'
      );
    });

    it('should handle board state updates', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardState = [
        {
          cell_id: 'cell-1',
          text: 'Test',
          colors: null,
          completed_by: null,
          blocked: null,
          is_marked: false,
          version: null,
          last_updated: null,
          last_modified_by: null,
        },
        {
          cell_id: 'cell-2',
          text: 'Test 2',
          colors: null,
          completed_by: null,
          blocked: null,
          is_marked: true,
          version: null,
          last_updated: null,
          last_modified_by: null,
        },
      ];

      const updateWithState: UpdateBoardData = {
        ...updateData,
        board_state: boardState,
      };

      const updatedBoard = factories.bingoBoard({
        id: boardId,
        board_state: boardState,
        creator_id: 'user-123',
      });

      (zBoardState.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: boardState,
      });

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedBoard)),
      });

      const result = await bingoBoardsService.updateBoard(
        boardId,
        updateWithState
      );

      expect(result.success).toBe(true);
    });

    it('should handle validation errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Update failed')),
      });

      const result = await bingoBoardsService.updateBoard(boardId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('getBoard (deprecated)', () => {
    // These tests are skipped as getBoard is no longer a method
    // Functionality has been moved to getBoardById
    it.skip('should get board from cache if available', () => {});
    it.skip('should fetch board from database if not cached', () => {});
    it.skip('should handle board not found', () => {});
  });

  describe('getBoards', () => {
    const queryParams: BoardsQueryParams = {
      section: 'all',
      filters: {
        gameType: 'All Games',
        difficulty: 'medium',
        isPublic: true,
      },
      page: 1,
      limit: 10,
      userId: 'user-123',
    };

    it('should fetch boards with filters', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockBoards = [
        factories.bingoBoard({ game_type: 'All Games', difficulty: 'medium' }),
        factories.bingoBoard({ game_type: 'All Games', difficulty: 'medium' }),
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockBoards,
          error: null,
          count: 2,
        }),
      });

      const result = await bingoBoardsService.getBoardsBySection(queryParams);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        boards: expect.arrayContaining([
          expect.objectContaining({ id: mockBoards[0]?.id }),
          expect.objectContaining({ id: mockBoards[1]?.id }),
        ]),
        totalCount: 2,
        hasMore: false,
      });
    });

    it('should handle my-boards section', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const myBoardsParams: BoardsQueryParams = {
        ...queryParams,
        section: 'my-boards',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result =
        await bingoBoardsService.getBoardsBySection(myBoardsParams);

      expect(result.success).toBe(true);
      expect(mockFrom().eq).toHaveBeenCalledWith('creator_id', 'user-123');
    });

    it('should handle search filter', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const searchParams: BoardsQueryParams = {
        ...queryParams,
        filters: {
          ...queryParams.filters,
          search: 'test board',
        },
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result = await bingoBoardsService.getBoardsBySection(searchParams);

      expect(result.success).toBe(true);
      expect(mockFrom().or).toHaveBeenCalledWith(
        'title.ilike.%test board%,description.ilike.%test board%'
      );
    });
  });

  describe('deleteBoard', () => {
    const boardId = 'board-123';

    it('should delete board successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await bingoBoardsService.deleteBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(cacheService.invalidate).toHaveBeenCalledWith(
        `bingo-board:${boardId}`
      );
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'public-boards:*'
      );
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'user-boards:*'
      );
    });

    it('should handle delete errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: new Error('Delete failed'),
        }),
      });

      const result = await bingoBoardsService.deleteBoard(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('cloneBoard', () => {
    const boardId = 'board-123';
    const userId = 'user-456';

    it('should clone board successfully', async () => {
      const originalBoard = factories.bingoBoard({
        id: boardId,
        title: 'Original Board',
        board_state: [{ cell_id: '1', text: 'Test' }],
      });
      const clonedBoard = {
        ...originalBoard,
        id: 'cloned-board-id',
        title: 'Original Board (Copy)',
        creator_id: userId,
        is_public: false,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      // First call for fetching original board
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(originalBoard)),
      });

      // Second call for inserting cloned board
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(clonedBoard)),
      });

      const result = await bingoBoardsService.cloneBoard(boardId, userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          id: 'cloned-board-id',
          title: 'Original Board (Copy)',
          creator_id: userId,
          is_public: false,
        })
      );
    });

    it('should clone board with custom title', async () => {
      const originalBoard = factories.bingoBoard({ id: boardId });
      const customTitle = 'My Custom Clone';
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(originalBoard)),
      });

      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({
            ...originalBoard,
            id: 'new-id',
            title: customTitle,
          })
        ),
      });

      const result = await bingoBoardsService.cloneBoard(
        boardId,
        userId,
        customTitle
      );

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe(customTitle);
    });

    it('should handle board not found error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Board not found')),
      });

      const result = await bingoBoardsService.cloneBoard(boardId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should handle clone insertion error', async () => {
      const originalBoard = factories.bingoBoard({ id: boardId });
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(originalBoard)),
      });

      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Insert failed')),
      });

      const result = await bingoBoardsService.cloneBoard(boardId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });

    it('should handle transformation failure on cloned board', async () => {
      const originalBoard = factories.bingoBoard({ id: boardId });
      const mockFrom = mockSupabase.from as jest.Mock;

      // First call for fetching original board
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(originalBoard)),
      });

      // Second call for inserting cloned board
      const clonedBoard = {
        ...originalBoard,
        id: 'cloned-id',
        title: `${originalBoard.title} (Copy)`,
        creator_id: userId,
      };
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(clonedBoard)),
      });

      // Mock transformation to fail
      (zBoardState.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(() => {
          throw new Error('Invalid board state');
        }),
      });

      const result = await bingoBoardsService.cloneBoard(boardId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to transform cloned board');
    });
  });

  describe('Service Pattern Compliance', () => {
    it('should always return proper ServiceResponse shape', async () => {
      const scenarios = [
        {
          name: 'createBoard',
          method: () =>
            bingoBoardsService.createBoard({
              title: 'Test',
              game_type: 'All Games',
              difficulty: 'easy',
            }),
        },
        {
          name: 'updateBoard',
          method: () =>
            bingoBoardsService.updateBoard('board-123', { title: 'Updated' }),
        },
        {
          name: 'getBoardById',
          method: () => bingoBoardsService.getBoardById('board-123'),
        },
        {
          name: 'getPublicBoards',
          method: () => bingoBoardsService.getPublicBoards(),
        },
        {
          name: 'getUserBoards',
          method: () => bingoBoardsService.getUserBoards('user-123'),
        },
        {
          name: 'deleteBoard',
          method: () => bingoBoardsService.deleteBoard('board-123'),
        },
        {
          name: 'cloneBoard',
          method: () => bingoBoardsService.cloneBoard('board-123', 'user-123'),
        },
        {
          name: 'voteBoard',
          method: () => bingoBoardsService.voteBoard('board-123'),
        },
        {
          name: 'updateBoardState',
          method: () => bingoBoardsService.updateBoardState('board-123', []),
        },
        {
          name: 'getBoardWithCreator',
          method: () => bingoBoardsService.getBoardWithCreator('board-123'),
        },
        {
          name: 'getBoardsBySection',
          method: () =>
            bingoBoardsService.getBoardsBySection({
              section: 'all',
              filters: {},
              page: 1,
              limit: 10,
            }),
        },
        {
          name: 'getBoards',
          method: () => bingoBoardsService.getBoards({}),
        },
        {
          name: 'createBoardFromAPI',
          method: () =>
            bingoBoardsService.createBoardFromAPI({
              title: 'API Board',
              size: 5,
              settings: {},
              game_type: 'All Games',
              difficulty: 'easy',
              is_public: true,
              board_state: [],
              userId: 'user-123',
            }),
        },
      ];

      for (const scenario of scenarios) {
        const result = await scenario.method();

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('error');
        expect(typeof result.success).toBe('boolean');
        expect(result.data !== null || result.error !== null).toBe(true);
      }
    });
  });

  describe('getBoardById', () => {
    const boardId = 'board-123';

    it('should fetch board successfully from database', async () => {
      const mockBoard = factories.bingoBoard({ id: boardId });
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockBoard)),
      });

      // Mock cache service to simulate no cache
      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getBoardById(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: boardId,
      });
    });

    it('should return cached board when available', async () => {
      const cachedBoard = factories.bingoBoard({ id: boardId });

      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        success: true,
        data: cachedBoard,
      });

      const result = await bingoBoardsService.getBoardById(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedBoard);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle board not found error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Board not found', 'PGRST116')
          ),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          try {
            const result = await fetchFn();
            return result;
          } catch (error) {
            return { success: false, error: (error as Error).message };
          }
        }
      );

      const result = await bingoBoardsService.getBoardById(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should handle invalid board data transformation', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const invalidBoard = { id: boardId, board_state: 'invalid' };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(invalidBoard)),
      });

      // Mock transformation to fail
      (zBoardState.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(() => {
          throw new Error('Invalid board state');
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          try {
            const result = await fetchFn();
            return result;
          } catch (error) {
            return { success: false, error: (error as Error).message };
          }
        }
      );

      const result = await bingoBoardsService.getBoardById(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board data format in database.');
    });

    it('should handle cache operation failure', async () => {
      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Cache operation failed',
      });

      const result = await bingoBoardsService.getBoardById(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache operation failed');
    });

    it('should fetch directly on client-side without caching', async () => {
      // Simulate client-side environment
      (global as any).window = {};

      const mockBoard = factories.bingoBoard({ id: boardId });
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock the full chain with proper return values
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockResolvedValue(createSupabaseSuccessResponse(mockBoard));

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Ensure board transformation works
      (zBoardState.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(data => data || []),
      });
      (zBoardSettings.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(
          data =>
            data || {
              team_mode: null,
              lockout: null,
              sound_enabled: null,
              win_conditions: null,
            }
        ),
      });
      (transformBoardState as jest.Mock).mockImplementation(data => data);
      (transformBoardSettings as jest.Mock).mockImplementation(data => data);

      const result = await bingoBoardsService.getBoardById(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ id: boardId });
      expect(cacheService.getOrSet).not.toHaveBeenCalled();

      delete (global as any).window;
    });
  });

  describe('getPublicBoards', () => {
    it('should fetch public boards with pagination', async () => {
      const mockBoards = [
        factories.bingoBoard({ is_public: true }),
        factories.bingoBoard({ is_public: true }),
      ];
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock the full query chain properly
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockBoards,
        error: null,
        count: 10,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      // Ensure board transformation works correctly
      (zBoardState.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(data => data || []),
      });
      (zBoardSettings.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(
          data =>
            data || {
              team_mode: null,
              lockout: null,
              sound_enabled: null,
              win_conditions: null,
            }
        ),
      });
      (transformBoardState as jest.Mock).mockImplementation(data => data);
      (transformBoardSettings as jest.Mock).mockImplementation(data => data);

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getPublicBoards({}, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        boards: expect.any(Array),
        totalCount: 10,
        hasMore: false,
      });
      expect(result.data?.boards).toHaveLength(2);
    });

    it('should skip difficulty filter when set to all', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      await bingoBoardsService.getPublicBoards({ difficulty: 'all' }, 1, 20);

      // Should only call eq for is_public, not for difficulty
      const eqCalls = (mockFrom().eq as jest.Mock).mock.calls;
      expect(eqCalls).toHaveLength(1);
      expect(eqCalls[0]).toEqual(['is_public', true]);
    });

    it('should handle error with debug logging in non-production', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.assign(process.env, { NODE_ENV: 'development' });

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getPublicBoards();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.debug).toHaveBeenCalled();

      Object.assign(process.env, { NODE_ENV: originalEnv });
    });

    it('should handle error with error logging in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.assign(process.env, { NODE_ENV: 'production' });

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getPublicBoards();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();

      Object.assign(process.env, { NODE_ENV: originalEnv });
    });

    it('should apply game type filter', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const gameType: GameCategory = 'All Games';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      await bingoBoardsService.getPublicBoards({ gameType }, 1, 20);

      expect(mockFrom().eq).toHaveBeenCalledWith('game_type', gameType);
    });

    it('should apply difficulty filter', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const difficulty: DifficultyLevel = 'medium';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      await bingoBoardsService.getPublicBoards({ difficulty }, 1, 20);

      expect(mockFrom().eq).toHaveBeenCalledWith('difficulty', difficulty);
    });

    it('should apply search filter', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const search = 'test board';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      await bingoBoardsService.getPublicBoards({ search }, 1, 20);

      expect(mockFrom().or).toHaveBeenCalledWith(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    });

    it('should handle pagination correctly', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const page = 3;
      const limit = 10;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 50,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getPublicBoards({}, page, limit);

      expect(mockFrom().range).toHaveBeenCalledWith(20, 29);
      expect(result.data?.hasMore).toBe(true);
    });

    it('should filter out boards with invalid transformation', async () => {
      const mockBoards = [
        factories.bingoBoard({ id: '1', is_public: true }),
        { id: '2', invalid: true }, // Invalid board
        factories.bingoBoard({ id: '3', is_public: true }),
      ];
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockBoards,
          error: null,
          count: 3,
        }),
      });

      let callCount = 0;
      (zBoardState.catch as jest.Mock).mockReturnValue({
        parse: jest.fn().mockImplementation(data => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Invalid board');
          }
          return data || [];
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getPublicBoards();

      expect(result.success).toBe(true);
      expect(result.data?.boards).toHaveLength(2);
      expect(result.data?.boards.map(b => b.id)).toEqual(['1', '3']);
    });
  });

  describe('getUserBoards', () => {
    const userId = 'user-123';

    it('should fetch user boards with filters', async () => {
      const mockBoards = [
        factories.bingoBoard({ creator_id: userId }),
        factories.bingoBoard({ creator_id: userId }),
      ];
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockBoards,
          error: null,
          count: 2,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      const result = await bingoBoardsService.getUserBoards(userId);

      expect(result.success).toBe(true);
      expect(result.data?.boards).toHaveLength(2);
      expect(mockFrom().eq).toHaveBeenCalledWith('creator_id', userId);
    });

    it('should apply public/private filter', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      await bingoBoardsService.getUserBoards(userId, { isPublic: false });

      expect(mockFrom().eq).toHaveBeenCalledWith('is_public', false);
    });

    it('should order by updated_at descending', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      (cacheService.getOrSet as jest.Mock).mockImplementation(
        async (key, fetchFn) => {
          const data = await fetchFn();
          return { success: true, data };
        }
      );

      await bingoBoardsService.getUserBoards(userId);

      expect(mockFrom().order).toHaveBeenCalledWith('updated_at', {
        ascending: false,
      });
    });

    it('should handle cache operation failure', async () => {
      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Cache operation failed',
      });

      const result = await bingoBoardsService.getUserBoards('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache operation failed');
    });

    it('should handle empty data from cache gracefully', async () => {
      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await bingoBoardsService.getUserBoards('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        boards: [],
        totalCount: 0,
        hasMore: false,
      });
    });
  });

  describe('voteBoard', () => {
    const boardId = 'board-123';

    it('should increment vote count', async () => {
      const currentVotes = 5;
      const mockFrom = mockSupabase.from as jest.Mock;

      // First call to get current votes
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse({ votes: currentVotes })
          ),
      });

      // Second call to update votes
      const updateMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({
            ...factories.bingoBoard({ id: boardId }),
            votes: currentVotes + 1,
          })
        ),
      };
      mockFrom.mockReturnValueOnce(updateMock);

      const result = await bingoBoardsService.voteBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.votes).toBe(currentVotes + 1);
      expect(updateMock.update).toHaveBeenCalledWith({
        votes: currentVotes + 1,
      });
    });

    it('should handle board not found', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Board not found')),
      });

      const result = await bingoBoardsService.voteBoard(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });

    it('should handle null votes gracefully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse({ votes: null })),
      });

      const updateMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({
            ...factories.bingoBoard({ id: boardId }),
            votes: 1,
          })
        ),
      };
      mockFrom.mockReturnValueOnce(updateMock);

      const result = await bingoBoardsService.voteBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.votes).toBe(1);
      expect(updateMock.update).toHaveBeenCalledWith({ votes: 1 });
    });
  });

  describe('updateBoardState', () => {
    const boardId = 'board-123';
    const boardState: BoardCell[] = [
      {
        cell_id: '1',
        text: 'Updated cell',
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: true,
        version: 2,
        last_updated: Date.now(),
        last_modified_by: 'user-123',
      },
    ];

    it('should update board state successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const currentVersion = 5;

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({
            ...factories.bingoBoard({ id: boardId }),
            board_state: boardState,
            version: currentVersion + 1,
          })
        ),
      });

      const result = await bingoBoardsService.updateBoardState(
        boardId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(true);
      expect(result.data?.board_state).toEqual(boardState);
      expect(result.data?.version).toBe(currentVersion + 1);
      expect(mockFrom().update).toHaveBeenCalledWith({
        board_state: boardState,
        version: currentVersion + 1,
        updated_at: expect.any(String),
      });
    });

    it('should handle optimistic locking conflict', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const currentVersion = 5;

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('No rows returned', 'PGRST116')
          ),
      });

      const result = await bingoBoardsService.updateBoardState(
        boardId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Board was modified by another user. Please refresh and try again.'
      );
      expect(log.warn).toHaveBeenCalledWith(
        'Board state version conflict',
        expect.any(Object)
      );
    });

    it('should update without version check when version not provided', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({
            ...factories.bingoBoard({ id: boardId }),
            board_state: boardState,
          })
        ),
      });

      const result = await bingoBoardsService.updateBoardState(
        boardId,
        boardState
      );

      expect(result.success).toBe(true);
      // Should only call eq once for boardId, not for version
      const eqCalls = (mockFrom().eq as jest.Mock).mock.calls;
      expect(eqCalls).toHaveLength(1);
      expect(eqCalls[0]).toEqual(['id', boardId]);
    });
  });

  describe('getBoardWithCreator', () => {
    const boardId = 'board-123';

    it('should fetch board with creator info', async () => {
      const creatorInfo = {
        id: 'creator-123',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
      };
      const boardWithCreator = {
        ...factories.bingoBoard({ id: boardId }),
        creator: creatorInfo,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(boardWithCreator)),
      });

      const result = await bingoBoardsService.getBoardWithCreator(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.creator).toEqual(creatorInfo);
      expect(mockFrom().select).toHaveBeenCalledWith(
        '*, creator:creator_id(id, username, avatar_url)'
      );
    });

    it('should handle board without creator', async () => {
      const boardWithoutCreator = {
        ...factories.bingoBoard({ id: boardId }),
        creator: null,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(boardWithoutCreator)
          ),
      });

      const result = await bingoBoardsService.getBoardWithCreator(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.creator).toBeUndefined();
    });

    it('should handle invalid creator data', async () => {
      const boardWithInvalidCreator = {
        ...factories.bingoBoard({ id: boardId }),
        creator: { invalid: 'data' },
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(boardWithInvalidCreator)
          ),
      });

      const result = await bingoBoardsService.getBoardWithCreator(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.creator).toBeUndefined();
    });
  });

  describe('getBoardsBySection', () => {
    it('should fetch public boards for all section', async () => {
      const params: BoardsQueryParams = {
        section: 'all',
        filters: {},
        page: 1,
        limit: 10,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      await bingoBoardsService.getBoardsBySection(params);

      expect(mockFrom().eq).toHaveBeenCalledWith('is_public', true);
    });

    it('should fetch user boards for my-boards section', async () => {
      const params: BoardsQueryParams = {
        section: 'my-boards',
        filters: {},
        page: 1,
        limit: 10,
        userId: 'user-123',
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      await bingoBoardsService.getBoardsBySection(params);

      expect(mockFrom().eq).toHaveBeenCalledWith('creator_id', 'user-123');
    });

    it('should return error for my-boards without userId', async () => {
      const params: BoardsQueryParams = {
        section: 'my-boards',
        filters: {},
        page: 1,
        limit: 10,
      };

      // Need to mock from to prevent null reference errors
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result = await bingoBoardsService.getBoardsBySection(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID required for my-boards section');
    });

    it('should return error for bookmarked section', async () => {
      const params: BoardsQueryParams = {
        section: 'bookmarked',
        filters: {},
        page: 1,
        limit: 10,
      };

      // Need to mock from to prevent null reference errors
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result = await bingoBoardsService.getBoardsBySection(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bookmarks functionality not yet implemented');
    });

    it('should apply sort by newest', async () => {
      const params: BoardsQueryParams = {
        section: 'all',
        filters: { sortBy: 'newest' },
        page: 1,
        limit: 10,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      await bingoBoardsService.getBoardsBySection(params);

      expect(mockFrom().order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply sort by popular', async () => {
      const params: BoardsQueryParams = {
        section: 'all',
        filters: { sortBy: 'popular' },
        page: 1,
        limit: 10,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      await bingoBoardsService.getBoardsBySection(params);

      expect(mockFrom().order).toHaveBeenCalledWith('votes', {
        ascending: false,
      });
    });
  });

  describe('getBoards (API method)', () => {
    it('should fetch boards with API parameters', async () => {
      const params = {
        game: 'Pokemon' as GameCategory, // Use a specific game, not 'All Games'
        difficulty: 'medium' as DifficultyLevel,
        limit: 5,
        offset: 10,
      };

      const mockBoard = factories.bingoBoard();
      const mockBoards = [
        {
          ...mockBoard,
          creator: {
            username: 'user1',
            avatar_url: null,
          },
        },
      ];

      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock Zod to return proper parsed data
      (zBoardState.catch as jest.Mock).mockReturnValue({
        parse: jest.fn(data => data || []),
      });
      (zBoardSettings.catch as jest.Mock).mockReturnValue({
        parse: jest.fn(
          data =>
            data || {
              team_mode: null,
              lockout: null,
              sound_enabled: null,
              win_conditions: null,
            }
        ),
      });
      (transformBoardState as jest.Mock).mockImplementation(data => data);
      (transformBoardSettings as jest.Mock).mockImplementation(data => data);

      // Mock the query chain - note that the service calls `await query` where query is the whole chain
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => {
          return Promise.resolve(resolve({ data: mockBoards, error: null }));
        }),
      });

      const result = await bingoBoardsService.getBoards(params);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      // Note: We can't easily verify specific calls since the query chain is built dynamically
    });

    it('should handle boards with partial creator info', async () => {
      const boardId = 'board-123';
      const creatorId = 'creator-123';
      const mockBoards = [
        {
          ...factories.bingoBoard({ id: boardId, creator_id: creatorId }),
          creator: {
            username: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
            // Missing id field
          },
        },
      ];

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockBoards,
          error: null,
        }),
      });

      const result = await bingoBoardsService.getBoards({});

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.creator).toEqual({
        id: creatorId,
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });
  });

  describe('createBoardFromAPI', () => {
    it('should create board from API data', async () => {
      const params = {
        title: 'API Board',
        size: 5,
        settings: {
          team_mode: null,
          lockout: null,
          sound_enabled: null,
          win_conditions: null,
        },
        game_type: 'All Games' as GameCategory,
        difficulty: 'easy' as DifficultyLevel,
        is_public: true,
        board_state: [],
        userId: 'user-123',
      };

      const createdBoard = factories.bingoBoard({
        title: params.title,
        size: params.size,
        game_type: params.game_type,
        difficulty: params.difficulty,
        is_public: params.is_public,
        creator_id: params.userId,
      });

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(createdBoard)),
      });

      const result = await bingoBoardsService.createBoardFromAPI(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          title: params.title,
          creator_id: params.userId,
        })
      );
    });

    it('should handle insert error', async () => {
      const params = {
        title: 'API Board',
        size: 5,
        settings: {},
        game_type: 'All Games' as GameCategory,
        difficulty: 'easy' as DifficultyLevel,
        is_public: true,
        board_state: [],
        userId: 'user-123',
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Insert failed')),
      });

      const result = await bingoBoardsService.createBoardFromAPI(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });
});
