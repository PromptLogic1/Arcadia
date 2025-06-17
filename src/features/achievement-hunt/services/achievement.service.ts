import { createClient } from '@/lib/supabase';
import {
  createServiceError,
  createServiceSuccess,
  type ServiceResponse,
} from '@/lib/service-types';
import { getErrorMessage, isError } from '@/lib/error-guards';
import { log } from '@/lib/logger';
import type { Database } from '@/types/database.types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: string;
  points: number;
  icon?: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  metadata?: Record<string, unknown>;
}

export interface AchievementCategory {
  name: string;
  icon: string;
  achievements: Achievement[];
}

// Define all possible achievements
const ACHIEVEMENT_DEFINITIONS: Record<
  string,
  Omit<Achievement, 'id' | 'unlocked' | 'unlockedAt'>
> = {
  first_win: {
    name: 'First Victory',
    description: 'Win your first game',
    type: 'game_win',
    points: 50,
    icon: '🏆',
  },
  speedrun_novice: {
    name: 'Speedrun Novice',
    description: 'Complete a game in under 5 minutes',
    type: 'speedrun',
    points: 75,
    icon: '⚡',
  },
  speedrun_expert: {
    name: 'Speedrun Expert',
    description: 'Complete a game in under 2 minutes',
    type: 'speedrun',
    points: 150,
    icon: '🚀',
  },
  winning_streak_3: {
    name: 'On Fire',
    description: 'Win 3 games in a row',
    type: 'streak',
    points: 100,
    icon: '🔥',
  },
  winning_streak_5: {
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
    type: 'streak',
    points: 200,
    icon: '💪',
  },
  games_played_10: {
    name: 'Regular Player',
    description: 'Play 10 games',
    type: 'milestone',
    points: 50,
    icon: '🎮',
  },
  games_played_50: {
    name: 'Dedicated Gamer',
    description: 'Play 50 games',
    type: 'milestone',
    points: 150,
    icon: '🎯',
  },
  perfect_game: {
    name: 'Perfectionist',
    description: 'Win a game without any mistakes',
    type: 'special',
    points: 300,
    icon: '✨',
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Play with 10 different players',
    type: 'social',
    points: 100,
    icon: '🦋',
  },
  night_owl: {
    name: 'Night Owl',
    description: 'Win a game after midnight',
    type: 'special',
    points: 75,
    icon: '🦉',
  },
};

