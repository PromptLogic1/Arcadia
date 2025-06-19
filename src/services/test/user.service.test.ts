/**
 * @jest-environment node
 */

import { userService } from '../user.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { Database } from '@/types/database.types';
import type { ActivityLogRequest } from '../user.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
};

const mockFrom = {
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  limit: jest.fn(),
};

const mockStorage = {
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);
    mockSupabase.storage.from.mockReturnValue(mockStorage);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.delete.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.gte.mockReturnValue(mockFrom);
    mockFrom.lte.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.range.mockReturnValue(mockFrom);
    mockFrom.limit.mockReturnValue(mockFrom);
  });

  describe('getUserProfile', () => {
    it('should return user profile when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await userService.getUserProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should return error when user not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await userService.getUserProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await userService.getUserProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting user profile',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'getUserProfile',
            userId: 'user-123',
          }),
        })
      );
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = { username: 'newusername' };
      const updatedUser = {
        id: 'user-123',
        username: 'newusername',
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedUser,
        error: null,
      });

      const result = await userService.updateUserProfile('user-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(mockFrom.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(String),
      });
    });

    it('should handle update errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await userService.updateUserProfile('user-123', {
        username: 'newusername',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('getUserStats', () => {
    it('should calculate stats from user_statistics table', async () => {
      // Reset the mock to handle sequential calls correctly
      jest.clearAllMocks();
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      // Setup sequential calls
      const calls = [
        // 1. Get user profile
        {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    created_at: '2024-01-01T00:00:00Z',
                    last_login_at: '2024-01-10T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        },
        // 2. Get user statistics
        {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    total_games: 50,
                    games_won: 40,
                    total_score: 5000,
                    average_score: 100,
                    current_win_streak: 5,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        },
        // 3. Get game results (fallback)
        {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        },
        // 4. Get activity count
        {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  count: 10,
                  error: null,
                }),
              }),
            }),
          }),
        },
      ];

      // Setup sequential returns
      mockSupabase.from
        .mockReturnValueOnce(calls[0].from())
        .mockReturnValueOnce(calls[1].from())
        .mockReturnValueOnce(calls[2].from())
        .mockReturnValueOnce(calls[3].from());

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalGames: 50,
        gamesWon: 40,
        winRate: 80,
        totalScore: 5000,
        averageScore: 100,
        streakCount: 5,
        rank: 'Master',
        badgeCount: 10,
      });
    });

    it('should calculate stats from game results when user_statistics not available', async () => {
      // Mock profile data
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            created_at: '2024-01-01T00:00:00Z',
            last_login_at: '2024-01-10T00:00:00Z',
          },
          error: null,
        })
      );

      // Mock no user statistics
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: null,
          error: null,
        })
      );

      // Mock game results
      const gameResults = [
        { final_score: 100, placement: 1, created_at: '2024-01-05' },
        { final_score: 80, placement: 2, created_at: '2024-01-04' },
        { final_score: 120, placement: 1, created_at: '2024-01-03' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: gameResults, error: null }),
      });

      // Mock activity count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 5, error: null }),
      });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalGames: 3,
        gamesWon: 2,
        winRate: 66.67,
        totalScore: 300,
        averageScore: 100,
        streakCount: 1,
        rank: 'Intermediate',
        badgeCount: 5,
      });
    });

    it('should handle errors gracefully', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Database error'));

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getUserActivities', () => {
    it('should fetch activities with default pagination', async () => {
      const activities = [
        { id: '1', activity_type: 'board_join', created_at: '2024-01-01' },
        { id: '2', activity_type: 'achievement_unlock', created_at: '2024-01-02' },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: activities,
        error: null,
      });

      const result = await userService.getUserActivities('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(activities);
      expect(mockFrom.range).toHaveBeenCalledWith(0, 19);
    });

    it('should apply filters when provided', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await userService.getUserActivities('user-123', {
        limit: 10,
        offset: 5,
        type: 'board_join' as const,
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(mockFrom.eq).toHaveBeenCalledWith('activity_type', 'board_join');
      expect(mockFrom.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockFrom.lte).toHaveBeenCalledWith('created_at', '2024-01-31');
      expect(mockFrom.range).toHaveBeenCalledWith(5, 14);
    });
  });

  describe('logUserActivity', () => {
    it('should log activity successfully', async () => {
      const activity: ActivityLogRequest = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'activity-123' },
        error: null,
      });

      const result = await userService.logUserActivity('user-123', activity);

      expect(result.success).toBe(true);
      expect(result.data).toBe('activity-123');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        activity_type: 'board_join',
        data: activity.metadata,
        created_at: expect.any(String),
      });
    });
  });

  describe('getActivitySummary', () => {
    it('should return activity counts for different periods', async () => {
      // Mock count responses
      const todayCount = { count: 5, error: null };
      const weekCount = { count: 20, error: null };
      const monthCount = { count: 100, error: null };
      const recentActivities = {
        data: [
          { id: '1', activity_type: 'board_join' },
          { id: '2', activity_type: 'achievement_unlock' },
        ],
        error: null,
      };

      // Set up mocks for parallel queries
      const mockQueries = [
        jest.fn().mockResolvedValue(todayCount),
        jest.fn().mockResolvedValue(weekCount),
        jest.fn().mockResolvedValue(monthCount),
        jest.fn().mockResolvedValue(recentActivities),
      ];

      let callIndex = 0;
      mockSupabase.from.mockImplementation(() => {
        const query = mockQueries[callIndex];
        callIndex++;
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                then: query().then,
              }),
            }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: query().then,
              }),
            }),
          }),
        };
      });

      const result = await userService.getActivitySummary('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        todayCount: 5,
        weekCount: 20,
        monthCount: 100,
        recentActivities: recentActivities.data,
      });
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and update profile', async () => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      const publicUrl = 'https://storage.example.com/avatars/user-123-12345.jpg';

      mockStorage.upload.mockResolvedValueOnce({ error: null });
      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(true);
      expect(result.data).toBe(publicUrl);
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringContaining('avatars/user-123-'),
        file,
        expect.objectContaining({
          upsert: true,
          cacheControl: '3600',
        })
      );
      expect(mockFrom.update).toHaveBeenCalledWith({
        avatar_url: publicUrl,
        updated_at: expect.any(String),
      });
    });

    it('should rollback upload on profile update failure', async () => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      mockStorage.upload.mockResolvedValueOnce({ error: null });
      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/avatar.jpg' },
      });
      mockFrom.eq.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(mockStorage.remove).toHaveBeenCalled();
    });
  });

  describe('removeAvatar', () => {
    it('should remove avatar from storage and update profile', async () => {
      const avatarUrl = 'https://storage.example.com/avatars/user-123-12345.jpg';

      mockFrom.single.mockResolvedValueOnce({
        data: { avatar_url: avatarUrl },
        error: null,
      });
      mockStorage.remove.mockResolvedValueOnce({ error: null });
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockStorage.remove).toHaveBeenCalledWith(['avatars/user-123-12345.jpg']);
      expect(mockFrom.update).toHaveBeenCalledWith({
        avatar_url: null,
        updated_at: expect.any(String),
      });
    });
  });

  describe('followUser', () => {
    it('should follow user successfully', async () => {
      mockFrom.insert.mockResolvedValueOnce({ error: null });
      // Mock logUserActivity
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'activity-123' },
        error: null,
      });

      const result = await userService.followUser('user-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockFrom.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        friend_id: 'user-456',
        status: 'following',
        created_at: expect.any(String),
      });
    });

    it('should handle duplicate follow gracefully', async () => {
      mockFrom.insert.mockResolvedValueOnce({
        error: { code: '23505', message: 'Duplicate entry' },
      });

      const result = await userService.followUser('user-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow user successfully', async () => {
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.unfollowUser('user-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockFrom.delete).toHaveBeenCalled();
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });

      const result = await userService.isFollowing('user-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when not following', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await userService.isFollowing('user-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should handle database errors in isFollowing', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database connection failed' },
      });

      const result = await userService.isFollowing('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors in isFollowing', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await userService.isFollowing('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getUserStats - coverage gap tests', () => {
    it('should handle null user_statistics gracefully', async () => {
      // Mock profile data
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            created_at: '2024-01-01T00:00:00Z',
            last_login_at: '2024-01-10T00:00:00Z',
          },
          error: null,
        })
      );

      // Mock no user statistics
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: null,
          error: null,
        })
      );

      // Mock empty game results
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock activity count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalGames: 0,
        gamesWon: 0,
        winRate: 0,
        totalScore: 0,
        averageScore: 0,
        streakCount: 0,
        rank: 'Beginner',
        badgeCount: 0,
      });
    });

    it('should calculate rank as Expert with sufficient games and win rate', async () => {
      // Mock profile data
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            created_at: '2024-01-01T00:00:00Z',
            last_login_at: '2024-01-10T00:00:00Z',
          },
          error: null,
        })
      );

      // Mock user statistics for Expert rank
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            total_games: 30,
            games_won: 22,
            total_score: 3000,
            average_score: 100,
            current_win_streak: 3,
          },
          error: null,
        })
      );

      // Mock game results (fallback)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Mock activity count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 15, error: null }),
      });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe('Expert');
      expect(result.data?.winRate).toBe(73.33);
    });

    it('should handle recent games streak calculation with mixed results', async () => {
      // Mock profile data
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            created_at: '2024-01-01T00:00:00Z',
            last_login_at: '2024-01-10T00:00:00Z',
          },
          error: null,
        })
      );

      // Mock no user statistics
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: null,
          error: null,
        })
      );

      // Mock game results with streak pattern: win, win, loss, win, win, win
      const gameResults = [
        { final_score: 100, placement: 1, created_at: '2024-01-06' }, // Most recent - win
        { final_score: 90, placement: 1, created_at: '2024-01-05' }, // Win
        { final_score: 80, placement: 1, created_at: '2024-01-04' }, // Win  
        { final_score: 70, placement: 2, created_at: '2024-01-03' }, // Loss - breaks streak
        { final_score: 95, placement: 1, created_at: '2024-01-02' }, // Win
        { final_score: 85, placement: 1, created_at: '2024-01-01' }, // Win
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: gameResults, error: null }),
      });

      // Mock activity count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 8, error: null }),
      });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.streakCount).toBe(3); // Most recent 3 wins
      expect(result.data?.totalGames).toBe(6);
      expect(result.data?.gamesWon).toBe(5);
    });

    it('should handle user stats calculation with null profile data (line 127-134)', async () => {
      // Mock null profile data
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: null,
          error: null,
        })
      );

      // Mock user statistics
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            total_games: 10,
            games_won: 5,
            total_score: 1000,
            average_score: 100,
            current_win_streak: 2,
          },
          error: null,
        })
      );

      // Mock game results (fallback)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Mock activity count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 3, error: null }),
      });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalGames: 10,
        gamesWon: 5,
        winRate: 50,
        totalScore: 1000,
        averageScore: 100,
        streakCount: 2,
        rank: 'Intermediate',
        badgeCount: 3,
        joinDate: expect.any(String), // Falls back to current date
        lastActive: expect.any(String), // Falls back to current date
      });
    });

    it('should handle edge case where profile data fails but other queries succeed', async () => {
      // Mock profile data with error
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Profile fetch failed' },
        })
      );

      // Mock user statistics
      mockFrom.single.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            total_games: 5,
            games_won: 3,
            total_score: 500,
            average_score: 100,
            current_win_streak: 1,
          },
          error: null,
        })
      );

      // Mock game results (fallback)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Mock activity count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 2, error: null }),
      });

      const result = await userService.getUserStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalGames: 5,
        gamesWon: 3,
        winRate: 60,
        rank: 'Intermediate',
        badgeCount: 2,
        joinDate: expect.any(String), // Falls back to current date
        lastActive: expect.any(String), // Falls back to current date
      });
    });
  });

  describe('uploadAvatar - additional edge cases', () => {
    it('should handle upload failure', async () => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      mockStorage.upload.mockResolvedValueOnce({
        error: { message: 'Upload failed' },
      });

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle missing file extension', async () => {
      const file = new File(['test'], 'avatar', { type: 'image/jpeg' });

      mockStorage.upload.mockResolvedValueOnce({ error: null });
      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/avatar.undefined' },
      });
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(true);
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringContaining('user-123-'),
        file,
        expect.any(Object)
      );
    });

    it('should handle unexpected error during upload', async () => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      mockStorage.upload.mockRejectedValueOnce(new Error('Network error'));

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('removeAvatar - additional edge cases', () => {
    it('should handle user fetch error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle avatar URL without storage path', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { avatar_url: 'https://external.com/avatar.jpg' },
        error: null,
      });
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      // Should not call storage.remove for external URLs
      expect(mockStorage.remove).not.toHaveBeenCalled();
    });

    it('should handle null avatar URL', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { avatar_url: null },
        error: null,
      });
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockStorage.remove).not.toHaveBeenCalled();
    });

    it('should handle profile update error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { avatar_url: 'https://storage.example.com/avatars/user-123.jpg' },
        error: null,
      });
      mockStorage.remove.mockResolvedValueOnce({ error: null });
      mockFrom.eq.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('followUser - additional edge cases', () => {
    it('should handle follow database error', async () => {
      mockFrom.insert.mockResolvedValueOnce({
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await userService.followUser('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle activity logging failure gracefully', async () => {
      mockFrom.insert.mockResolvedValueOnce({ error: null });
      // Mock logUserActivity failure
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Activity log failed' },
      });

      const result = await userService.followUser('user-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      // The function should still succeed even if activity logging fails
    });

    it('should handle unexpected error in followUser', async () => {
      mockFrom.insert.mockRejectedValueOnce(new Error('Network error'));

      const result = await userService.followUser('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('unfollowUser - additional edge cases', () => {
    it('should handle unfollow database error', async () => {
      // Mock the delete operation chain
      const mockDeleteChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      };
      
      mockFrom.delete.mockReturnValueOnce(mockDeleteChain);

      const result = await userService.unfollowUser('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected error in unfollowUser', async () => {
      // Mock the delete operation to throw an error
      mockFrom.delete.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const result = await userService.unfollowUser('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getUserActivities - additional edge cases', () => {
    it('should handle database error in getUserActivities', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await userService.getUserActivities('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected error in getUserActivities', async () => {
      mockFrom.range.mockRejectedValueOnce(new Error('Network error'));

      const result = await userService.getUserActivities('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('logUserActivity - additional edge cases', () => {
    it('should handle JSON serialization of complex metadata', async () => {
      const activity: ActivityLogRequest = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'activity-123' },
        error: null,
      });

      const result = await userService.logUserActivity('user-123', activity);

      expect(result.success).toBe(true);
      expect(mockFrom.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        activity_type: 'board_join',
        data: activity.metadata,
        created_at: expect.any(String),
      });
    });

    it('should handle database error in logUserActivity', async () => {
      const activity: ActivityLogRequest = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await userService.logUserActivity('user-123', activity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected error in logUserActivity', async () => {
      const activity: ActivityLogRequest = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };

      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await userService.logUserActivity('user-123', activity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getActivitySummary - additional edge cases', () => {
    it('should handle partial query failures gracefully', async () => {
      // Mock some queries succeeding and others failing
      const successCount = { count: 5, error: null };
      const failureCount = { count: null, error: { message: 'Query failed' } };
      const recentActivities = {
        data: [{ id: '1', activity_type: 'board_join' }],
        error: null,
      };

      const mockQueries = [
        jest.fn().mockResolvedValue(successCount),
        jest.fn().mockResolvedValue(failureCount),
        jest.fn().mockResolvedValue(successCount),
        jest.fn().mockResolvedValue(recentActivities),
      ];

      let callIndex = 0;
      mockSupabase.from.mockImplementation(() => {
        const query = mockQueries[callIndex];
        callIndex++;
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                then: query().then,
              }),
            }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: query().then,
              }),
            }),
          }),
        };
      });

      const result = await userService.getActivitySummary('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        todayCount: 5,
        weekCount: 0, // Failed query returns 0
        monthCount: 5,
        recentActivities: recentActivities.data,
      });
    });

    it('should handle unexpected error in getActivitySummary', async () => {
      // Force an error by making Promise.all reject
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await userService.getActivitySummary('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('Avatar handling validation edge cases (lines 153-230)', () => {
    it('should handle file extension extraction for complex filenames', async () => {
      const file = new File(['test'], 'my.complex.avatar.file.jpg', { type: 'image/jpeg' });

      mockStorage.upload.mockResolvedValueOnce({ error: null });
      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/avatar.jpg' },
      });
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(true);
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringContaining('user-123-'),
        file,
        expect.objectContaining({
          upsert: true,
          cacheControl: '3600',
        })
      );
      // Should extract 'jpg' from 'my.complex.avatar.file.jpg'
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/avatars\/user-123-\d+\.jpg$/),
        file,
        expect.any(Object)
      );
    });

    it('should handle avatar creation validation failures', async () => {
      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      mockStorage.upload.mockResolvedValueOnce({ error: null });
      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/avatar.jpg' },
      });
      
      // Mock validation failure during profile update - need to set up the chain properly
      const mockUpdateChain = jest.fn().mockResolvedValue({
        error: { 
          code: '23502', 
          message: 'null value in column "avatar_url" violates not-null constraint' 
        },
      });
      mockFrom.update.mockReturnValueOnce({
        eq: mockUpdateChain,
      });

      const result = await userService.uploadAvatar('user-123', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('null value in column "avatar_url" violates not-null constraint');
      expect(mockStorage.remove).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update avatar URL',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'uploadAvatar',
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle avatar removal with complex storage URLs', async () => {
      const complexAvatarUrl = 'https://storage.supabase.co/v1/object/public/avatars/user-123-1640995200000.jpg?token=abc123';

      mockFrom.single.mockResolvedValueOnce({
        data: { avatar_url: complexAvatarUrl },
        error: null,
      });
      mockStorage.remove.mockResolvedValueOnce({ error: null });
      
      // Mock update chain for profile update
      const mockUpdateChain = jest.fn().mockResolvedValue({ error: null });
      mockFrom.update.mockReturnValueOnce({
        eq: mockUpdateChain,
      });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(true);
      expect(mockStorage.remove).toHaveBeenCalledWith(['avatars/user-123-1640995200000.jpg?token=abc123']);
    });

    it('should handle storage removal failure during avatar removal', async () => {
      const avatarUrl = 'https://storage.example.com/avatars/user-123-12345.jpg';

      mockFrom.single.mockResolvedValueOnce({
        data: { avatar_url: avatarUrl },
        error: null,
      });
      mockStorage.remove.mockResolvedValueOnce({
        error: { message: 'Storage removal failed' },
      });
      
      // Mock update chain for profile update
      const mockUpdateChain = jest.fn().mockResolvedValue({ error: null });
      mockFrom.update.mockReturnValueOnce({
        eq: mockUpdateChain,
      });

      const result = await userService.removeAvatar('user-123');

      expect(result.success).toBe(true); // Should still succeed even if storage removal fails
      expect(result.data).toBe(true);
      expect(mockFrom.update).toHaveBeenCalledWith({
        avatar_url: null,
        updated_at: expect.any(String),
      });
    });
  });

  describe('Follow system database error scenarios (lines 261-282)', () => {
    it('should handle database constraint violation during follow', async () => {
      mockFrom.insert.mockResolvedValueOnce({
        error: { 
          code: '23503', 
          message: 'insert or update on table "user_friends" violates foreign key constraint' 
        },
      });

      const result = await userService.followUser('user-123', 'nonexistent-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('insert or update on table "user_friends" violates foreign key constraint');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to follow user',
        expect.objectContaining({ code: '23503' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'followUser',
            followerId: 'user-123',
            followingId: 'nonexistent-user',
          }),
        })
      );
    });

    it('should handle database timeout during follow operation', async () => {
      mockFrom.insert.mockResolvedValueOnce({
        error: { 
          code: '57014', 
          message: 'canceling statement due to statement timeout' 
        },
      });

      const result = await userService.followUser('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('canceling statement due to statement timeout');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle connection failure during unfollow operation', async () => {
      const mockDeleteChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { 
              code: '08006', 
              message: 'connection to server was lost' 
            },
          }),
        }),
      };
      
      mockFrom.delete.mockReturnValueOnce(mockDeleteChain);

      const result = await userService.unfollowUser('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('connection to server was lost');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to unfollow user',
        expect.objectContaining({ code: '08006' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'unfollowUser',
            followerId: 'user-123',
            followingId: 'user-456',
          }),
        })
      );
    });
  });

  describe('Activity logging partial failures and retry logic (lines 332-339)', () => {
    it('should handle JSON serialization failure in activity metadata', async () => {
      const activityWithCircularRef: any = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };
      
      // Create circular reference
      activityWithCircularRef.metadata.self = activityWithCircularRef;

      const result = await userService.logUserActivity('user-123', activityWithCircularRef);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Converting circular structure to JSON');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error logging user activity',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'logUserActivity',
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle activity insertion constraint violation', async () => {
      const activity: ActivityLogRequest = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { 
          code: '23503', 
          message: 'insert or update on table "user_activity" violates foreign key constraint' 
        },
      });

      const result = await userService.logUserActivity('user-123', activity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('insert or update on table "user_activity" violates foreign key constraint');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to log user activity',
        expect.objectContaining({ code: '23503' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'logUserActivity',
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle partial activity data corruption', async () => {
      const activity: ActivityLogRequest = {
        type: 'board_join',
        description: 'Joined a board',
        metadata: {
          board_id: 'board-123',
          board_title: 'Test Board',
          game_type: 'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { id: null }, // Corrupted data - no actual ID
        error: null,
      });

      const result = await userService.logUserActivity('user-123', activity);

      expect(result.success).toBe(true);
      expect(result.data).toBe(''); // Should handle null ID gracefully
    });
  });

  describe('Profile update concurrency conflicts (lines 398)', () => {
    it('should handle concurrent profile update conflicts', async () => {
      const updates = { username: 'newusername' };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { 
          code: '40001', 
          message: 'could not serialize access due to concurrent update' 
        },
      });

      const result = await userService.updateUserProfile('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('could not serialize access due to concurrent update');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update user profile',
        expect.objectContaining({ code: '40001' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'updateUserProfile',
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle optimistic locking failures during profile updates', async () => {
      const updates = { 
        username: 'newusername',
        updated_at: '2024-01-01T00:00:00Z' // Outdated timestamp
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { 
          code: 'PGRST116', 
          message: 'The result contains 0 rows' 
        },
      });

      const result = await userService.updateUserProfile('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('The result contains 0 rows');
    });
  });

  describe('User search and filtering edge cases (lines 509-549)', () => {
    it('should handle complex activity filtering with edge dates', async () => {
      const edgeCaseOptions: ActivityOptions = {
        limit: 100,
        offset: 0,
        type: 'achievement_unlock' as const,
        fromDate: '2024-02-29T23:59:59.999Z', // Leap year edge case
        toDate: '2024-03-01T00:00:00.000Z',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await userService.getUserActivities('user-123', edgeCaseOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockFrom.eq).toHaveBeenCalledWith('activity_type', 'achievement_unlock');
      expect(mockFrom.gte).toHaveBeenCalledWith('created_at', '2024-02-29T23:59:59.999Z');
      expect(mockFrom.lte).toHaveBeenCalledWith('created_at', '2024-03-01T00:00:00.000Z');
      expect(mockFrom.range).toHaveBeenCalledWith(0, 99);
    });

    it('should handle large offset pagination edge cases', async () => {
      const largeOffsetOptions: ActivityOptions = {
        limit: 50,
        offset: 9950, // Near database limit
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await userService.getUserActivities('user-123', largeOffsetOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockFrom.range).toHaveBeenCalledWith(9950, 9999);
    });

    it('should handle activity query timeout gracefully', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { 
          code: '57014', 
          message: 'canceling statement due to statement timeout' 
        },
      });

      const result = await userService.getUserActivities('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('canceling statement due to statement timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get user activities',
        expect.objectContaining({ code: '57014' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'getUserActivities',
            userId: 'user-123',
          }),
        })
      );
    });
  });

  describe('Complex user query operations (lines 651)', () => {
    it('should handle profile validation failures during fetch', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { 
          code: '42703', 
          message: 'column "invalid_column" does not exist' 
        },
      });

      const result = await userService.getUserProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('column "invalid_column" does not exist');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get user profile',
        expect.objectContaining({ code: '42703' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'getUserProfile',
            userId: 'user-123',
          }),
        })
      );
    });

    it('should handle database schema validation errors', async () => {
      const invalidUpdates = { 
        username: 'a'.repeat(256), // Exceeds username length limit
        email: 'invalid-email-format'
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { 
          code: '23514', 
          message: 'new row for relation "users" violates check constraint' 
        },
      });

      const result = await userService.updateUserProfile('user-123', invalidUpdates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('new row for relation "users" violates check constraint');
    });
  });

  describe('User management edge cases (lines 684-696)', () => {
    it('should handle follow status check with database index corruption', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { 
          code: '23P01', 
          message: 'could not read block 0 in file "base/16384/1234": Input/output error' 
        },
      });

      const result = await userService.isFollowing('user-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('could not read block 0 in file "base/16384/1234": Input/output error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check follow status',
        expect.objectContaining({ code: '23P01' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'isFollowing',
            followerId: 'user-123',
            followingId: 'user-456',
          }),
        })
      );
    });

    it('should handle self-follow validation gracefully', async () => {
      mockFrom.insert.mockResolvedValueOnce({
        error: { 
          code: '23514', 
          message: 'new row violates check constraint "user_friends_self_follow_check"' 
        },
      });

      const result = await userService.followUser('user-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('new row violates check constraint "user_friends_self_follow_check"');
    });

    it('should handle activity summary with corrupted date calculations', async () => {
      // Mock Date constructor to return invalid date
      const originalDate = global.Date;
      global.Date = jest.fn(() => ({ 
        getFullYear: () => NaN,
        getMonth: () => NaN,
        getDate: () => NaN,
        getTime: () => NaN,
        toISOString: () => { throw new Error('Invalid Date'); }
      })) as any;

      const result = await userService.getActivitySummary('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Date');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get activity summary',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'user.service',
            method: 'getActivitySummary',
            userId: 'user-123',
          }),
        })
      );

      // Restore original Date
      global.Date = originalDate;
    });
  });
});