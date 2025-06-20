/**
 * Enhanced Bingo Boards Service Tests - Coverage Improvement
 *
 * Targeting specific uncovered lines to improve coverage from 20.68% to 75%+
 * Lines targeted: 40-54, 124-135, 162-405, 492-499, 539, 545-550, 559-570,
 * 603-609, 630-992, 1025-1092, 1118-1152
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
import type { BoardCell } from '@/types/domains/bingo';

// Mock all dependencies
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/services/redis.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidatePattern: jest.fn(),
    invalidate: jest.fn(),
    createKey: jest.fn(),
    getOrSet: jest.fn(),
  },
}));

jest.mock('@/lib/validation/schemas/bingo', () => ({
  zBoardState: {
    safeParse: jest.fn(),
    catch: jest.fn(),
  },
  zBoardSettings: {
    safeParse: jest.fn(),
    catch: jest.fn(),
  },
}));

jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn(),
  transformBoardSettings: jest.fn(),
}));

import { createClient } from '@/lib/supabase';

describe('BingoBoardsService - Enhanced Coverage Tests', () => {
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
    (transformBoardState as jest.Mock).mockImplementation(data => data);
    (transformBoardSettings as jest.Mock).mockImplementation(data => data);
  });

  describe('Creator Type Guard - Lines 40-54', () => {
    it('should validate creator info object correctly', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      // Mock auth for createBoard
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: mockSupabaseUser({ id: 'user-123', email: 'test@example.com' }),
        },
        error: null,
      });

      // Mock board creation
      const newBoard = factories.bingoBoard({
        title: 'Test Board',
        creator_id: 'user-123',
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newBoard)),
      });

      const result = await bingoBoardsService.createBoard({
        title: 'Test Board',
        game_type: 'All Games',
        difficulty: 'medium',
      });

      expect(result.success).toBe(true);
    });

    it('should handle invalid creator info with missing properties', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const boardWithInvalidCreator = {
        ...factories.bingoBoard({ id: 'board-123' }),
        creator: { id: 'user-123' }, // Missing username and avatar_url
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(boardWithInvalidCreator)
          ),
      });

      const result = await bingoBoardsService.getBoardWithCreator('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.creator).toBeUndefined();
    });

    it('should handle null creator info', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const boardWithNullCreator = {
        ...factories.bingoBoard({ id: 'board-123' }),
        creator: null,
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(boardWithNullCreator)
          ),
      });

      const result = await bingoBoardsService.getBoardWithCreator('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.creator).toBeUndefined();
    });
  });

  describe('Board Transformation with Fallbacks - Lines 124-135', () => {
    it('should use fallback values when Zod parsing fails', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock Zod with catch() fallback behavior
      const mockBoardStateCatch = jest.fn().mockReturnValue({
        parse: jest.fn().mockReturnValue([]),
      });
      const mockBoardSettingsCatch = jest.fn().mockReturnValue({
        parse: jest.fn().mockReturnValue({
          team_mode: null,
          lockout: null,
          sound_enabled: null,
          win_conditions: null,
        }),
      });

      (zBoardState.catch as jest.Mock).mockReturnValue(mockBoardStateCatch());
      (zBoardSettings.catch as jest.Mock).mockReturnValue(
        mockBoardSettingsCatch()
      );

      const boardWithCorruptedData = {
        ...factories.bingoBoard({ id: 'board-123' }),
        board_state: 'invalid-json',
        settings: 'invalid-json',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(boardWithCorruptedData)
          ),
      });

      const result = await bingoBoardsService.getBoardById('board-123');

      expect(result.success).toBe(true);
      expect(zBoardState.catch).toHaveBeenCalledWith([]);
      expect(zBoardSettings.catch).toHaveBeenCalledWith({
        team_mode: null,
        lockout: null,
        sound_enabled: null,
        win_conditions: null,
      });
    });

    it('should handle transformation errors in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true,
      });

      const mockFrom = mockSupabase.from as jest.Mock;

      // Force transformation to fail
      (transformBoardState as jest.Mock).mockImplementation(() => {
        throw new Error('Transformation failed');
      });

      const board = factories.bingoBoard({ id: 'board-123' });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(board)),
      });

      const result = await bingoBoardsService.getBoardById('board-123');

      expect(result.success).toBe(false);
      expect(log.debug).toHaveBeenCalledWith(
        'Unexpected board transformation error',
        expect.objectContaining({
          metadata: expect.objectContaining({
            boardId: 'board-123',
            error: 'Transformation failed',
          }),
        })
      );

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    });
  });

  describe('Server-side Caching - Lines 182-194', () => {
    beforeEach(() => {
      // Mock window to be undefined (server-side)
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });
    });

    afterEach(() => {
      // Restore window for other tests
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });
    });

    it('should use server-side caching for getBoardById', async () => {
      const board = factories.bingoBoard({ id: 'board-123' });
      (cacheService.createKey as jest.Mock).mockReturnValue('cache-key');
      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        success: true,
        data: board,
      });

      const result = await bingoBoardsService.getBoardById('board-123');

      expect(result.success).toBe(true);
      expect(cacheService.createKey).toHaveBeenCalledWith(
        'bingo-board',
        'board-123'
      );
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'cache-key',
        expect.any(Function),
        300
      );
    });

    it('should handle cache operation failures', async () => {
      (cacheService.createKey as jest.Mock).mockReturnValue('cache-key');
      (cacheService.getOrSet as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Cache operation failed',
      });

      const result = await bingoBoardsService.getBoardById('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache operation failed');
    });
  });

  describe('Clone Board Operations - Lines 630-688', () => {
    it('should clone board successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const originalBoard = factories.bingoBoard({
        id: 'original-board',
        title: 'Original Board',
        description: 'Original description',
        game_type: 'All Games',
        difficulty: 'medium',
        size: 5,
        board_state: [
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
        ] as BoardCell[],
        settings: { team_mode: false },
      });

      const clonedBoard = {
        ...originalBoard,
        id: 'cloned-board',
        title: 'Original Board (Copy)',
        is_public: false,
        creator_id: 'user-456',
      };

      // Mock fetch original board
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(originalBoard)),
      });

      // Mock insert cloned board
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(clonedBoard)),
      });

      const result = await bingoBoardsService.cloneBoard(
        'original-board',
        'user-456'
      );

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Original Board (Copy)');
      expect(result.data?.is_public).toBe(false);
      expect(result.data?.creator_id).toBe('user-456');
    });

    it('should clone board with custom title', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const originalBoard = factories.bingoBoard({
        id: 'original-board',
        title: 'Original Board',
      });

      const clonedBoard = {
        ...originalBoard,
        id: 'cloned-board',
        title: 'My Custom Title',
        creator_id: 'user-456',
      };

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
          .mockResolvedValue(createSupabaseSuccessResponse(clonedBoard)),
      });

      const result = await bingoBoardsService.cloneBoard(
        'original-board',
        'user-456',
        'My Custom Title'
      );

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('My Custom Title');
    });

    it('should handle clone fetch errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Board not found')),
      });

      const result = await bingoBoardsService.cloneBoard(
        'nonexistent-board',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch board for cloning',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'cloneBoard',
            boardId: 'nonexistent-board',
          }),
        })
      );
    });

    it('should handle clone insert errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const originalBoard = factories.bingoBoard({ id: 'original-board' });

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

      const result = await bingoBoardsService.cloneBoard(
        'original-board',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });

    it('should handle transformation failure in clone', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const originalBoard = factories.bingoBoard({ id: 'original-board' });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(originalBoard)),
      });

      const corruptedClonedBoard = { invalid: 'data' };
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(corruptedClonedBoard)
          ),
      });

      const result = await bingoBoardsService.cloneBoard(
        'original-board',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to transform cloned board');
    });
  });

  describe('Vote Board Operations - Lines 693-744', () => {
    it('should increment board vote count successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardId = 'board-123';

      // Mock fetch current vote count
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse({ votes: 5 })),
      });

      // Mock update vote count
      const updatedBoard = factories.bingoBoard({
        id: boardId,
        votes: 6,
      });

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedBoard)),
      });

      const result = await bingoBoardsService.voteBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.votes).toBe(6);
    });

    it('should handle null vote count and start from 0', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardId = 'board-123';

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse({ votes: null })),
      });

      const updatedBoard = factories.bingoBoard({
        id: boardId,
        votes: 1,
      });

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedBoard)),
      });

      const result = await bingoBoardsService.voteBoard(boardId);

      expect(result.success).toBe(true);
      expect(result.data?.votes).toBe(1);
    });

    it('should handle vote fetch errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Board not found')),
      });

      const result = await bingoBoardsService.voteBoard('nonexistent-board');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Board not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch board for voting',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'voteBoard',
            boardId: 'nonexistent-board',
          }),
        })
      );
    });

    it('should handle vote update errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse({ votes: 5 })),
      });

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Update failed')),
      });

      const result = await bingoBoardsService.voteBoard('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle invalid board data after voting', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse({ votes: 5 })),
      });

      const corruptedBoard = { invalid: 'data' };
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(corruptedBoard)),
      });

      const result = await bingoBoardsService.voteBoard('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board data format after voting');
    });
  });

  describe('Update Board State - Lines 749-821', () => {
    it('should update board state with version control', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardId = 'board-123';
      const currentVersion = 2;
      const newBoardState: BoardCell[] = [
        {
          cell_id: 'cell-1',
          text: 'Updated',
          colors: null,
          completed_by: null,
          blocked: false,
          is_marked: true,
          version: 1,
          last_updated: Date.now(),
          last_modified_by: 'user-123',
        },
      ];

      const updatedBoard = factories.bingoBoard({
        id: boardId,
        board_state: newBoardState,
        version: 3,
      });

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedBoard)),
      });

      const result = await bingoBoardsService.updateBoardState(
        boardId,
        newBoardState,
        currentVersion
      );

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(3);
    });

    it('should handle version conflicts', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

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
        'board-123',
        [],
        2
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Board was modified by another user. Please refresh and try again.'
      );
      expect(log.warn).toHaveBeenCalledWith(
        'Board state version conflict',
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'updateBoardState',
            boardId: 'board-123',
            currentVersion: 2,
            errorCode: 'PGRST116',
          }),
        })
      );
    });

    it('should handle other database errors in state update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Database error')),
      });

      const result = await bingoBoardsService.updateBoardState('board-123', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update board state',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'updateBoardState',
            boardId: 'board-123',
          }),
        })
      );
    });

    it('should handle invalid board data after state update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const corruptedBoard = { invalid: 'data' };
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(corruptedBoard)),
      });

      const result = await bingoBoardsService.updateBoardState('board-123', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board data format after state update');
    });
  });

  describe('Cache Invalidation - Lines 559-570, 603-609', () => {
    it('should invalidate caches after successful board update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardId = 'board-123';
      const updatedBoard = factories.bingoBoard({
        id: boardId,
        creator_id: 'user-456',
      });

      (cacheService.createKey as jest.Mock).mockReturnValue('cache-key');

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedBoard)),
      });

      const result = await bingoBoardsService.updateBoard(boardId, {
        title: 'Updated Title',
      });

      expect(result.success).toBe(true);
      expect(cacheService.createKey).toHaveBeenCalledWith(
        'bingo-board',
        boardId
      );
      expect(cacheService.invalidate).toHaveBeenCalledWith('cache-key');
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'public-boards:*'
      );
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'user-boards:*"userId":"user-456"*'
      );
    });

    it('should invalidate caches after successful board deletion', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const boardId = 'board-123';

      (cacheService.createKey as jest.Mock).mockReturnValue('cache-key');

      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await bingoBoardsService.deleteBoard(boardId);

      expect(result.success).toBe(true);
      expect(cacheService.createKey).toHaveBeenCalledWith(
        'bingo-board',
        boardId
      );
      expect(cacheService.invalidate).toHaveBeenCalledWith('cache-key');
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'public-boards:*'
      );
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'user-boards:*'
      );
    });
  });

  describe('Environment-aware Logging - Lines 202-204, 296-298', () => {
    it('should use debug logging in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true,
      });

      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Database error')),
      });

      const result = await bingoBoardsService.getBoardById('board-123');

      expect(result.success).toBe(false);
      expect(log.debug).toHaveBeenCalledWith(
        'Failed to get board',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'getBoardById',
            boardId: 'board-123',
          }),
        })
      );

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    });

    it('should use error logging in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
      });

      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Database error')),
      });

      const result = await bingoBoardsService.getBoardById('board-123');

      expect(result.success).toBe(false);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get board',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'bingo-boards',
            method: 'getBoardById',
            boardId: 'board-123',
          }),
        })
      );

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    });
  });

  describe('Complex Creator Info Handling - Lines 1054-1083', () => {
    it('should handle partial creator data in getBoards', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const boardWithPartialCreator = {
        ...factories.bingoBoard({ creator_id: 'user-123' }),
        creator: {
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.jpg',
          // Missing id property - should be filled from creator_id
        },
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse([boardWithPartialCreator])
          ),
      });

      const result = await bingoBoardsService.getBoards({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.creator).toEqual({
        id: 'user-123',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle null avatar_url in partial creator data', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const boardWithNullAvatar = {
        ...factories.bingoBoard({ creator_id: 'user-123' }),
        creator: {
          username: 'testuser',
          avatar_url: null,
        },
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse([boardWithNullAvatar])
          ),
      });

      const result = await bingoBoardsService.getBoards({});

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.creator?.avatar_url).toBeNull();
    });

    it('should handle missing creator properties', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const boardWithInvalidCreator = {
        ...factories.bingoBoard({ creator_id: 'user-123' }),
        creator: {
          invalid_prop: 'value',
          // Missing required properties
        },
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse([boardWithInvalidCreator])
          ),
      });

      const result = await bingoBoardsService.getBoards({});

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.creator).toBeUndefined();
    });
  });

  describe('Create Board from API - Lines 1118-1154', () => {
    it('should create board from API parameters successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const apiParams = {
        title: 'API Board',
        size: 5,
        settings: { team_mode: false },
        game_type: 'All Games' as const,
        difficulty: 'medium' as const,
        is_public: true,
        board_state: [] as BoardCell[],
        userId: 'user-123',
      };

      const createdBoard = factories.bingoBoard({
        title: apiParams.title,
        creator_id: apiParams.userId,
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(createdBoard)),
      });

      const result = await bingoBoardsService.createBoardFromAPI(apiParams);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('API Board');
      expect(transformBoardSettings).toHaveBeenCalledWith({ team_mode: false });
    });

    it('should handle database errors in API board creation', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const apiParams = {
        title: 'API Board',
        size: 5,
        settings: {},
        game_type: 'All Games' as const,
        difficulty: 'medium' as const,
        is_public: true,
        board_state: [] as BoardCell[],
        userId: 'user-123',
      };

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Insert failed')),
      });

      const result = await bingoBoardsService.createBoardFromAPI(apiParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });

    it('should handle transformation failure in API board creation', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const apiParams = {
        title: 'API Board',
        size: 5,
        settings: {},
        game_type: 'All Games' as const,
        difficulty: 'medium' as const,
        is_public: true,
        board_state: [] as BoardCell[],
        userId: 'user-123',
      };

      const corruptedBoard = { invalid: 'data' };
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(corruptedBoard)),
      });

      const result = await bingoBoardsService.createBoardFromAPI(apiParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create board from API');
    });
  });
});
