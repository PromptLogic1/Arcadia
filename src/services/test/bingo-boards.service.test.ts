/**
 * Bingo Boards Service Tests
 *
 * Tests for bingo boards operations including creating, updating,
 * fetching boards, and managing board state.
 */

import { bingoBoardsService } from '../bingo-boards.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import { cacheService } from '@/services/redis.service';
import { zBoardState, zBoardSettings } from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformBoardSettings,
} from '@/lib/validation/transforms';
import type { CreateBoardData, UpdateBoardData, BoardsQueryParams } from '../bingo-boards.service';

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
    invalidatePattern: jest.fn(),
  },
}));

// Mock validation schemas
jest.mock('@/lib/validation/schemas/bingo', () => ({
  zBoardState: {
    safeParse: jest.fn(),
  },
  zBoardSettings: {
    safeParse: jest.fn(),
  },
}));

// Mock transforms
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn(),
  transformBoardSettings: jest.fn(),
}));

import { createClient } from '@/lib/supabase';

describe('BingoBoardsService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

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
    (transformBoardState as jest.Mock).mockImplementation((data) => data);
    (transformBoardSettings as jest.Mock).mockImplementation((data) => data);
  });

  describe('createBoard', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const createData: CreateBoardData = {
      title: 'Test Board',
      description: 'A test board',
      game_type: 'All Games',
      difficulty: 'medium',
      size: 5,
      is_public: true,
    };

    it('should create a board successfully', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<typeof mockSupabase.auth>;
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
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse(newBoard)
        ),
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newBoard);
      expect(mockFrom).toHaveBeenCalledWith('bingo_boards');
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('boards:*');
    });

    it('should handle unauthenticated user', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<typeof mockSupabase.auth>;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle database errors', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<typeof mockSupabase.auth>;
      const mockFrom = mockSupabase.from as jest.Mock;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseErrorResponse('Insert failed')
        ),
      });

      const result = await bingoBoardsService.createBoard(createData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalled();
    });
  });

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
      });

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse(updatedBoard)
        ),
      });

      const result = await bingoBoardsService.updateBoard(boardId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedBoard);
      expect(cacheService.delete).toHaveBeenCalledWith(`board:${boardId}`);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('boards:*');
    });

    it('should handle board state updates', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardState = [
        { id: 'cell-1', text: 'Test', checked: false },
        { id: 'cell-2', text: 'Test 2', checked: true },
      ];

      const updateWithState: UpdateBoardData = {
        ...updateData,
        board_state: boardState,
      };

      const updatedBoard = factories.bingoBoard({
        id: boardId,
        board_state: boardState,
      });

      (zBoardState.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: boardState,
      });

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse(updatedBoard)
        ),
      });

      const result = await bingoBoardsService.updateBoard(boardId, updateWithState);

      expect(result.success).toBe(true);
      expect(zBoardState.safeParse).toHaveBeenCalledWith(boardState);
    });

    it('should handle validation errors', async () => {
      const boardState = [{ invalid: 'data' }];
      const updateWithInvalidState: UpdateBoardData = {
        ...updateData,
        board_state: boardState as any,
      };

      (zBoardState.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid board state' }] },
      });

      const result = await bingoBoardsService.updateBoard(boardId, updateWithInvalidState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board state format');
    });
  });

  describe('getBoard', () => {
    const boardId = 'board-123';

    it('should get board from cache if available', async () => {
      const cachedBoard = factories.bingoBoard({ id: boardId });
      (cacheService.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedBoard));

      const result = await bingoBoardsService.getBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedBoard);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch board from database if not cached', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      const boardWithCreator = {
        ...factories.bingoBoard({ id: boardId }),
        created_by_users: {
          id: 'user-123',
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse(boardWithCreator)
        ),
      });

      const result = await bingoBoardsService.getBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(boardWithCreator);
      expect(cacheService.set).toHaveBeenCalledWith(
        `board:${boardId}`,
        JSON.stringify(boardWithCreator),
        300 // 5 minutes TTL
      );
    });

    it('should handle board not found', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseErrorResponse('Board not found', 'PGRST116')
        ),
      });

      const result = await bingoBoardsService.getBoard(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
    });
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

      const result = await bingoBoardsService.getBoards(queryParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        boards: mockBoards,
        total: 2,
        page: 1,
        totalPages: 1,
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

      const result = await bingoBoardsService.getBoards(myBoardsParams);

      expect(result.success).toBe(true);
      expect(mockFrom().eq).toHaveBeenCalledWith('created_by', 'user-123');
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
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result = await bingoBoardsService.getBoards(searchParams);

      expect(result.success).toBe(true);
      expect(mockFrom().ilike).toHaveBeenCalledWith('title', '%test board%');
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
      expect(result.data).toBe(true);
      expect(cacheService.delete).toHaveBeenCalledWith(`board:${boardId}`);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('boards:*');
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

  describe('duplicateBoard', () => {
    const boardId = 'board-123';
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    it('should duplicate board successfully', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<typeof mockSupabase.auth>;
      const originalBoard = factories.bingoBoard({
        id: boardId,
        title: 'Original Board',
        board_state: [{ id: 'cell-1', text: 'Test', checked: false }],
      });

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock getBoard
      jest.spyOn(bingoBoardsService, 'getBoard').mockResolvedValue({
        success: true,
        data: originalBoard,
        error: null,
      });

      // Mock createBoard
      const duplicatedBoard = {
        ...originalBoard,
        id: 'new-board-id',
        title: 'Original Board (Copy)',
      };

      jest.spyOn(bingoBoardsService, 'createBoard').mockResolvedValue({
        success: true,
        data: duplicatedBoard,
        error: null,
      });

      const result = await bingoBoardsService.duplicateBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(duplicatedBoard);
      expect(bingoBoardsService.createBoard).toHaveBeenCalledWith({
        title: 'Original Board (Copy)',
        description: originalBoard.description,
        game_type: originalBoard.game_type,
        difficulty: originalBoard.difficulty,
        size: originalBoard.size,
        is_public: false, // Duplicates are private by default
      });
    });

    it('should handle board not found', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<typeof mockSupabase.auth>;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      jest.spyOn(bingoBoardsService, 'getBoard').mockResolvedValue({
        success: false,
        data: null,
        error: 'Board not found',
      });

      const result = await bingoBoardsService.duplicateBoard(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
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
          name: 'getBoard',
          method: () => bingoBoardsService.getBoard('board-123'),
        },
        {
          name: 'getBoards',
          method: () =>
            bingoBoardsService.getBoards({
              section: 'all',
              filters: {},
              page: 1,
              limit: 10,
            }),
        },
        {
          name: 'deleteBoard',
          method: () => bingoBoardsService.deleteBoard('board-123'),
        },
        {
          name: 'duplicateBoard',
          method: () => bingoBoardsService.duplicateBoard('board-123'),
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
});