/**
 * Session Queue Service Tests
 *
 * Tests for session queue management including adding players to queue,
 * accepting/rejecting players, and queue statistics.
 */

import { sessionQueueService } from '../session-queue.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
  mockSupabaseUser,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import type {
  SessionQueueEntry,
  PlayerQueueData,
} from '../session-queue.service';

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

describe('SessionQueueService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('getSessionQueue', () => {
    const mockQueueEntries: SessionQueueEntry[] = [
      {
        id: 'entry-1',
        session_id: 'session-123',
        user_id: 'user-1',
        player_name: 'Player 1',
        color: '#06b6d4',
        team: null,
        status: 'waiting',
        requested_at: new Date().toISOString(),
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'entry-2',
        session_id: 'session-123',
        user_id: 'user-2',
        player_name: 'Player 2',
        color: '#8b5cf6',
        team: 1,
        status: 'waiting',
        requested_at: new Date().toISOString(),
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('should return queue entries successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockQueueEntries,
          error: null,
        }),
      });

      const result = await sessionQueueService.getSessionQueue('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQueueEntries);
      expect(mockFrom).toHaveBeenCalledWith('bingo_session_queue');
    });

    it('should handle empty queue', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await sessionQueueService.getSessionQueue('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Database error')),
      });

      const result = await sessionQueueService.getSessionQueue('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('addToQueue', () => {
    const mockUser = mockSupabaseUser({
      id: 'user-123',
      email: 'test@example.com',
    });
    const playerData: PlayerQueueData = {
      playerName: 'TestPlayer',
      color: '#06b6d4',
      team: 1,
    };

    it('should add player to queue successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock checking existing entry - not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      // Mock insert
      const newEntry: SessionQueueEntry = {
        id: 'new-entry',
        session_id: 'session-123',
        user_id: mockUser.id,
        player_name: playerData.playerName,
        color: playerData.color,
        team: playerData.team ?? null,
        status: 'waiting',
        requested_at: new Date().toISOString(),
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newEntry)),
      });

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newEntry);
    });

    it('should error when user not authenticated', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null } as any,
        error: null,
      });

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should error when user already in queue', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock existing entry found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest
              .fn()
              .mockResolvedValue(
                createSupabaseSuccessResponse({ id: 'existing' })
              ),
          })),
        })),
      });

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already in queue for this session');
    });
  });

  describe('updateQueueEntry', () => {
    it('should update queue entry successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const updatedEntry = {
        id: 'entry-123',
        status: 'matched' as const,
        processed_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedEntry)),
      });

      const result = await sessionQueueService.updateQueueEntry('entry-123', {
        status: 'matched',
        processed_at: updatedEntry.processed_at,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedEntry);
    });

    it('should handle update errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Update failed')),
      });

      const result = await sessionQueueService.updateQueueEntry('entry-123', {
        status: 'cancelled',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('acceptPlayer', () => {
    const mockQueueEntry: SessionQueueEntry = {
      id: 'entry-123',
      session_id: 'session-123',
      user_id: 'user-123',
      player_name: 'TestPlayer',
      color: '#06b6d4',
      team: null,
      status: 'waiting',
      requested_at: new Date().toISOString(),
      processed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should accept player successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock get queue entry
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock check session capacity
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      // Mock check color availability - not found (available)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(
              createSupabaseErrorResponse('Not found', 'PGRST116')
            ),
        })),
      });

      // Mock add player to session
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      // Mock update queue entry
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should error when session is full', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock get queue entry
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock check session capacity - full
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 12,
          error: null,
        }),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is full');
    });

    it('should error when color already taken', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock get queue entry
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock check session capacity
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      // Mock check color availability - found (not available)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(
              createSupabaseSuccessResponse({ id: 'existing-player' })
            ),
        })),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });
  });

  describe('rejectPlayer', () => {
    it('should reject player successfully', async () => {
      jest
        .spyOn(sessionQueueService, 'updateQueueEntry')
        .mockResolvedValueOnce({
          success: true,
          data: {} as SessionQueueEntry,
          error: null,
        });

      const result = await sessionQueueService.rejectPlayer('entry-123');

      expect(result.success).toBe(true);
      expect(sessionQueueService.updateQueueEntry).toHaveBeenCalledWith(
        'entry-123',
        {
          status: 'cancelled',
          processed_at: expect.any(String),
        }
      );
    });
  });

  describe('getQueueStats', () => {
    it('should calculate queue statistics correctly', async () => {
      const mockEntries: SessionQueueEntry[] = [
        { ...factories.bingoSessionQueueEntry(), status: 'waiting' },
        { ...factories.bingoSessionQueueEntry(), status: 'waiting' },
        { ...factories.bingoSessionQueueEntry(), status: 'matched' },
        { ...factories.bingoSessionQueueEntry(), status: 'cancelled' },
      ];

      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: true,
        data: mockEntries,
        error: null,
      });

      const result = await sessionQueueService.getQueueStats('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalEntries: 4,
        waitingEntries: 2,
        processingEntries: 0,
        matchedEntries: 1,
        cancelledEntries: 1,
        averageProcessingTime: 0,
        queueWaitTime: 0,
      });
    });
  });

  describe('getPlayerPosition', () => {
    it('should return correct position in queue', async () => {
      const mockEntries: SessionQueueEntry[] = [
        {
          ...factories.bingoSessionQueueEntry(),
          user_id: 'user-1',
          status: 'waiting',
          requested_at: '2024-01-01T10:00:00Z',
        },
        {
          ...factories.bingoSessionQueueEntry(),
          user_id: 'user-2',
          status: 'waiting',
          requested_at: '2024-01-01T10:05:00Z',
        },
        {
          ...factories.bingoSessionQueueEntry(),
          user_id: 'user-3',
          status: 'waiting',
          requested_at: '2024-01-01T10:10:00Z',
        },
      ];

      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: true,
        data: mockEntries,
        error: null,
      });

      const result = await sessionQueueService.getPlayerPosition(
        'user-2',
        'session-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(2); // Second position
    });

    it('should return -1 when player not in queue', async () => {
      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: true,
        data: [],
        error: null,
      });

      const result = await sessionQueueService.getPlayerPosition(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(-1);
    });
  });

  describe('isPlayerInQueue', () => {
    it('should return true when player is in queue', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockEntry = factories.bingoSessionQueueEntry();

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest
              .fn()
              .mockResolvedValue(createSupabaseSuccessResponse(mockEntry)),
          })),
        })),
      });

      const result = await sessionQueueService.isPlayerInQueue(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        inQueue: true,
        entry: mockEntry,
      });
    });

    it('should return false when player not in queue', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest
              .fn()
              .mockResolvedValue(
                createSupabaseErrorResponse('Not found', 'PGRST116')
              ),
          })),
        })),
      });

      const result = await sessionQueueService.isPlayerInQueue(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        inQueue: false,
        entry: undefined,
      });
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should cleanup expired entries successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const deletedEntries = [
        factories.bingoSessionQueueEntry(),
        factories.bingoSessionQueueEntry(),
      ];

      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: deletedEntries,
          error: null,
        }),
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    it('should handle cleanup errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Cleanup failed')),
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup failed');
    });
  });

  describe('Service Pattern Compliance', () => {
    it('should always return proper ServiceResponse shape', async () => {
      const scenarios = [
        {
          name: 'getSessionQueue',
          method: () => sessionQueueService.getSessionQueue('session-123'),
        },
        {
          name: 'addToQueue',
          method: () =>
            sessionQueueService.addToQueue('session-123', {
              playerName: 'Test',
              color: '#000',
            }),
        },
        {
          name: 'updateQueueEntry',
          method: () =>
            sessionQueueService.updateQueueEntry('entry-123', {
              status: 'matched',
            }),
        },
        {
          name: 'removeFromQueue',
          method: () => sessionQueueService.removeFromQueue('entry-123'),
        },
        {
          name: 'acceptPlayer',
          method: () =>
            sessionQueueService.acceptPlayer('entry-123', 'session-123'),
        },
        {
          name: 'rejectPlayer',
          method: () => sessionQueueService.rejectPlayer('entry-123'),
        },
        {
          name: 'cleanupExpiredEntries',
          method: () =>
            sessionQueueService.cleanupExpiredEntries('session-123'),
        },
        {
          name: 'getQueueStats',
          method: () => sessionQueueService.getQueueStats('session-123'),
        },
        {
          name: 'getPlayerPosition',
          method: () =>
            sessionQueueService.getPlayerPosition('user-123', 'session-123'),
        },
        {
          name: 'isPlayerInQueue',
          method: () =>
            sessionQueueService.isPlayerInQueue('user-123', 'session-123'),
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
