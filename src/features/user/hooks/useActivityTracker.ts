/**
 * Activity Tracker Hook
 *
 * Modern implementation using TanStack Query mutations and the service layer.
 * Replaces direct Supabase usage with the established architecture pattern.
 */

import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/stores';
import { useLogActivityMutation } from '@/hooks/queries/useUserProfileQueries';
import type { ActivityLogRequest } from '../../../services/user.service';
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

interface UseActivityTrackerOptions {
  enableAutoLogging?: boolean;
  batchSize?: number;
  onError?: (error: Error) => void;
  onSuccess?: (activityId: string) => void;
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

/**
 * Activity tracker hook using TanStack Query
 */
export function useActivityTracker(
  options: UseActivityTrackerOptions = {}
): UseActivityTrackerReturn {
  const {
    enableAutoLogging = true,
    batchSize = 10,
    onError,
    onSuccess,
  } = options;

  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { userData } = useAuth();
  const logActivityMutation = useLogActivityMutation();

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

      if (!userData?.id) {
        const authError = new Error('User not authenticated');
        setError(authError);
        onError?.(authError);
        return null;
      }

      try {
        setIsLogging(true);
        setError(null);

        // Convert activity type and data to service format
        const activityData: ActivityLogRequest = {
          type: activityType,
          description: generateActivityDescription(activityType, data),
          metadata: data || ({} as ActivityData),
          points_earned: calculatePointsEarned(activityType, data),
        };

        const result = await logActivityMutation.mutateAsync({
          userId: userData.id,
          activity: activityData,
        });

        if (
          result &&
          typeof result === 'object' &&
          'error' in result &&
          result.error
        ) {
          throw new Error(result.error as string);
        }

        const activityId =
          result && typeof result === 'object' && 'data' in result
            ? result.data
            : null;
        if (activityId && typeof activityId === 'string') {
          onSuccess?.(activityId);
        }

        return activityId as string | null;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        onError?.(error);
        logger.error('Activity logging failed', error, {
          component: 'useActivityTracker',
          metadata: {
            userId: userData.id,
            activityType,
            data,
          },
        });
        return null;
      } finally {
        setIsLogging(false);
      }
    },
    [enableAutoLogging, userData?.id, logActivityMutation, onError, onSuccess]
  );

  const batchLogActivities = useCallback(
    async (activities: LogActivityRequest[]): Promise<void> => {
      if (!enableAutoLogging || activities.length === 0) {
        return;
      }

      if (!userData?.id) {
        const authError = new Error('User not authenticated');
        setError(authError);
        onError?.(authError);
        return;
      }

      try {
        setIsLogging(true);
        setError(null);

        // Process activities in batches to avoid overwhelming the server
        const batches = [];
        for (let i = 0; i < activities.length; i += batchSize) {
          batches.push(activities.slice(i, i + batchSize));
        }

        let totalFailures = 0;

        for (const batch of batches) {
          const promises = batch.map(async activity => {
            const activityData: ActivityLogRequest = {
              type: activity.activity_type,
              description: generateActivityDescription(
                activity.activity_type,
                activity.data
              ),
              metadata: activity.data || ({} as ActivityData),
              points_earned: calculatePointsEarned(
                activity.activity_type,
                activity.data
              ),
            };

            return logActivityMutation.mutateAsync({
              userId: userData.id,
              activity: activityData,
            });
          });

          const results = await Promise.allSettled(promises);

          // Count and log failures
          const failures = results.filter(
            (result): result is PromiseRejectedResult =>
              result.status === 'rejected'
          );

          totalFailures += failures.length;

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
                  errors: failures.map(
                    f => f.reason?.message || 'Unknown error'
                  ),
                },
              }
            );
          }
        }

        // If there were significant failures, set an error
        if (totalFailures > activities.length * 0.5) {
          throw new Error(
            `${totalFailures} out of ${activities.length} activities failed to log`
          );
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        onError?.(error);
        logger.error('Batch activity logging failed', error, {
          component: 'useActivityTracker',
          metadata: {
            userId: userData.id,
            activityCount: activities.length,
            batchSize,
          },
        });
      } finally {
        setIsLogging(false);
      }
    },
    [enableAutoLogging, batchSize, userData?.id, logActivityMutation, onError]
  );

  return {
    logActivity,
    batchLogActivities,
    isLogging: isLogging || logActivityMutation.isPending,
    error:
      error ||
      (logActivityMutation.error
        ? new Error(logActivityMutation.error.message)
        : null),
    clearError,
  };
}

/**
 * Helper function to generate human-readable activity descriptions
 */
function generateActivityDescription(
  activityType: ActivityType,
  data?: ActivityData
): string {
  const activityData = data as Record<string, unknown>;

  switch (activityType) {
    case 'login':
      return 'User logged in';
    case 'board_create':
      return `Created a new board${activityData?.title ? `: ${activityData.title}` : ''}`;
    case 'board_join':
      return `Joined a board${activityData?.title ? `: ${activityData.title}` : ''}`;
    case 'board_complete':
      return `Completed a board${activityData?.title ? `: ${activityData.title}` : ''}`;
    case 'submission_create':
      return `Created a new submission${activityData?.title ? `: ${activityData.title}` : ''}`;
    case 'discussion_create':
      return `Started a new discussion${activityData?.title ? `: ${activityData.title}` : ''}`;
    case 'comment_create':
      return 'Posted a comment';
    case 'achievement_unlock':
      return `Unlocked achievement${activityData?.name ? `: ${activityData.name}` : ''}`;
    default:
      return `Performed activity: ${activityType}`;
  }
}

/**
 * Helper function to calculate points earned based on activity type
 */
function calculatePointsEarned(
  activityType: ActivityType,
  data?: ActivityData
): number {
  const basePoints: Record<string, number> = {
    login: 1,
    logout: 0,
    board_create: 10,
    board_join: 5,
    board_complete: 20,
    submission_create: 15,
    discussion_create: 10,
    comment_create: 3,
    achievement_unlock: 50,
  };

  let points = basePoints[activityType] || 0;
  const activityData = data as Record<string, unknown>;

  // Bonus points based on data
  if (activityData?.difficulty === 'hard') {
    points *= 1.5;
  } else if (activityData?.difficulty === 'expert') {
    points *= 2;
  }

  if (
    activityData?.bonus_multiplier &&
    typeof activityData.bonus_multiplier === 'number'
  ) {
    points *= activityData.bonus_multiplier;
  }

  return Math.round(points);
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
