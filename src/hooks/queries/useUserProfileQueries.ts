/**
 * User Profile Query Hooks
 *
 * TanStack Query hooks for user profile data management.
 * Handles server state for user profiles, statistics, and activities.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/user.service';
import { log } from '@/lib/logger';
import type {
  ActivityOptions,
  ActivityLogRequest,
  UserServiceResponse,
  UserStats,
} from '../../services/user.service';
import type { Database } from '@/types/database.types';

type UserProfileUpdate = Database['public']['Tables']['users']['Update'];
type Activity = Database['public']['Tables']['user_activity']['Row'];

// Query keys for consistent caching
export const userProfileKeys = {
  all: ['userProfile'] as const,
  profile: (userId: string) =>
    [...userProfileKeys.all, 'profile', userId] as const,
  stats: (userId: string) => [...userProfileKeys.all, 'stats', userId] as const,
  activities: (userId: string, options?: ActivityOptions) =>
    [...userProfileKeys.all, 'activities', userId, options] as const,
  activitySummary: (userId: string) =>
    [...userProfileKeys.all, 'activitySummary', userId] as const,
};

/**
 * Query for user profile data
 */
export function useUserProfileQuery(userId: string) {
  return useQuery({
    queryKey: userProfileKeys.profile(userId),
    queryFn: () => userService.getUserProfile(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
    select: (
      response: UserServiceResponse<
        Database['public']['Tables']['users']['Row']
      >
    ) => ({
      profile: response?.data || null,
      error: response?.error,
    }),
  });
}

/**
 * Query for user statistics
 */
export function useUserStatsQuery(userId: string) {
  return useQuery({
    queryKey: userProfileKeys.stats(userId),
    queryFn: () => userService.getUserStats(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userId,
    select: (response: UserServiceResponse<UserStats>) => ({
      stats: response?.data || null,
      error: response?.error,
    }),
  });
}

/**
 * Query for user activities with pagination
 */
export function useUserActivitiesQuery(
  userId: string,
  options: ActivityOptions = {}
) {
  return useQuery({
    queryKey: userProfileKeys.activities(userId, options),
    queryFn: () => userService.getUserActivities(userId, options),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
    select: (response: UserServiceResponse<Activity[]>) => ({
      activities: response.data || [],
      error: response.error,
    }),
  });
}

/**
 * Query for user activity summary
 */
export function useUserActivitySummaryQuery(userId: string) {
  return useQuery({
    queryKey: userProfileKeys.activitySummary(userId),
    queryFn: () => userService.getActivitySummary(userId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!userId,
    select: response => ({
      summary: response.data,
      error: response.error,
    }),
  });
}

/**
 * Mutation for updating user profile
 */
export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string;
      updates: UserProfileUpdate;
    }) => userService.updateUserProfile(userId, updates),

    onSuccess: (
      response: UserServiceResponse<
        Database['public']['Tables']['users']['Row']
      >,
      { userId }
    ) => {
      if (response?.data) {
        // Update the profile cache with new data
        queryClient.setQueryData(userProfileKeys.profile(userId), {
          data: response.data,
          error: undefined,
        });

        // Invalidate related queries to refetch fresh data
        queryClient.invalidateQueries({
          queryKey: userProfileKeys.stats(userId),
        });
      }
    },

    onError: (error, { userId }) => {
      log.error('Failed to update user profile', error, {
        metadata: {
          hook: 'useUpdateUserProfileMutation',
          userId,
        },
      });
    },
  });
}

/**
 * Mutation for logging user activity
 */
export function useLogActivityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      activity,
    }: {
      userId: string;
      activity: ActivityLogRequest;
    }) => userService.logUserActivity(userId, activity),

    onSuccess: (response: UserServiceResponse<string>, { userId }) => {
      if (response?.data) {
        // Invalidate activities and stats to show new activity
        queryClient.invalidateQueries({
          queryKey: userProfileKeys.activities(userId),
        });

        queryClient.invalidateQueries({
          queryKey: userProfileKeys.stats(userId),
        });

        queryClient.invalidateQueries({
          queryKey: userProfileKeys.activitySummary(userId),
        });
      }
    },

    onError: (error, { userId }) => {
      log.error('Failed to log user activity', error, {
        metadata: {
          hook: 'useLogActivityMutation',
          userId,
        },
      });
    },
  });
}

/**
 * Combined hook for user profile data (profile + stats)
 */
export function useUserProfileData(userId: string) {
  const profileQuery = useUserProfileQuery(userId);
  const statsQuery = useUserStatsQuery(userId);

  return {
    // Profile data
    profile: profileQuery.data?.profile,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.data?.error || profileQuery.error?.message,

    // Stats data
    stats: statsQuery.data?.stats,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.data?.error || statsQuery.error?.message,

    // Combined states
    isLoading: profileQuery.isLoading || statsQuery.isLoading,
    isError: profileQuery.isError || statsQuery.isError,
    error:
      profileQuery.data?.error ||
      statsQuery.data?.error ||
      profileQuery.error?.message ||
      statsQuery.error?.message,

    // Refetch functions
    refetchProfile: profileQuery.refetch,
    refetchStats: statsQuery.refetch,
    refetchAll: () => {
      profileQuery.refetch();
      statsQuery.refetch();
    },
  };
}

/**
 * Prefetch user profile data
 */
export function usePrefetchUserProfile() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    // Prefetch profile data
    queryClient.prefetchQuery({
      queryKey: userProfileKeys.profile(userId),
      queryFn: () => userService.getUserProfile(userId),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch stats data
    queryClient.prefetchQuery({
      queryKey: userProfileKeys.stats(userId),
      queryFn: () => userService.getUserStats(userId),
      staleTime: 2 * 60 * 1000,
    });
  };
}
