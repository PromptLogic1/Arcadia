/**
 * @jest-environment jsdom
 *
 * Additional Tests for Submissions Service - Coverage Enhancement
 *
 * Focuses on specific uncovered lines:
 * - lines 176-179 in getSubmissionById catch block
 * - Edge cases and error scenarios
 * - Non-Error exception handling
 */

import { submissionsService } from '../submissions.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type {
  CreateSubmissionData,
  SubmissionsFilters,
} from '../submissions.service';

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

const mockSupabase: any = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockLog = log as jest.Mocked<typeof log>;

describe('Submissions Service - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase as never);
  });

  describe('getSubmissionById - Uncovered Error Paths (lines 176-179)', () => {
    it('handles unexpected errors in try-catch', async () => {
      // Mock an unexpected error in the query chain
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
      expect(result.error).toBe('Failed to fetch submission');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissionById',
        'String error', // Non-Error passed as-is
        {
          metadata: { submissionId: 'submission-123' },
        }
      );
    });

    it('handles complex object exceptions', async () => {
      const complexError = {
        code: 'CUSTOM_ERROR',
        message: 'Complex error object',
        nested: { details: 'Deep error' },
      };

      mockSupabase.from.mockImplementation(() => {
        throw complexError;
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch submission');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissionById',
        complexError,
        {
          metadata: { submissionId: 'submission-123' },
        }
      );
    });

    it('handles null pointer exceptions during query execution', async () => {
      // Mock chain that throws when accessing properties
      mockSupabase.select.mockImplementation(() => {
        const obj: any = null;
        return obj!.something; // Will throw TypeError
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch submission');
    });
  });

  describe('createSubmission - Additional Error Scenarios', () => {
    const mockSubmissionData: CreateSubmissionData = {
      challenge_id: 'challenge-123',
      user_id: 'user-123',
      code: 'console.log("Hello World");',
      language: 'javascript',
    };

    it('handles unexpected errors in try-catch', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new ReferenceError('Variable is not defined');
      });

      const result =
        await submissionsService.createSubmission(mockSubmissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variable is not defined');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in createSubmission',
        expect.any(ReferenceError),
        {
          metadata: { data: mockSubmissionData },
        }
      );
    });

    it('handles non-Error exceptions in createSubmission', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw { status: 500, message: 'Server Error' };
      });

      const result =
        await submissionsService.createSubmission(mockSubmissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create submission');
    });

    it('handles memory/resource errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Maximum call stack size exceeded');
      });

      const result =
        await submissionsService.createSubmission(mockSubmissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Maximum call stack size exceeded');
    });
  });

  describe('getSubmissions - Additional Error Scenarios', () => {
    beforeEach(() => {
      // Reset all mocks to default behavior for this describe block
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
    });

    it('handles unexpected errors in try-catch', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Query builder error');
      });

      const filters: SubmissionsFilters = { user_id: 'user-123' };
      const result = await submissionsService.getSubmissions(filters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query builder error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in getSubmissions',
        expect.any(Error),
        {
          metadata: { filters },
        }
      );
    });

    it('handles concurrent modification during query building', async () => {
      let callCount = 0;
      mockSupabase.eq.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Concurrent modification detected');
        }
        return mockSupabase;
      });

      const filters: SubmissionsFilters = {
        user_id: 'user-123',
        challenge_id: 'challenge-123',
      };

      const result = await submissionsService.getSubmissions(filters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Concurrent modification detected');
    });

    it('handles network timeout errors', async () => {
      mockSupabase.order.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await submissionsService.getSubmissions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('updateSubmissionResults - Additional Error Scenarios', () => {
    beforeEach(() => {
      // Reset all mocks to default behavior for this describe block
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
    });

    it('handles unexpected errors in try-catch', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Update operation failed');
      });

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'completed',
        { score: 100, passed: true }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update operation failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error in updateSubmissionResults',
        expect.any(Error),
        {
          metadata: { submissionId: 'submission-123', status: 'completed' },
        }
      );
    });

    it('handles serialization errors with complex results', async () => {
      // Create a circular reference that would cause JSON serialization issues
      const circularResults: any = { test: 'data' };
      circularResults.self = circularResults;

      mockSupabase.from.mockImplementation(() => {
        throw new Error('JSON serialization failed');
      });

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'failed',
        circularResults as never
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('JSON serialization failed');
    });

    it('handles database constraint violations', async () => {
      // Reset the from mock for this test to return proper chain
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: {
          message: 'Foreign key constraint violation',
          code: '23503',
        },
      });

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'completed'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Foreign key constraint violation');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to update submission results',
        expect.objectContaining({
          message: 'Foreign key constraint violation',
        }),
        expect.objectContaining({
          metadata: {
            submissionId: 'submission-123',
            status: 'completed',
          },
        })
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(() => {
      // Reset all mocks to default behavior for this describe block
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
    });

    it('handles submissions with null challenge data', async () => {
      const submissionWithNullChallenge = {
        id: 'submission-123',
        challenge_id: 'challenge-123',
        user_id: 'user-123',
        code: 'test code',
        language: 'javascript',
        status: 'pending',
        results: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        challenge: null, // Null challenge relation
      };

      mockSupabase.single.mockResolvedValue({
        data: submissionWithNullChallenge,
        error: null,
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(true);
      expect(result.data!.challenge).toBeUndefined();
    });

    it('handles very large code submissions', async () => {
      const largeCode = 'a'.repeat(1000000); // 1MB of code
      const submissionData: CreateSubmissionData = {
        challenge_id: 'challenge-123',
        user_id: 'user-123',
        code: largeCode,
        language: 'javascript',
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'submission-123',
          ...submissionData,
          status: 'pending',
          results: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await submissionsService.createSubmission(submissionData);

      expect(result.success).toBe(true);
      expect(result.data!.code).toHaveLength(1000000);
    });

    it('handles special characters in code submissions', async () => {
      const codeWithSpecialChars = `
        console.log("Hello 🌍!");
        const regex = /[a-zA-Z0-9!@#$%^&*()]/g;
        const sql = "SELECT * FROM users WHERE name = 'O\\'Brien'";
        const unicode = "测试中文字符";
      `;

      const submissionData: CreateSubmissionData = {
        challenge_id: 'challenge-123',
        user_id: 'user-123',
        code: codeWithSpecialChars,
        language: 'javascript',
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'submission-123',
          ...submissionData,
          status: 'pending',
          results: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await submissionsService.createSubmission(submissionData);

      expect(result.success).toBe(true);
      expect(result.data!.code).toBe(codeWithSpecialChars);
    });

    it('handles malformed JSON results updates', async () => {
      const invalidResults = {
        test: () => 'function', // Functions can't be serialized to JSON
        date: new Date(), // Dates serialize but might cause issues
        undefined: undefined, // Undefined values
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'submission-123',
          status: 'completed',
          results: invalidResults,
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'completed',
        invalidResults as never
      );

      expect(result.success).toBe(true);
    });

    it('handles empty and null filter combinations', async () => {
      const emptyFilters: SubmissionsFilters = {};

      // Mock the final result of the chain for getSubmissions
      const queryPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockSupabase.order.mockResolvedValue(queryPromise);

      const result = await submissionsService.getSubmissions(emptyFilters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);

      // Verify no filters were applied
      expect(mockSupabase.eq).not.toHaveBeenCalled();
    });

    it('handles database returning undefined data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: undefined, // Undefined instead of null
        error: null,
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot read properties of undefined (reading 'challenge')");
    });
  });

  describe('Service Pattern Compliance', () => {
    beforeEach(() => {
      // Reset all mocks to default successful behavior for compliance test
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'submission-123',
          challenge_id: 'challenge-123',
          user_id: 'user-123',
          code: 'test',
          language: 'javascript',
          status: 'pending',
          results: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });
      // For getSubmissions which doesn't use single()
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });
    });

    it('should always return proper ServiceResponse shape for all methods', async () => {
      const scenarios = [
        {
          name: 'createSubmission',
          method: () =>
            submissionsService.createSubmission({
              challenge_id: 'challenge-123',
              user_id: 'user-123',
              code: 'test',
              language: 'javascript',
            }),
        },
        {
          name: 'getSubmissions',
          method: () => submissionsService.getSubmissions(),
        },
        {
          name: 'getSubmissionById',
          method: () => submissionsService.getSubmissionById('submission-123'),
        },
        {
          name: 'updateSubmissionResults',
          method: () =>
            submissionsService.updateSubmissionResults(
              'submission-123',
              'completed',
              { score: 100 }
            ),
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
