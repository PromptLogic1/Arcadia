/**
 * User Service
 *
 * Pure service functions for user profile operations.
 * Handles user profile data, statistics, and activity tracking.
 * Follows the modern architecture pattern - no state management, only API calls.
 */

import { createClient } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { getErrorMessage } from '@/lib/error-guards';
import { log } from '@/lib/logger';
import type {
  ActivityData,
  ActivityType,
} from '@/features/user/types/activity';

type UserProfile = Database['public']['Tables']['users']['Row'];
type UserProfileUpdate = Database['public']['Tables']['users']['Update'];
type Activity = Database['public']['Tables']['user_activity']['Row'];

export interface UserStats {
  totalGames: number;
  gamesWon: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  streakCount: number;
  joinDate: string;
  lastActive: string;
  rank: string;
  badgeCount: number;
  favoriteGameMode?: string;
}

export interface ActivityOptions {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  fromDate?: string;
  toDate?: string;
}

export interface ActivityLogRequest {
  type: ActivityType;
  description: string;
  metadata: ActivityData;
  points_earned?: number;
}

export type UserServiceResponse<T = UserProfile> = ServiceResponse<T>;

// Remove custom response type - use standard ServiceResponse

/**
 * User profile service with pure API functions
 */
export const userService = {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        log.error('Failed to get user profile', error, {
          metadata: {
            service: 'user.service',
            method: 'getUserProfile',
            userId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      log.error('Unexpected error getting user profile', error, {
        metadata: { service: 'user.service', method: 'getUserProfile', userId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        log.error('Failed to update user profile', error, {
          metadata: {
            service: 'user.service',
            method: 'updateUserProfile',
            userId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      log.error('Unexpected error updating user profile', error, {
        metadata: {
          service: 'user.service',
          method: 'updateUserProfile',
          userId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get user statistics and achievements
   */
  async getUserStats(userId: string): Promise<ServiceResponse<UserStats>> {
    const supabase = createClient();

    try {
      // Get user profile for basic info
      const { data: profile } = await supabase
        .from('users')
        .select('created_at, last_login_at')
        .eq('id', userId)
        .single();

      // Get game statistics from user_statistics table (preferred)
      const { data: userStats } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fallback: Get individual game results if user_statistics doesn't exist
      const { data: gameResults } = await supabase
        .from('game_results')
        .select('final_score, placement, created_at')
        .eq('user_id', userId);

      // Get activity count for badges
      const { count: activityCount } = await supabase
        .from('user_activity')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('activity_type', 'achievement_unlock');

      // Use user_statistics if available, otherwise calculate from individual results
      let totalGames, gamesWon, winRate, totalScore, averageScore, streakCount;

      if (userStats) {
        // Use aggregated statistics
        totalGames = userStats.total_games || 0;
        gamesWon = userStats.games_won || 0;
        winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
        totalScore = userStats.total_score || 0;
        averageScore = userStats.average_score || 0;
        streakCount = userStats.current_win_streak || 0;
      } else {
        // Calculate from individual game results
        totalGames = gameResults?.length || 0;
        gamesWon =
          gameResults?.filter(game => game.placement === 1).length || 0;
        winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
        totalScore =
          gameResults?.reduce(
            (sum, game) => sum + (game.final_score || 0),
            0
          ) || 0;
        averageScore = totalGames > 0 ? totalScore / totalGames : 0;

        // Calculate current streak (simplified)
        const recentGames = gameResults?.slice(-10) || [];
        streakCount = 0;
        for (let i = recentGames.length - 1; i >= 0; i--) {
          const game = recentGames[i];
          if (game && game.placement === 1) {
            streakCount++;
          } else {
            break;
          }
        }
      }

      // Determine rank based on win rate and games played
      let rank = 'Beginner';
      if (totalGames >= 50 && winRate >= 80) rank = 'Master';
      else if (totalGames >= 25 && winRate >= 70) rank = 'Expert';
      else if (totalGames >= 10 && winRate >= 60) rank = 'Advanced';
      else if (totalGames >= 5 && winRate >= 50) rank = 'Intermediate';

      const stats: UserStats = {
        totalGames,
        gamesWon,
        winRate: Math.round(winRate * 100) / 100,
        totalScore,
        averageScore: Math.round(averageScore * 100) / 100,
        streakCount,
        joinDate: profile?.created_at || new Date().toISOString(),
        lastActive: profile?.last_login_at || new Date().toISOString(),
        rank,
        badgeCount: activityCount || 0,
        favoriteGameMode: 'Bingo', // Could be calculated from game history
      };

      return createServiceSuccess(stats);
    } catch (error) {
      log.error('Failed to get user stats', error, {
        metadata: { service: 'user.service', method: 'getUserStats', userId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get user activities with pagination and filtering
   */
  async getUserActivities(
    userId: string,
    options: ActivityOptions = {}
  ): Promise<ServiceResponse<Activity[]>> {
    try {
      const supabase = createClient();
      const { limit = 20, offset = 0, type, fromDate, toDate } = options;

      let query = supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('activity_type', type);
      }

      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }

      if (toDate) {
        query = query.lte('created_at', toDate);
      }

      const { data, error } = await query;

      if (error) {
        log.error('Failed to get user activities', error, {
          metadata: {
            service: 'user.service',
            method: 'getUserActivities',
            userId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data || []);
    } catch (error) {
      log.error('Unexpected error getting user activities', error, {
        metadata: {
          service: 'user.service',
          method: 'getUserActivities',
          userId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Log user activity
   */
  async logUserActivity(
    userId: string,
    activity: ActivityLogRequest
  ): Promise<ServiceResponse<string>> {
    try {
      const supabase = createClient();

      // Convert metadata to JSON-compatible format
      const jsonData = JSON.parse(JSON.stringify(activity.metadata));

      const { data, error } = await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          activity_type: activity.type,
          data: jsonData,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        log.error('Failed to log user activity', error, {
          metadata: {
            service: 'user.service',
            method: 'logUserActivity',
            userId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data?.id || '');
    } catch (error) {
      log.error('Unexpected error logging user activity', error, {
        metadata: {
          service: 'user.service',
          method: 'logUserActivity',
          userId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get user's recent activity summary
   */
  async getActivitySummary(userId: string): Promise<
    ServiceResponse<{
      todayCount: number;
      weekCount: number;
      monthCount: number;
      recentActivities: Activity[];
    }>
  > {
    const supabase = createClient();

    try {
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      const weekAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const monthAgo = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Get counts for different periods
      const [todayRes, weekRes, monthRes, recentRes] = await Promise.all([
        supabase
          .from('user_activity')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', today),

        supabase
          .from('user_activity')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', weekAgo),

        supabase
          .from('user_activity')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', monthAgo),

        supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      return createServiceSuccess({
        todayCount: todayRes.count || 0,
        weekCount: weekRes.count || 0,
        monthCount: monthRes.count || 0,
        recentActivities: recentRes.data || [],
      });
    } catch (error) {
      log.error('Failed to get activity summary', error, {
        metadata: {
          service: 'user.service',
          method: 'getActivitySummary',
          userId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<ServiceResponse<string>> {
    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        log.error('Failed to upload avatar', uploadError, {
          metadata: {
            service: 'user.service',
            method: 'uploadAvatar',
            userId,
          },
        });
        return createServiceError(uploadError.message);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        // Try to delete uploaded file
        await supabase.storage.from('avatars').remove([filePath]);

        log.error('Failed to update avatar URL', updateError, {
          metadata: {
            service: 'user.service',
            method: 'uploadAvatar',
            userId,
          },
        });
        return createServiceError(updateError.message);
      }

      log.info('Avatar uploaded successfully', {
        metadata: { userId, filePath },
      });

      return createServiceSuccess(publicUrl);
    } catch (error) {
      log.error('Unexpected error uploading avatar', error, {
        metadata: {
          service: 'user.service',
          method: 'uploadAvatar',
          userId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Remove user avatar
   */
  async removeAvatar(userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const supabase = createClient();

      // Get current avatar URL to delete from storage
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (fetchError) {
        log.error('Failed to fetch user for avatar removal', fetchError, {
          metadata: {
            service: 'user.service',
            method: 'removeAvatar',
            userId,
          },
        });
        return createServiceError(fetchError.message);
      }

      // Extract file path from URL if it's a storage URL
      if (user?.avatar_url?.includes('avatars/')) {
        const urlParts = user.avatar_url.split('avatars/');
        if (urlParts.length > 1) {
          const filePath = `avatars/${urlParts[1]}`;
          await supabase.storage.from('avatars').remove([filePath]);
        }
      }

      // Update user profile to remove avatar
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        log.error('Failed to remove avatar URL', updateError, {
          metadata: {
            service: 'user.service',
            method: 'removeAvatar',
            userId,
          },
        });
        return createServiceError(updateError.message);
      }

      return createServiceSuccess(true);
    } catch (error) {
      log.error('Unexpected error removing avatar', error, {
        metadata: {
          service: 'user.service',
          method: 'removeAvatar',
          userId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Follow a user
   */
  async followUser(
    followerId: string,
    followingId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const supabase = createClient();

      const { error } = await supabase.from('user_friends').insert({
        user_id: followerId,
        friend_id: followingId,
        status: 'following',
        created_at: new Date().toISOString(),
      });

      if (error) {
        // Check if already following
        if (error.code === '23505') {
          return createServiceSuccess(true);
        }

        log.error('Failed to follow user', error, {
          metadata: {
            service: 'user.service',
            method: 'followUser',
            followerId,
            followingId,
          },
        });
        return createServiceError(error.message);
      }

      // Log activity
      await userService.logUserActivity(followerId, {
        type: 'board_join',
        description: 'Started following a user',
        metadata: {
          board_id: followingId,
          board_title: 'Following user',
          game_type:
            'All Games' as Database['public']['Enums']['game_category'],
          difficulty: 'easy' as Database['public']['Enums']['difficulty_level'],
        },
      });

      return createServiceSuccess(true);
    } catch (error) {
      log.error('Unexpected error following user', error, {
        metadata: {
          service: 'user.service',
          method: 'followUser',
          followerId,
          followingId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(
    followerId: string,
    followingId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('user_friends')
        .delete()
        .eq('user_id', followerId)
        .eq('friend_id', followingId);

      if (error) {
        log.error('Failed to unfollow user', error, {
          metadata: {
            service: 'user.service',
            method: 'unfollowUser',
            followerId,
            followingId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(true);
    } catch (error) {
      log.error('Unexpected error unfollowing user', error, {
        metadata: {
          service: 'user.service',
          method: 'unfollowUser',
          followerId,
          followingId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Check if user is following another user
   */
  async isFollowing(
    followerId: string,
    followingId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('user_friends')
        .select('user_id')
        .eq('user_id', followerId)
        .eq('friend_id', followingId)
        .single();

      if (error) {
        // Not found is not an error in this case
        if (error.code === 'PGRST116') {
          return createServiceSuccess(false);
        }

        log.error('Failed to check follow status', error, {
          metadata: {
            service: 'user.service',
            method: 'isFollowing',
            followerId,
            followingId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(!!data);
    } catch (error) {
      log.error('Unexpected error checking follow status', error, {
        metadata: {
          service: 'user.service',
          method: 'isFollowing',
          followerId,
          followingId,
        },
      });
      return createServiceError(getErrorMessage(error));
    }
  },
};
