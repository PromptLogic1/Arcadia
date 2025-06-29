/**
 * Activity Tracker Hook
 *
 * Modern implementation using TanStack Query mutations and the service layer.
 * Replaces direct Supabase usage with the established architecture pattern.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/stores';
import { useLogActivityMutation } from '@/hooks/queries/useUserProfileQueries';
import type { ActivityLogRequest } from '../../../services/user.service';
import { logger } from '@/lib/logger';
// Removed unused import: toError
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
import {
  isBoardActivityData,
  isSubmissionActivityData,
  isDiscussionActivityData,
  isCommentActivityData,
  isAchievementActivityData,
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

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any in-flight batch operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
          metadata: data || {},
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
          throw new Error(String(result.error));
        }

        const activityId =
          result && typeof result === 'object' && 'data' in result
            ? result.data
            : null;

        // Only call success callback if component is still mounted
        if (
          isMountedRef.current &&
          activityId &&
          typeof activityId === 'string'
        ) {
          onSuccess?.(activityId);
        }

        return typeof activityId === 'string' ? activityId : null;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');

        // Only update state and call callbacks if component is still mounted
        if (isMountedRef.current) {
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
        }
        return null;
      } finally {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setIsLogging(false);
        }
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
        // Cancel any existing batch operation
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this batch operation
        abortControllerRef.current = new AbortController();

        setIsLogging(true);
        setError(null);

        // Process activities in batches to avoid overwhelming the server
        const batches = [];
        for (let i = 0; i < activities.length; i += batchSize) {
          batches.push(activities.slice(i, i + batchSize));
        }

        let totalFailures = 0;

        for (const batch of batches) {
          // Check if component is still mounted and operation wasn't aborted
          if (
            !isMountedRef.current ||
            abortControllerRef.current.signal.aborted
          ) {
            throw new Error('Operation cancelled');
          }
          const promises = batch.map(async activity => {
            const activityData: ActivityLogRequest = {
              type: activity.activity_type,
              description: generateActivityDescription(
                activity.activity_type,
                activity.data
              ),
              metadata: activity.data || {},
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

        // Clear abort controller on success
        abortControllerRef.current = null;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');

        // Only update state if component is still mounted
        if (isMountedRef.current && err.message !== 'Operation cancelled') {
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
        }
      } finally {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setIsLogging(false);
        }
        // Clear abort controller reference
        if (abortControllerRef.current?.signal.aborted) {
          abortControllerRef.current = null;
        }
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
 * Helper function to get default descriptions for activity types
 */
function getDefaultDescription(activityType: ActivityType): string {
  switch (activityType) {
    case 'login':
      return 'User logged in';
    case 'logout':
      return 'User logged out';
    case 'board_create':
      return 'Created a new board';
    case 'board_join':
      return 'Joined a board';
    case 'board_complete':
      return 'Completed a board';
    case 'submission_create':
      return 'Created a new submission';
    case 'discussion_create':
      return 'Started a new discussion';
    case 'comment_create':
      return 'Posted a comment';
    case 'achievement_unlock':
      return 'Unlocked an achievement';
    default:
      return `Performed activity: ${activityType}`;
  }
}

/**
 * Helper function to generate human-readable activity descriptions
 */
function generateActivityDescription(
  activityType: ActivityType,
  data?: ActivityData
): string {
  if (!data) {
    return getDefaultDescription(activityType);
  }

  switch (activityType) {
    case 'login':
      return 'User logged in';
    case 'board_create':
      if (isBoardActivityData(data)) {
        return `Created a new board: ${data.board_title}`;
      }
      return 'Created a new board';
    case 'board_join':
      if (isBoardActivityData(data)) {
        return `Joined a board: ${data.board_title}`;
      }
      return 'Joined a board';
    case 'board_complete':
      if (isBoardActivityData(data)) {
        return `Completed a board: ${data.board_title}`;
      }
      return 'Completed a board';
    case 'submission_create':
      if (isSubmissionActivityData(data)) {
        return `Created a submission: ${data.challenge_title}`;
      }
      return 'Created a new submission';
    case 'discussion_create':
      if (isDiscussionActivityData(data)) {
        return `Started a discussion: ${data.title}`;
      }
      return 'Started a new discussion';
    case 'comment_create':
      if (isCommentActivityData(data)) {
        return `Commented on: ${data.discussion_title}`;
      }
      return 'Posted a comment';
    case 'achievement_unlock':
      if (isAchievementActivityData(data)) {
        return `Unlocked achievement: ${data.achievement_name}`;
      }
      return 'Unlocked an achievement';
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

  if (!data) {
    return points;
  }

  // Bonus points based on difficulty for board activities
  if (isBoardActivityData(data)) {
    if (data.difficulty === 'hard') {
      points *= 1.5;
    } else if (data.difficulty === 'expert') {
      points *= 2;
    }
  }

  // Bonus points for submission activities
  if (isSubmissionActivityData(data)) {
    // Submissions don't have difficulty, but could have other bonuses
    // For now, keep base points
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
