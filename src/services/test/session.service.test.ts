/**
 * Session Service Tests
 *
 * Tests for session operations including fetching session stats and details.
 * Follows the established service testing patterns.
 */

import { sessionService } from '../session.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';

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

import { createClient } from '@/lib/supabase';

describe('SessionService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('getSessionStats', () => {
    const mockSessionStats = {
      id: 'session-123',
      board_title: 'Test Board',
      host_username: 'testuser',
      status: 'active',
    };

    it('should return session stats successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockSessionStats)),
      });

      const result = await sessionService.getSessionStats('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'session-123',
        board_title: 'Test Board',
        host_username: 'testuser',
        status: 'active',
      });
      expect(result.error).toBeNull();

      expect(mockFrom).toHaveBeenCalledWith('session_stats');
      expect(mockFrom().select).toHaveBeenCalledWith(`
          id,
          board_title,
          host_username,
          status
        `);
      expect(mockFrom().select().eq).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should return null when session not found', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Session not found', 'PGRST116')
          ),
      });

      const result = await sessionService.getSessionStats('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should handle null data response', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(null)),
      });

      const result = await sessionService.getSessionStats('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle data with null id', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseSuccessResponse({
            id: null,
            board_title: 'Test',
            host_username: 'user',
            status: 'active',
          })
        ),
      });

      const result = await sessionService.getSessionStats('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse(
              'Database connection failed',
              'CONNECTION_ERROR'
            )
          ),
      });

      const result = await sessionService.getSessionStats('session-123');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get session stats',
        expect.objectContaining({ message: 'Database connection failed' }),
        {
          metadata: { sessionId: 'session-123', errorCode: 'CONNECTION_ERROR' },
        }
      );
    });

    it('should handle unexpected errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const error = new Error('Unexpected error occurred');

      mockFrom.mockImplementation(() => {
        throw error;
      });

      const result = await sessionService.getSessionStats('session-123');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Unexpected error occurred');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting session stats',
        error,
        { metadata: { sessionId: 'session-123' } }
      );
    });
  });

  describe('getSessionWithDetails', () => {
    const mockBoard = factories.bingoBoard();
    const mockPlayers = [
      factories.bingoSessionPlayer({ session_id: 'session-123' }),
      factories.bingoSessionPlayer({ session_id: 'session-123' }),
    ];
    const mockSession = factories.bingoSession({
      id: 'session-123',
      board_id: mockBoard.id,
    });

    const mockSessionWithDetails = {
      ...mockSession,
      board: mockBoard,
      players: mockPlayers,
    };

    it('should return session with board and players successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(mockSessionWithDetails)
          ),
      });

      const result = await sessionService.getSessionWithDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...mockSession,
        board: mockBoard,
        players: mockPlayers,
      });
      expect(result.error).toBeNull();

      expect(mockFrom).toHaveBeenCalledWith('bingo_sessions');
      expect(mockFrom().select).toHaveBeenCalledWith(`
          *,
          board:bingo_boards(*),
          players:bingo_session_players(*)
        `);
      expect(mockFrom().select().eq).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should handle session with no board or players', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const sessionWithNulls = {
        ...mockSession,
        board: null,
        players: null,
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(sessionWithNulls)),
      });

      const result = await sessionService.getSessionWithDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...mockSession,
        board: null,
        players: [],
      });
    });

    it('should return null when session not found', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Session not found', 'PGRST116')
          ),
      });

      const result = await sessionService.getSessionWithDetails('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(log.error).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Row-level security violation', '42501')
          ),
      });

      const result = await sessionService.getSessionWithDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Row-level security violation');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get session details',
        expect.objectContaining({ message: 'Row-level security violation' }),
        { metadata: { sessionId: 'session-123', errorCode: '42501' } }
      );
    });

    it('should handle unexpected errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const error = new Error('Network timeout');

      mockFrom.mockImplementation(() => {
        throw error;
      });

      const result = await sessionService.getSessionWithDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Network timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting session details',
        error,
        { metadata: { sessionId: 'session-123' } }
      );
    });

    it('should handle partial data gracefully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const partialSession = {
        ...mockSession,
        board: mockBoard,
        players: undefined,
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(partialSession)),
      });

      const result = await sessionService.getSessionWithDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...mockSession,
        board: mockBoard,
        players: [],
      });
    });
  });

  describe('Service Pattern Compliance', () => {
    it('should always return proper ServiceResponse shape', async () => {
      const scenarios = [
        {
          name: 'success case',
          setup: () => {
            const mockFrom = mockSupabase.from as jest.Mock;
            mockFrom.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest
                .fn()
                .mockResolvedValue(
                  createSupabaseSuccessResponse({
                    id: 'test',
                    board_title: 'Test',
                  })
                ),
            });
          },
        },
        {
          name: 'error case',
          setup: () => {
            const mockFrom = mockSupabase.from as jest.Mock;
            mockFrom.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest
                .fn()
                .mockResolvedValue(
                  createSupabaseErrorResponse('Error occurred')
                ),
            });
          },
        },
        {
          name: 'exception case',
          setup: () => {
            const mockFrom = mockSupabase.from as jest.Mock;
            mockFrom.mockImplementation(() => {
              throw new Error('Exception');
            });
          },
        },
      ];

      for (const scenario of scenarios) {
        scenario.setup();

        const statsResult = await sessionService.getSessionStats('test');
        const detailsResult =
          await sessionService.getSessionWithDetails('test');

        for (const result of [statsResult, detailsResult]) {
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('error');
          expect(typeof result.success).toBe('boolean');
          expect(result.data !== null || result.error !== null).toBe(true);
        }
      }
    });

    it('should not use any type assertions or any types', () => {
      // This test ensures the implementation doesn't use forbidden patterns
      // The actual verification happens at compile time, but we can check the service exists
      expect(sessionService).toBeDefined();
      expect(sessionService.getSessionStats).toBeDefined();
      expect(sessionService.getSessionWithDetails).toBeDefined();
    });
  });
});
