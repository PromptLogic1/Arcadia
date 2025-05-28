import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type {
  ActivityType,
  ActivityData,
  LogActivityRequest,
  BoardActivityData,
  SubmissionActivityData,
  DiscussionActivityData,
  CommentActivityData,
  AchievementActivityData,
  LoginActivityData,
} from '@/features/user/types/activity';
import type { Json } from '@/types/database.generated';

interface UseActivityTrackerOptions {
  enableAutoLogging?: boolean;
  batchSize?: number;
  onError?: (error: Error) => void;
}

interface UseActivityTrackerReturn {
  logActivity: (
    activityType: ActivityType,
    data?: ActivityData
  ) => Promise<string | null>;
  batchLogActivities: (activities: LogActivityRequest[]) => Promise<void>;
  isLogging: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useActivityTracker(
  options: UseActivityTrackerOptions = {}
): UseActivityTrackerReturn {
  const { enableAutoLogging = true, batchSize = 10, onError } = options;

  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logActivity = useCallback(
    async (
      activityType: ActivityType,
      data?: ActivityData
    ): Promise<string | null> => {
      if (!enableAutoLogging) {
        return null;
      }

      try {
        setIsLogging(true);
        setError(null);

        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error('User not authenticated');
        }

        // Call the database function to log activity
        const { data: activityId, error: dbError } = await supabase.rpc(
          'log_user_activity',
          {
            p_user_id: user.id,
            p_activity_type: activityType,
            p_data: (data || {}) as Json,
          }
        );

        if (dbError) {
          throw new Error(`Failed to log activity: ${dbError.message}`);
        }

        return activityId as string;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setIsLogging(false);
      }
    },
    [enableAutoLogging, onError, supabase]
  );

  const batchLogActivities = useCallback(
    async (activities: LogActivityRequest[]): Promise<void> => {
      if (!enableAutoLogging || activities.length === 0) {
        return;
      }

      try {
        setIsLogging(true);
        setError(null);

        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error('User not authenticated');
        }

        // Process activities in batches
        const batches = [];
        for (let i = 0; i < activities.length; i += batchSize) {
          batches.push(activities.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const promises = batch.map(activity =>
            supabase.rpc('log_user_activity', {
              p_user_id: user.id,
              p_activity_type: activity.activity_type,
              p_data: (activity.data || {}) as Json,
            })
          );

          const results = await Promise.allSettled(promises);

          // Check for any failures
          const failures = results.filter(
            result => result.status === 'rejected'
          );
          if (failures.length > 0) {
            logger.warn(
              `${failures.length} activities failed to log in batch`,
              {
                component: 'useActivityTracker',
                feature: 'activity-logging',
                metadata: {
                  totalActivities: batch.length,
                  failedCount: failures.length,
                  batchSize,
                },
              }
            );
          }
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        onError?.(error);
      } finally {
        setIsLogging(false);
      }
    },
    [enableAutoLogging, batchSize, onError, supabase]
  );

  return {
    logActivity,
    batchLogActivities,
    isLogging,
    error,
    clearError,
  };
}

// Convenience hooks for specific activity types
export function useLoginTracker() {
  const { logActivity } = useActivityTracker();

  return useCallback(
    async (loginData?: LoginActivityData) => {
      return logActivity('login', loginData);
    },
    [logActivity]
  );
}

export function useBoardActivityTracker() {
  const { logActivity } = useActivityTracker();

  return {
    logBoardCreate: useCallback(
      async (boardData: BoardActivityData) => {
        return logActivity('board_create', boardData);
      },
      [logActivity]
    ),

    logBoardJoin: useCallback(
      async (boardData: BoardActivityData) => {
        return logActivity('board_join', boardData);
      },
      [logActivity]
    ),

    logBoardComplete: useCallback(
      async (boardData: BoardActivityData) => {
        return logActivity('board_complete', boardData);
      },
      [logActivity]
    ),
  };
}

export function useSubmissionTracker() {
  const { logActivity } = useActivityTracker();

  return useCallback(
    async (submissionData: SubmissionActivityData) => {
      return logActivity('submission_create', submissionData);
    },
    [logActivity]
  );
}

export function useDiscussionTracker() {
  const { logActivity } = useActivityTracker();

  return {
    logDiscussionCreate: useCallback(
      async (discussionData: DiscussionActivityData) => {
        return logActivity('discussion_create', discussionData);
      },
      [logActivity]
    ),

    logCommentCreate: useCallback(
      async (commentData: CommentActivityData) => {
        return logActivity('comment_create', commentData);
      },
      [logActivity]
    ),
  };
}

export function useAchievementTracker() {
  const { logActivity } = useActivityTracker();

  return useCallback(
    async (achievementData: AchievementActivityData) => {
      return logActivity('achievement_unlock', achievementData);
    },
    [logActivity]
  );
}
