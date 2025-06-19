/**
 * @jest-environment jsdom
 *
 * Focused Tests for Submissions Service - Coverage Enhancement
 *
 * Focuses on specific uncovered lines 176-179 with reliable testing
 */

import { submissionsService } from '../submissions.service';
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

describe('Submissions Service - Focused Coverage', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(),
      single: jest.fn(),
    };

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe('getSubmissionById - Catch Block Coverage (lines 176-179)', () => {
    it('handles unexpected errors in try-catch', async () => {
      // Force an error in the try block
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissionById',
        expect.any(Error),
        {
          metadata: { submissionId: 'submission-123' },
        }
      );
    });

    it('handles TypeError exceptions', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new TypeError('Cannot read properties of undefined');
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot read properties of undefined');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissionById',
        expect.any(TypeError),
        {
          metadata: { submissionId: 'submission-123' },
        }
      );
    });

    it('handles non-Error exceptions', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch submission'); // Non-Error objects get fallback message
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissionById',
        'String error', // Non-Error passed as-is
        {
          metadata: { submissionId: 'submission-123' },
        }
      );
    });
  });

  describe('Additional Error Coverage', () => {
    it('handles createSubmission unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new ReferenceError('Variable is not defined');
      });

      const result = await submissionsService.createSubmission({
        challenge_id: 'challenge-123',
        user_id: 'user-123',
        code: 'test code',
        language: 'javascript',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variable is not defined');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in createSubmission',
        expect.any(ReferenceError),
        expect.objectContaining({
          metadata: expect.any(Object),
        })
      );
    });

    it('handles getSubmissions unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Query builder error');
      });

      const result = await submissionsService.getSubmissions({
        user_id: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query builder error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissions',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.any(Object),
        })
      );
    });

    it('handles updateSubmissionResults unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Update operation failed');
      });

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'completed',
        { score: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update operation failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in updateSubmissionResults',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.any(Object),
        })
      );
    });
  });
});
