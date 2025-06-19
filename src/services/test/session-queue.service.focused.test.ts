/**
 * @jest-environment jsdom
 *
 * Focused Tests for Session Queue Service - Coverage Enhancement
 *
 * Focuses on uncovered error handling paths with reliable mocking
 */

import { sessionQueueService } from '../session-queue.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

// Mock dependencies
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

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockLog = log as jest.Mocked<typeof log>;

describe('SessionQueueService - Focused Coverage', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      lt: jest.fn(() => mockSupabase),
      in: jest.fn(() => mockSupabase),
      single: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    };

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe('addToQueue - Auth Error Paths', () => {
    it('handles auth.getUser() error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session expired', name: 'AuthError' },
      });

      const result = await sessionQueueService.addToQueue('session-123', {
        playerName: 'TestPlayer',
        color: '#06b6d4',
        team: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('handles unexpected errors in catch block', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(
        new TypeError('Cannot read properties of undefined')
      );

      const result = await sessionQueueService.addToQueue('session-123', {
        playerName: 'TestPlayer',
        color: '#06b6d4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot read properties of undefined');
      expect(mockLog.error).toHaveBeenCalledWith(
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
  });

  describe('acceptPlayer - Database Error Scenarios', () => {
    it('handles error when checking session capacity', async () => {
      // Mock successful queue entry fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'entry-123',
          session_id: 'session-123',
          user_id: 'user-123',
          player_name: 'TestPlayer',
          color: '#06b6d4',
          team: null,
          status: 'waiting',
        },
        error: null,
      });

      // Mock error when checking session capacity
      mockSupabase.eq.mockResolvedValueOnce({
        count: null,
        error: { message: 'Count query failed', code: 'QUERY_ERROR' },
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check session capacity');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('handles unexpected errors in catch block', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new ReferenceError('Variable is not defined');
      });

      const result = await sessionQueueService.acceptPlayer(
        'entry-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variable is not defined');
      expect(mockLog.error).toHaveBeenCalledWith(
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
    it('handles unexpected errors in catch block', async () => {
      // Mock updateQueueEntry to throw an error
      const _originalUpdateQueueEntry = sessionQueueService.updateQueueEntry;
      jest
        .spyOn(sessionQueueService, 'updateQueueEntry')
        .mockImplementation(() => {
          throw new Error('Unexpected rejection error');
        });

      const result = await sessionQueueService.rejectPlayer('entry-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected rejection error');
      expect(mockLog.error).toHaveBeenCalledWith(
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

      // Restore original method
      jest.restoreAllMocks();
    });
  });

  describe('cleanupExpiredEntries - Failure Scenarios', () => {
    it('handles cleanup database errors', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Cleanup failed', code: 'CLEANUP_ERROR' },
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup failed');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('handles unexpected errors in catch block', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Cleanup operation failed');
      });

      const result =
        await sessionQueueService.cleanupExpiredEntries('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup operation failed');
      expect(mockLog.error).toHaveBeenCalledWith(
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
  });

  describe('Error Handling for Other Methods', () => {
    it('handles getSessionQueue unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Query failed');
      });

      const result = await sessionQueueService.getSessionQueue('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error fetching queue entries',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-queue',
            method: 'getSessionQueue',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('handles updateQueueEntry unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Update operation failed');
      });

      const result = await sessionQueueService.updateQueueEntry('entry-123', {
        status: 'cancelled',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update operation failed');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('handles removeFromQueue unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Remove operation failed');
      });

      const result = await sessionQueueService.removeFromQueue('entry-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Remove operation failed');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('handles isPlayerInQueue unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected queue check error');
      });

      const result = await sessionQueueService.isPlayerInQueue(
        'user-123',
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected queue check error');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('handles getPlayerPosition unexpected errors', async () => {
      // Mock getSessionQueue to throw an error
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
      expect(mockLog.error).toHaveBeenCalledWith(
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

      jest.restoreAllMocks();
    });

    it('handles getQueueStats unexpected errors', async () => {
      jest
        .spyOn(sessionQueueService, 'getSessionQueue')
        .mockImplementation(() => {
          throw new Error('Stats calculation failed');
        });

      const result = await sessionQueueService.getQueueStats('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stats calculation failed');
      expect(mockLog.error).toHaveBeenCalledWith(
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

      jest.restoreAllMocks();
    });
  });
});
