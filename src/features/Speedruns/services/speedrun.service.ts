import { createClient } from '@/lib/supabase';
import {
  createServiceError,
  createServiceSuccess,
  type ServiceResponse,
} from '@/lib/service-types';
import { getErrorMessage, isError } from '@/lib/error-guards';
import { log } from '@/lib/logger';
// Database types already imported via user statistics

export interface SpeedrunRecord {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  board_id: string;
  board_title: string;
  time_seconds: number;
  created_at: string;
  metadata?: {
    difficulty?: string;
    board_size?: number;
    [key: string]: unknown;
  };
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  fastest_win: number | null;
  total_wins: number;
  win_rate: number;
  last_game_at: string | null;
}

export const speedrunService = {
  async getLeaderboard(
    limit = 10,
    offset = 0
  ): Promise<ServiceResponse<LeaderboardEntry[]>> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('leaderboards')
        .select('*')
        .not('fastest_win', 'is', null)
        .order('fastest_win', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const leaderboard = (data || []).map((entry, index) => ({
        rank: offset + index + 1,
        user_id: entry.id || '',
        username: entry.username || 'Unknown',
        avatar_url: entry.avatar_url,
        fastest_win: entry.fastest_win,
        total_wins: entry.wins || 0,
        win_rate: entry.win_rate || 0,
        last_game_at: entry.last_game_at,
      }));

      return createServiceSuccess(leaderboard);
    } catch (error) {
      log.error(
        'Error fetching leaderboard',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'speedrunService',
            method: 'getLeaderboard',
            limit,
            offset,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async getUserSpeedruns(
    userId: string
  ): Promise<ServiceResponse<SpeedrunRecord[]>> {
    const supabase = createClient();

    try {
      // Get user's speedrun achievements
      const { data: achievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_type', 'speedrun')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user info
      const { data: userData } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      const speedruns = (achievements || []).map(achievement => {
        const metadata = achievement.metadata as Record<string, unknown> | null;
        return {
          id: achievement.id,
          user_id: achievement.user_id || userId,
          username: userData?.username || 'Unknown',
          avatar_url: userData?.avatar_url || null,
          board_id: (metadata?.boardId as string) || '',
          board_title: (metadata?.boardTitle as string) || 'Unknown Board',
          time_seconds: (metadata?.timeToWin as number) || 0,
          created_at: achievement.created_at || new Date().toISOString(),
          metadata: {
            difficulty: metadata?.difficulty as string | undefined,
            board_size: metadata?.board_size as number | undefined,
          },
        };
      });

      return createServiceSuccess(speedruns);
    } catch (error) {
      log.error(
        'Error fetching user speedruns',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'speedrunService',
            method: 'getUserSpeedruns',
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async submitSpeedrun(
    userId: string,
    boardId: string,
    timeSeconds: number,
    metadata?: Record<string, unknown>
  ): Promise<ServiceResponse<null>> {
    const supabase = createClient();

    try {
      // Get board info
      const { data: board } = await supabase
        .from('bingo_boards')
        .select('title, difficulty')
        .eq('id', boardId)
        .single();

      // Create speedrun achievement
      const { error: achievementError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_type: 'speedrun',
          achievement_name: `Speedrun: ${board?.title || 'Unknown Board'}`,
          description: `Completed in ${timeSeconds} seconds`,
          points: Math.max(100 - Math.floor(timeSeconds / 10), 10), // More points for faster times
          metadata: {
            boardId,
            boardTitle: board?.title,
            timeToWin: timeSeconds,
            difficulty: board?.difficulty,
            ...metadata,
          },
        });

      if (achievementError) throw achievementError;

      // Update user statistics if this is their fastest win
      const { data: stats } = await supabase
        .from('user_statistics')
        .select('fastest_win')
        .eq('user_id', userId)
        .single();

      if (!stats || !stats.fastest_win || timeSeconds < stats.fastest_win) {
        const { error: updateError } = await supabase
          .from('user_statistics')
          .update({ fastest_win: timeSeconds })
          .eq('user_id', userId);

        if (updateError) {
          log.warn('Failed to update user statistics', {
            metadata: {
              error: updateError,
              userId,
              timeSeconds,
            },
          });
        }
      }

      return createServiceSuccess(null);
    } catch (error) {
      log.error(
        'Error submitting speedrun',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'speedrunService',
            method: 'submitSpeedrun',
            userId,
            boardId,
            timeSeconds,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async getBoardSpeedruns(
    boardId: string,
    limit = 10
  ): Promise<ServiceResponse<SpeedrunRecord[]>> {
    const supabase = createClient();

    try {
      // Get speedrun achievements for this board
      const { data: achievements, error } = await supabase
        .from('user_achievements')
        .select(
          `
          *,
          users!user_achievements_user_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .eq('achievement_type', 'speedrun')
        .eq('metadata->>boardId', boardId)
        .order('metadata->>timeToWin', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const speedruns = (achievements || []).map(achievement => {
        const metadata = achievement.metadata as Record<string, unknown> | null;
        const user = achievement.users as unknown as {
          username: string;
          avatar_url: string | null;
        } | null;

        return {
          id: achievement.id,
          user_id: achievement.user_id || '',
          username: user?.username || 'Unknown',
          avatar_url: user?.avatar_url || null,
          board_id: boardId,
          board_title: (metadata?.boardTitle as string) || 'Unknown Board',
          time_seconds: (metadata?.timeToWin as number) || 0,
          created_at: achievement.created_at || new Date().toISOString(),
          metadata: {
            difficulty: metadata?.difficulty as string | undefined,
            board_size: metadata?.board_size as number | undefined,
          },
        };
      });

      return createServiceSuccess(speedruns);
    } catch (error) {
      log.error(
        'Error fetching board speedruns',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'speedrunService',
            method: 'getBoardSpeedruns',
            boardId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
