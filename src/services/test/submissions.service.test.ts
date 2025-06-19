/**
 * @jest-environment node
 */

import { submissionsService } from '../submissions.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type {
  CreateSubmissionData,
  SubmissionsFilters,
  SubmissionStatus,
} from '../submissions.service';
import type { Json } from '@/types/database.types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
};

describe('submissionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
  });

  describe('createSubmission', () => {
    it('should create submission successfully', async () => {
      const submissionData: CreateSubmissionData = {
        challenge_id: 'challenge-123',
        user_id: 'user-456',
        code: 'console.log("Hello World");',
        language: 'javascript',
      };

      const createdSubmission = {
        id: 'submission-789',
        challenge_id: 'challenge-123',
        user_id: 'user-456',
        code: 'console.log("Hello World");',
        language: 'javascript',
        status: 'pending' as SubmissionStatus,
        results: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: createdSubmission,
        error: null,
      });

      const result = await submissionsService.createSubmission(submissionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdSubmission);
      expect(mockSupabase.from).toHaveBeenCalledWith('submissions');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        challenge_id: 'challenge-123',
        user_id: 'user-456',
        code: 'console.log("Hello World");',
        language: 'javascript',
        status: 'pending',
        results: null,
      });
    });

    it('should handle database errors', async () => {
      const submissionData: CreateSubmissionData = {
        challenge_id: 'challenge-123',
        user_id: 'user-456',
        code: 'invalid code',
        language: 'javascript',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Validation failed' },
      });

      const result = await submissionsService.createSubmission(submissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create submission',
        expect.any(Object),
        expect.objectContaining({
          metadata: {
            challengeId: 'challenge-123',
            userId: 'user-456',
          },
        })
      );
    });

    it('should handle unexpected errors', async () => {
      const submissionData: CreateSubmissionData = {
        challenge_id: 'challenge-123',
        user_id: 'user-456',
        code: 'test code',
        language: 'javascript',
      };

      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await submissionsService.createSubmission(submissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in createSubmission',
        expect.any(Error),
        expect.objectContaining({
          metadata: { data: submissionData },
        })
      );
    });
  });

  describe('getSubmissions', () => {
    it('should fetch all submissions without filters', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          challenge_id: 'challenge-1',
          user_id: 'user-1',
          code: 'test code 1',
          language: 'javascript',
          status: 'accepted' as SubmissionStatus,
          challenge: {
            title: 'Two Sum',
            difficulty: 'easy',
          },
        },
        {
          id: 'submission-2',
          challenge_id: 'challenge-2',
          user_id: 'user-2',
          code: 'test code 2',
          language: 'python',
          status: 'rejected' as SubmissionStatus,
          challenge: {
            title: 'Reverse String',
            difficulty: 'medium',
          },
        },
      ];

      mockFrom.order.mockResolvedValueOnce({
        data: mockSubmissions,
        error: null,
      });

      const result = await submissionsService.getSubmissions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toMatchObject({
        id: 'submission-1',
        status: 'accepted',
        challenge: {
          title: 'Two Sum',
          difficulty: 'easy',
        },
      });
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply user_id filter', async () => {
      const filters: SubmissionsFilters = {
        user_id: 'user-123',
      };

      // Create a chain mock for the query building
      const mockOrderResult = {
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      };
      mockFrom.order.mockReturnValue(mockOrderResult);

      await submissionsService.getSubmissions(filters);

      expect(mockOrderResult.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should apply challenge_id filter', async () => {
      const filters: SubmissionsFilters = {
        challenge_id: 'challenge-456',
      };

      // Create a chain mock for the query building
      const mockOrderResult = {
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      };
      mockFrom.order.mockReturnValue(mockOrderResult);

      await submissionsService.getSubmissions(filters);

      expect(mockOrderResult.eq).toHaveBeenCalledWith(
        'challenge_id',
        'challenge-456'
      );
    });

    it('should apply both filters', async () => {
      const filters: SubmissionsFilters = {
        user_id: 'user-123',
        challenge_id: 'challenge-456',
      };

      // Create a chain mock for multiple filter application
      const mockSecondEq = {
        data: [],
        error: null,
      };
      const mockFirstEq = {
        eq: jest.fn().mockReturnValue(mockSecondEq),
      };
      const mockOrderResult = {
        eq: jest.fn().mockReturnValue(mockFirstEq),
      };
      mockFrom.order.mockReturnValue(mockOrderResult);

      await submissionsService.getSubmissions(filters);

      expect(mockOrderResult.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockFirstEq.eq).toHaveBeenCalledWith(
        'challenge_id',
        'challenge-456'
      );
    });

    it('should handle null challenge data', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          challenge_id: 'challenge-1',
          user_id: 'user-1',
          code: 'test code',
          language: 'javascript',
          status: 'pending' as SubmissionStatus,
          challenge: null,
        },
      ];

      mockFrom.order.mockResolvedValueOnce({
        data: mockSubmissions,
        error: null,
      });

      const result = await submissionsService.getSubmissions();

      expect(result.success).toBe(true);
      expect(result.data?.[0].challenge).toBeUndefined();
    });

    it('should handle database errors', async () => {
      mockFrom.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await submissionsService.getSubmissions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch submissions',
        expect.any(Object),
        expect.objectContaining({
          metadata: { filters: {} },
        })
      );
    });
  });

  describe('getSubmissionById', () => {
    it('should fetch submission by ID successfully', async () => {
      const mockSubmission = {
        id: 'submission-123',
        challenge_id: 'challenge-456',
        user_id: 'user-789',
        code: 'function solve() { return true; }',
        language: 'javascript',
        status: 'accepted' as SubmissionStatus,
        results: { score: 100, tests_passed: 10 },
        challenge: {
          title: 'Binary Search',
          difficulty: 'medium',
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSubmission,
        error: null,
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'submission-123',
        status: 'accepted',
        challenge: {
          title: 'Binary Search',
          difficulty: 'medium',
        },
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'submission-123');
    });

    it('should handle submission not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Submission not found' },
      });

      const result =
        await submissionsService.getSubmissionById('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch submission by ID',
        expect.any(Object),
        expect.objectContaining({
          metadata: { submissionId: 'nonexistent-id' },
        })
      );
    });

    it('should handle null challenge in single submission', async () => {
      const mockSubmission = {
        id: 'submission-123',
        challenge_id: 'challenge-456',
        user_id: 'user-789',
        code: 'test code',
        language: 'javascript',
        status: 'pending' as SubmissionStatus,
        challenge: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSubmission,
        error: null,
      });

      const result =
        await submissionsService.getSubmissionById('submission-123');

      expect(result.success).toBe(true);
      expect(result.data?.challenge).toBeUndefined();
    });
  });

  describe('updateSubmissionResults', () => {
    it('should update submission status and results', async () => {
      const submissionId = 'submission-123';
      const status: SubmissionStatus = 'accepted';
      const results: Json = {
        score: 100,
        tests_passed: 15,
        execution_time: '2.5ms',
      };

      const updatedSubmission = {
        id: submissionId,
        status,
        results,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedSubmission,
        error: null,
      });

      const result = await submissionsService.updateSubmissionResults(
        submissionId,
        status,
        results
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: submissionId,
        status: 'accepted',
        results,
      });
      expect(mockFrom.update).toHaveBeenCalledWith({
        status,
        results,
        updated_at: expect.any(String),
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', submissionId);
    });

    it('should update submission status without results', async () => {
      const submissionId = 'submission-456';
      const status: SubmissionStatus = 'rejected';

      const updatedSubmission = {
        id: submissionId,
        status,
        results: null,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedSubmission,
        error: null,
      });

      const result = await submissionsService.updateSubmissionResults(
        submissionId,
        status
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: submissionId,
        status: 'rejected',
      });
      expect(mockFrom.update).toHaveBeenCalledWith({
        status,
        results: undefined,
        updated_at: expect.any(String),
      });
    });

    it('should handle update errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'accepted'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update submission results',
        expect.any(Object),
        expect.objectContaining({
          metadata: {
            submissionId: 'submission-123',
            status: 'accepted',
          },
        })
      );
    });

    it('should handle unexpected errors', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await submissionsService.updateSubmissionResults(
        'submission-123',
        'accepted'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in updateSubmissionResults',
        expect.any(Error),
        expect.objectContaining({
          metadata: {
            submissionId: 'submission-123',
            status: 'accepted',
          },
        })
      );
    });
  });
});
