/**
 * @jest-environment jsdom
 *
 * Focused Tests for Sessions Service Client - Coverage Enhancement
 *
 * Focuses on specific uncovered lines with simpler, more reliable tests
 */

import { sessionsService } from '../sessions.service.client';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockLog = log as jest.Mocked<typeof log>;

describe('Sessions Service Client - Focused Coverage', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      or: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      limit: jest.fn(),
      single: jest.fn(),
    };

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe('getSessionsWithStats - Catch Block Coverage', () => {
    it('handles unexpected errors in catch block', async () => {
      // Force an error in the try block
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting sessions with stats',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionsWithStats',
          }),
        })
      );
    });

    it('handles non-Error exceptions', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw 'String error';
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('getSessionsByBoardIdWithPlayers - Catch Block Coverage', () => {
    it('handles unexpected errors in catch block', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new TypeError('Cannot read properties of undefined');
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot read properties of undefined');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting sessions with players by board ID',
        expect.any(TypeError),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionsByBoardIdWithPlayers',
            boardId: 'board-123',
          }),
        })
      );
    });

    it('handles non-Error exceptions', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw 'Database error';
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
