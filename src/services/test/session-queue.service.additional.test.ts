/**
 * @jest-environment jsdom
 *
 * Additional Tests for Session Queue Service - Coverage Enhancement
 *
 * Focuses on uncovered branches and error paths:
 * - Auth error handling in addToQueue
 * - Database error scenarios in acceptPlayer
 * - Error propagation in rejectPlayer
 * - Edge cases in stats calculations
 * - Cleanup failure scenarios
 */

import { sessionQueueService } from '../session-queue.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
  mockSupabaseUser,
} from '@/lib/test/mocks/supabase.mock';
import { AuthError } from '@supabase/auth-js';
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

describe('SessionQueueService - Additional Coverage', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('addToQueue - Auth Error Paths', () => {
    const playerData: PlayerQueueData = {
      playerName: 'TestPlayer',
      color: '#06b6d4',
      team: 1,
    };

    it('handles auth.getUser() error', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new AuthError('Auth session expired', 401),
      });

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('handles null user from auth', async () => {
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

    it('handles database error when checking existing entry', async () => {
      const mockUser = mockSupabaseUser({
        id: 'user-123',
        email: 'test@example.com',
      });
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockFrom = mockSupabase.from as jest.Mock;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock database error when checking existing entry
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest
              .fn()
              .mockResolvedValue(
                createSupabaseErrorResponse('Database connection failed')
              ),
          })),
        })),
      });

      await sessionQueueService.addToQueue('session-123', playerData);

      // Should continue despite error checking existing entry
      expect(mockFrom).toHaveBeenCalledWith('bingo_session_queue');
    });

    it('handles insert operation failure', async () => {
      const mockUser = mockSupabaseUser({
        id: 'user-123',
        email: 'test@example.com',
      });
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockFrom = mockSupabase.from as jest.Mock;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock successful existing entry check (no existing entry)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });

      // Mock insert failure
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Insert failed', 'INSERT_ERROR')
          ),
      });

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to add to queue',
        expect.objectContaining({ message: 'Insert failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'addToQueue',
            sessionId: 'session-123',
            userId: 'user-123',
          }),
        })
      );
    });

    it('handles unexpected errors in try-catch', async () => {
      // Mock auth to throw an unexpected error
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      mockAuth.getUser.mockRejectedValue(
        new TypeError('Cannot read properties of undefined')
      );

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot read properties of undefined');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error adding to queue',
        expect.any(TypeError),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'addToQueue',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles non-Error exceptions', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      mockAuth.getUser.mockImplementation(() => {
        throw 'String error';
      });

      const result = await sessionQueueService.addToQueue(
        'session-123',
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('acceptPlayer - Database Error Scenarios', () => {
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

    it('handles queue entry not found error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock queue entry not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Entry not found', code: 'PGRST116' },
        }),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue entry not found');
    });

    it('handles database error when fetching queue entry', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock database error when fetching queue entry
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse(
              'Connection timeout',
              'CONNECTION_ERROR'
            )
          ),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue entry not found');
    });

    it('handles error when checking session capacity', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock successful queue entry fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock error when checking session capacity
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Count query failed', code: 'QUERY_ERROR' },
        }),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check session capacity');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check session capacity',
        expect.objectContaining({ message: 'Count query failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'acceptPlayer',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles error when checking color availability (non-PGRST116)', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock successful queue entry fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock successful capacity check
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      // Mock database error when checking color (not PGRST116)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: 'DB_ERROR' },
          }),
        })),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check color availability');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check color availability',
        expect.objectContaining({ message: 'Database error' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'acceptPlayer',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles error when adding player to session', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock successful queue entry fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock successful capacity check
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      // Mock color available (PGRST116 = not found = available)
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

      // Mock error when adding player to session
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Insert player failed', code: 'INSERT_ERROR' },
        }),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert player failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to add player to session',
        expect.objectContaining({ message: 'Insert player failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'acceptPlayer',
            sessionId: 'session-123',
            userId: 'user-123',
          }),
        })
      );
    });

    it('handles error when updating queue entry status', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock successful queue entry fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockQueueEntry)),
      });

      // Mock successful capacity check
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      // Mock color available
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

      // Mock successful player insert
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      // Mock error when updating queue entry
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed', code: 'UPDATE_ERROR' },
        }),
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update queue entry status',
        expect.objectContaining({ message: 'Update failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'acceptPlayer',
            entryId: 'entry-123',
          }),
        })
      );
    });

    it('handles unexpected errors in try-catch', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock an unexpected error
      mockFrom.mockImplementation(() => {
        throw new ReferenceError('Variable is not defined');
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variable is not defined');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error accepting player',
        expect.any(ReferenceError),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'acceptPlayer',
            entryId: 'entry-123',
            sessionId: 'session-123',
          }),
        })
      );
    });
  });

  describe('rejectPlayer - Error Propagation', () => {
    it('propagates updateQueueEntry errors', async () => {
      jest
        .spyOn(sessionQueueService, 'updateQueueEntry')
        .mockResolvedValueOnce({
          success: false,
          data: null,
          error: 'Update operation failed',
        });

      const result = await sessionQueueService.rejectPlayer('entry-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update operation failed');
    });

    it('handles unexpected errors in try-catch', async () => {
      jest
        .spyOn(sessionQueueService, 'updateQueueEntry')
        .mockRejectedValueOnce(new Error('Unexpected rejection error'));

      const result = await sessionQueueService.rejectPlayer('entry-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected rejection error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error rejecting player',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'rejectPlayer',
            entryId: 'entry-123',
          }),
        })
      );
    });
  });

  describe('getQueueStats - Error Propagation', () => {
    it('propagates getSessionQueue errors', async () => {
      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Failed to fetch queue',
      });

      const result = await sessionQueueService.getQueueStats('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch queue');
    });

    it('handles unexpected errors in try-catch', async () => {
      jest
        .spyOn(sessionQueueService, 'getSessionQueue')
        .mockImplementation(() => {
          throw new Error('Stats calculation failed');
        });

      const result = await sessionQueueService.getQueueStats('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stats calculation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting queue stats',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'getQueueStats',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles null data from getSessionQueue', async () => {
      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await sessionQueueService.getQueueStats('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalEntries: 0,
        waitingEntries: 0,
        processingEntries: 0,
        matchedEntries: 0,
        cancelledEntries: 0,
        averageProcessingTime: 0,
        queueWaitTime: 0,
      });
    });
  });

  describe('getPlayerPosition - Error Propagation', () => {
    it('propagates getSessionQueue errors', async () => {
      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Queue fetch failed',
      });

      const result = await sessionQueueService.getPlayerPosition(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue fetch failed');
    });

    it('handles unexpected errors in try-catch', async () => {
      jest
        .spyOn(sessionQueueService, 'getSessionQueue')
        .mockImplementation(() => {
          throw new Error('Position calculation failed');
        });

      const result = await sessionQueueService.getPlayerPosition(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position calculation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting player position',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'getPlayerPosition',
            userId: 'user-123',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles entries with null requested_at dates', async () => {
      const entriesWithNullDates = [
        {
          ...factories.bingoSessionQueueEntry(),
          user_id: 'user-1',
          status: 'waiting',
          requested_at: null, // Null date
        },
        {
          ...factories.bingoSessionQueueEntry(),
          user_id: 'user-2',
          status: 'waiting',
          requested_at: '2024-01-01T10:05:00Z',
        },
      ];

      jest.spyOn(sessionQueueService, 'getSessionQueue').mockResolvedValueOnce({
        success: true,
        data: entriesWithNullDates as never,
        error: null,
      });

      const result = await sessionQueueService.getPlayerPosition(
        'user-1',
        'session-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // Should still find position despite null date
    });
  });

  describe('isPlayerInQueue - Database Error Scenarios', () => {
    it('handles database error (non-PGRST116)', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'DB_ERROR' },
            }),
          })),
        })),
      });

      const result = await sessionQueueService.isPlayerInQueue(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check queue status',
        expect.objectContaining({ message: 'Database error' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'isPlayerInQueue',
            userId: 'user-123',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles unexpected errors in try-catch', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockImplementation(() => {
        throw new Error('Unexpected queue check error');
      });

      const result = await sessionQueueService.isPlayerInQueue(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected queue check error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error checking queue status',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'isPlayerInQueue',
            userId: 'user-123',
            sessionId: 'session-123',
          }),
        })
      );
    });
  });

  describe('cleanupExpiredEntries - Failure Scenarios', () => {
    it('handles cleanup database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Cleanup failed', code: 'CLEANUP_ERROR' },
        }),
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to cleanup queue',
        expect.objectContaining({ message: 'Cleanup failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'cleanupExpiredEntries',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles unexpected errors in try-catch', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockImplementation(() => {
        throw new Error('Cleanup operation failed');
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup operation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error cleaning up queue',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'cleanupExpiredEntries',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles null data response from cleanup', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0); // Should return 0 when data is null
    });
  });

  describe('removeFromQueue - Error Scenarios', () => {
    it('handles delete operation errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Delete failed', code: 'DELETE_ERROR' },
        }),
      });

      const result = await sessionQueueService.removeFromQueue('entry-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to remove from queue',
        expect.objectContaining({ message: 'Delete failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'removeFromQueue',
            entryId: 'entry-123',
          }),
        })
      );
    });

    it('handles unexpected errors in try-catch', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockImplementation(() => {
        throw new Error('Remove operation failed');
      });

      const result = await sessionQueueService.removeFromQueue('entry-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Remove operation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error removing from queue',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'removeFromQueue',
            entryId: 'entry-123',
          }),
        })
      );
    });
  });

  describe('updateQueueEntry - Error Scenarios', () => {
    it('handles update operation errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed', code: 'UPDATE_ERROR' },
        }),
      });

      const result = await sessionQueueService.updateQueueEntry('entry-123', {
        status: 'matched',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update queue entry',
        expect.objectContaining({ message: 'Update failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'updateQueueEntry',
            entryId: 'entry-123',
          }),
        })
      );
    });

    it('handles unexpected errors in try-catch', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockImplementation(() => {
        throw new Error('Update operation failed');
      });

      const result = await sessionQueueService.updateQueueEntry('entry-123', {
        status: 'cancelled',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update operation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error updating queue entry',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'updateQueueEntry',
            entryId: 'entry-123',
          }),
        })
      );
    });
  });
});
