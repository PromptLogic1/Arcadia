/**
 * Enhanced User Service Tests - Coverage Improvement
 *
 * Targeting specific uncovered lines to improve coverage from 74.26% to 85%+
 * Lines targeted: 185-204, 212-214, 262, 266, 272-279, 398, 509-549, 651, 684-696
 */

import { userService } from '../user.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import type { ActivityLogRequest, ActivityOptions } from '../user.service';

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

import { createClient } from '@/lib/supabase';

describe('UserService - Enhanced Coverage Tests', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('getUserStats Fallback Calculations - Lines 185-204', () => {
    it('should calculate stats from game results when user_statistics is null', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const profile = {
        created_at: '2023-01-01T00:00:00Z',
        last_login_at: '2024-01-01T00:00:00Z',
      };

      const gameResults = [
        { final_score: 100, placement: 1, created_at: '2024-01-01' },
        { final_score: 80, placement: 2, created_at: '2024-01-02' },
        { final_score: 120, placement: 1, created_at: '2024-01-03' },
        { final_score: 90, placement: 3, created_at: '2024-01-04' },
        { final_score: 110, placement: 1, created_at: '2024-01-05' },
      ];

      // Mock sequence: profile, user_statistics (null), game_results, activity count
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(profile)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(gameResults)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 5, error: null }),
        });

      const result = await userService.getUserStats(userId);

      expect(result.success).toBe(true);
      expect(result.data?.totalGames).toBe(5);
      expect(result.data?.gamesWon).toBe(3); // 3 first place finishes
      expect(result.data?.winRate).toBe(60); // 3/5 * 100
      expect(result.data?.totalScore).toBe(500); // Sum of all scores
      expect(result.data?.averageScore).toBe(100); // 500/5
      expect(result.data?.streakCount).toBe(1); // Last game was a win
    });

    it('should calculate streak correctly from recent games', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const profile = {
        created_at: '2023-01-01T00:00:00Z',
        last_login_at: '2024-01-01T00:00:00Z',
      };

      // Create a win streak of 3 games at the end
      const gameResults = [
        { final_score: 50, placement: 3, created_at: '2024-01-01' },
        { final_score: 60, placement: 2, created_at: '2024-01-02' },
        { final_score: 100, placement: 1, created_at: '2024-01-03' },
        { final_score: 110, placement: 1, created_at: '2024-01-04' },
        { final_score: 120, placement: 1, created_at: '2024-01-05' },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(profile)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(gameResults)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 2, error: null }),
        });

      const result = await userService.getUserStats(userId);

      expect(result.success).toBe(true);
      expect(result.data?.streakCount).toBe(3); // 3 consecutive wins at the end
    });

    it('should handle empty game results gracefully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const profile = {
        created_at: '2023-01-01T00:00:00Z',
        last_login_at: '2024-01-01T00:00:00Z',
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(profile)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(null)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 0, error: null }),
        });

      const result = await userService.getUserStats(userId);

      expect(result.success).toBe(true);
      expect(result.data?.totalGames).toBe(0);
      expect(result.data?.gamesWon).toBe(0);
      expect(result.data?.winRate).toBe(0);
      expect(result.data?.totalScore).toBe(0);
      expect(result.data?.averageScore).toBe(0);
      expect(result.data?.streakCount).toBe(0);
    });
  });

  describe('Rank Calculation - Lines 212-214', () => {
    it('should assign Master rank for high performance', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const userStats = {
        total_games: 60,
        games_won: 50,
        total_score: 6000,
        average_score: 100,
        current_win_streak: 5,
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse({})),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(userStats)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(createSupabaseSuccessResponse([])),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 10, error: null }),
        });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe('Master'); // 50+ games, 83.3% win rate
    });

    it('should assign Expert rank for good performance', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const userStats = {
        total_games: 30,
        games_won: 22,
        total_score: 3000,
        average_score: 100,
        current_win_streak: 3,
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse({})),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(userStats)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(createSupabaseSuccessResponse([])),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 5, error: null }),
        });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe('Expert'); // 25+ games, 73.3% win rate
    });

    it('should assign Advanced rank for moderate performance', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const userStats = {
        total_games: 15,
        games_won: 10,
        total_score: 1500,
        average_score: 100,
        current_win_streak: 2,
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse({})),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(userStats)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(createSupabaseSuccessResponse([])),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 3, error: null }),
        });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe('Advanced'); // 10+ games, 66.7% win rate
    });

    it('should assign Intermediate rank for basic performance', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const userStats = {
        total_games: 8,
        games_won: 4,
        total_score: 800,
        average_score: 100,
        current_win_streak: 1,
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse({})),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(userStats)),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(createSupabaseSuccessResponse([])),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ count: 1, error: null }),
        });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe('Intermediate'); // 5+ games, 50% win rate
    });
  });

  describe('getUserActivities Query Building - Lines 262, 266', () => {
    it('should apply date range filters correctly', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';
      const options: ActivityOptions = {
        limit: 10,
        offset: 0,
        type: 'board_join',
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-01-31T23:59:59Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue(createSupabaseSuccessResponse([])),
      };

      mockFrom.mockReturnValue(mockQuery);

      const result = await userService.getUserActivities(userId, options);

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('activity_type', 'board_join');
      expect(mockQuery.gte).toHaveBeenCalledWith(
        'created_at',
        '2024-01-01T00:00:00Z'
      );
      expect(mockQuery.lte).toHaveBeenCalledWith(
        'created_at',
        '2024-01-31T23:59:59Z'
      );
    });

    it('should handle activities query without optional filters', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';
      const options: ActivityOptions = {
        limit: 20,
        offset: 10,
      };

      const activities = [
        factories.createActivity({
          user_id: userId,
          activity_type: 'board_join',
        }),
        factories.createActivity({
          user_id: userId,
          activity_type: 'achievement_unlock',
        }),
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(activities)),
      };

      mockFrom.mockReturnValue(mockQuery);

      const result = await userService.getUserActivities(userId, options);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(activities);
      expect(mockQuery.range).toHaveBeenCalledWith(10, 29); // offset to offset + limit - 1
    });
  });

  describe('getUserActivities Error Handling - Lines 272-279', () => {
    it('should handle database errors when fetching activities', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const dbError = new Error('Database connection failed');
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await userService.getUserActivities(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get user activities',
        dbError,
        {
          metadata: {
            service: 'user.service',
            method: 'getUserActivities',
            userId,
          },
        }
      );
    });

    it('should handle unexpected errors in getUserActivities', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const result = await userService.getUserActivities(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting user activities',
        expect.any(Error),
        {
          metadata: {
            service: 'user.service',
            method: 'getUserActivities',
            userId,
          },
        }
      );
    });
  });

  describe('getActivitySummary - Line 398', () => {
    it('should calculate activity summary with null counts', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      // Mock Promise.all responses with null counts
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: null, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: null, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: null, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: null, error: null }),
        });

      const result = await userService.getActivitySummary(userId);

      expect(result.success).toBe(true);
      expect(result.data?.todayCount).toBe(0);
      expect(result.data?.weekCount).toBe(0);
      expect(result.data?.monthCount).toBe(0);
      expect(result.data?.recentActivities).toEqual([]);
    });

    it('should handle successful activity summary calculation', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';
      const recentActivities = [
        factories.createActivity({ user_id: userId }),
        factories.createActivity({ user_id: userId }),
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: 5, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: 15, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: 30, error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(recentActivities)),
        });

      const result = await userService.getActivitySummary(userId);

      expect(result.success).toBe(true);
      expect(result.data?.todayCount).toBe(5);
      expect(result.data?.weekCount).toBe(15);
      expect(result.data?.monthCount).toBe(30);
      expect(result.data?.recentActivities).toEqual(recentActivities);
    });
  });

  describe('removeAvatar Edge Cases - Lines 509-549', () => {
    it('should handle user fetch error during avatar removal', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const fetchError = new Error('User not found');
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: fetchError,
        }),
      });

      const result = await userService.removeAvatar(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch user for avatar removal',
        fetchError,
        {
          metadata: {
            service: 'user.service',
            method: 'removeAvatar',
            userId,
          },
        }
      );
    });

    it('should handle user with avatar URL containing avatars path', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockStorage = mockSupabase.storage;
      const userId = 'user-123';
      const avatarUrl =
        'https://storage.supabase.com/avatars/user-123-avatar.jpg';

      const user = {
        id: userId,
        avatar_url: avatarUrl,
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(user)),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

      const result = await userService.removeAvatar(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockStorage.from).toHaveBeenCalledWith('avatars');
    });

    it('should handle user with no avatar URL', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const user = {
        id: userId,
        avatar_url: null,
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(user)),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

      const result = await userService.removeAvatar(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle avatar URL without avatars path', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const user = {
        id: userId,
        avatar_url: 'https://external-cdn.com/avatar.jpg',
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(user)),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

      const result = await userService.removeAvatar(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle avatar URL update error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userId = 'user-123';

      const user = {
        id: userId,
        avatar_url: 'https://storage.supabase.com/avatars/user-123-avatar.jpg',
      };

      const updateError = new Error('Update failed');
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(user)),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: updateError }),
        });

      const result = await userService.removeAvatar(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to remove avatar URL',
        updateError,
        {
          metadata: {
            service: 'user.service',
            method: 'removeAvatar',
            userId,
          },
        }
      );
    });
  });

  describe('followUser Edge Cases - Line 651', () => {
    it('should handle unexpected errors in followUser', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const followerId = 'user-123';
      const followingId = 'user-456';

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation(() => {
          throw new Error('Network error');
        }),
      });

      const result = await userService.followUser(followerId, followingId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error following user',
        expect.any(Error),
        {
          metadata: {
            service: 'user.service',
            method: 'followUser',
            followerId,
            followingId,
          },
        }
      );
    });
  });

  describe('isFollowing Error Handling - Lines 684-696', () => {
    it('should return false when follow relationship not found', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const followerId = 'user-123';
      const followingId = 'user-456';

      const notFoundError = new Error('No rows returned');
      notFoundError.code = 'PGRST116';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: notFoundError,
        }),
      });

      const result = await userService.isFollowing(followerId, followingId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should handle other database errors in isFollowing', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const followerId = 'user-123';
      const followingId = 'user-456';

      const dbError = new Error('Database connection failed');
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await userService.isFollowing(followerId, followingId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check follow status',
        dbError,
        {
          metadata: {
            service: 'user.service',
            method: 'isFollowing',
            followerId,
            followingId,
          },
        }
      );
    });

    it('should handle unexpected errors in isFollowing', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const followerId = 'user-123';
      const followingId = 'user-456';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const result = await userService.isFollowing(followerId, followingId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error checking follow status',
        expect.any(Error),
        {
          metadata: {
            service: 'user.service',
            method: 'isFollowing',
            followerId,
            followingId,
          },
        }
      );
    });

    it('should return true when follow relationship exists', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const followerId = 'user-123';
      const followingId = 'user-456';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse({ user_id: followerId })
          ),
      });

      const result = await userService.isFollowing(followerId, followingId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });
});