export const achievementService = {
  async getUserAchievements(
    userId: string
  ): Promise<ServiceResponse<Achievement[]>> {
    const supabase = createClient();

    try {
      // Get user's unlocked achievements
      const { data: unlockedAchievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Get user statistics for progress tracking
      const { data: stats } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Map achievements
      const achievements: Achievement[] = Object.entries(
        ACHIEVEMENT_DEFINITIONS
      ).map(([key, definition]) => {
        const unlocked = unlockedAchievements?.find(
          a =>
            a.achievement_type === definition.type &&
            a.achievement_name === definition.name
        );

        let progress: number | undefined;
        let maxProgress: number | undefined;

        // Calculate progress for different achievement types
        if (!unlocked && stats) {
          switch (key) {
            case 'winning_streak_3':
              progress = stats.current_win_streak || 0;
              maxProgress = 3;
              break;
            case 'winning_streak_5':
              progress = stats.current_win_streak || 0;
              maxProgress = 5;
              break;
            case 'games_played_10':
              progress = stats.total_games || 0;
              maxProgress = 10;
              break;
            case 'games_played_50':
              progress = stats.total_games || 0;
              maxProgress = 50;
              break;
            case 'speedrun_novice':
              if (stats.fastest_win && stats.fastest_win < 300) {
                progress = 1;
                maxProgress = 1;
              }
              break;
            case 'speedrun_expert':
              if (stats.fastest_win && stats.fastest_win < 120) {
                progress = 1;
                maxProgress = 1;
              }
              break;
          }
        }

        return {
          id: key,
          ...definition,
          unlocked: !!unlocked,
          unlockedAt: unlocked?.created_at || undefined,
          progress,
          maxProgress,
          metadata: unlocked?.metadata as Record<string, unknown> | undefined,
        };
      });

      return createServiceSuccess(achievements);
    } catch (error) {
      log.error(
        'Error fetching user achievements',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'achievementService',
            method: 'getUserAchievements',
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async checkAndUnlockAchievements(
    userId: string
  ): Promise<ServiceResponse<string[]>> {
    const supabase = createClient();
    const unlockedAchievements: string[] = [];

    try {
      // Get user statistics
      const { data: stats, error: statsError } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError || !stats) {
        return createServiceSuccess(unlockedAchievements);
      }

      // Get already unlocked achievements
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('achievement_name')
        .eq('user_id', userId);

      const existingNames = new Set(
        existing?.map(a => a.achievement_name) || []
      );

      // Check each achievement
      const achievementsToUnlock: Database['public']['Tables']['user_achievements']['Insert'][] =
        [];

      // First win
      if (
        !existingNames.has('First Victory') &&
        stats.games_won &&
        stats.games_won > 0
      ) {
        achievementsToUnlock.push({
          user_id: userId,
          achievement_type: 'game_win',
          achievement_name: 'First Victory',
          points: 50,
          description: 'Won first game',
        });
        unlockedAchievements.push('First Victory');
      }

      // Speedrun achievements
      if (stats.fastest_win) {
        if (!existingNames.has('Speedrun Novice') && stats.fastest_win < 300) {
          achievementsToUnlock.push({
            user_id: userId,
            achievement_type: 'speedrun',
            achievement_name: 'Speedrun Novice',
            points: 75,
            description: 'Completed a game in under 5 minutes',
            metadata: { time: stats.fastest_win },
          });
          unlockedAchievements.push('Speedrun Novice');
        }

        if (!existingNames.has('Speedrun Expert') && stats.fastest_win < 120) {
          achievementsToUnlock.push({
            user_id: userId,
            achievement_type: 'speedrun',
            achievement_name: 'Speedrun Expert',
            points: 150,
            description: 'Completed a game in under 2 minutes',
            metadata: { time: stats.fastest_win },
          });
          unlockedAchievements.push('Speedrun Expert');
        }
      }

      // Streak achievements
      if (
        !existingNames.has('On Fire') &&
        stats.longest_win_streak &&
        stats.longest_win_streak >= 3
      ) {
        achievementsToUnlock.push({
          user_id: userId,
          achievement_type: 'streak',
          achievement_name: 'On Fire',
          points: 100,
          description: 'Won 3 games in a row',
          metadata: { streak: stats.longest_win_streak },
        });
        unlockedAchievements.push('On Fire');
      }

      if (
        !existingNames.has('Unstoppable') &&
        stats.longest_win_streak &&
        stats.longest_win_streak >= 5
      ) {
        achievementsToUnlock.push({
          user_id: userId,
          achievement_type: 'streak',
          achievement_name: 'Unstoppable',
          points: 200,
          description: 'Won 5 games in a row',
          metadata: { streak: stats.longest_win_streak },
        });
        unlockedAchievements.push('Unstoppable');
      }

      // Games played milestones
      if (
        !existingNames.has('Regular Player') &&
        stats.total_games &&
        stats.total_games >= 10
      ) {
        achievementsToUnlock.push({
          user_id: userId,
          achievement_type: 'milestone',
          achievement_name: 'Regular Player',
          points: 50,
          description: 'Played 10 games',
          metadata: { games: stats.total_games },
        });
        unlockedAchievements.push('Regular Player');
      }

      if (
        !existingNames.has('Dedicated Gamer') &&
        stats.total_games &&
        stats.total_games >= 50
      ) {
        achievementsToUnlock.push({
          user_id: userId,
          achievement_type: 'milestone',
          achievement_name: 'Dedicated Gamer',
          points: 150,
          description: 'Played 50 games',
          metadata: { games: stats.total_games },
        });
        unlockedAchievements.push('Dedicated Gamer');
      }

      // Insert new achievements
      if (achievementsToUnlock.length > 0) {
        const { error: insertError } = await supabase
          .from('user_achievements')
          .insert(achievementsToUnlock);

        if (insertError) {
          log.warn('Failed to unlock achievements', {
            metadata: {
              error: insertError,
              userId,
              achievements: unlockedAchievements,
            },
          });
        }
      }

      return createServiceSuccess(unlockedAchievements);
    } catch (error) {
      log.error(
        'Error checking achievements',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'achievementService',
            method: 'checkAndUnlockAchievements',
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async getAchievementCategories(
    userId: string
  ): Promise<ServiceResponse<AchievementCategory[]>> {
    const achievementsResponse = await this.getUserAchievements(userId);

    if (!achievementsResponse.success) {
      return createServiceError(
        achievementsResponse.error || 'Failed to fetch achievements'
      );
    }

    const achievements = achievementsResponse.data;

    const categories: AchievementCategory[] = [
      {
        name: 'Victories',
        icon: '🏆',
        achievements: achievements?.filter(a => a.type === 'game_win') || [],
      },
      {
        name: 'Speed Runs',
        icon: '⚡',
        achievements: achievements?.filter(a => a.type === 'speedrun') || [],
      },
      {
        name: 'Win Streaks',
        icon: '🔥',
        achievements: achievements?.filter(a => a.type === 'streak') || [],
      },
      {
        name: 'Milestones',
        icon: '🎯',
        achievements: achievements?.filter(a => a.type === 'milestone') || [],
      },
      {
        name: 'Special',
        icon: '✨',
        achievements: achievements?.filter(a => a.type === 'special') || [],
      },
      {
        name: 'Social',
        icon: '🦋',
        achievements: achievements?.filter(a => a.type === 'social') || [],
      },
    ];

    return createServiceSuccess(categories);
  },
};
