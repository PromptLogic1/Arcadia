/**
 * Settings TanStack Query Hooks
 *
 * Server state management for user settings using TanStack Query.
 * Handles profile data, email updates, password changes, and preferences.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../../services/settings.service';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-guards';
import type {
  EmailUpdateData,
  PasswordUpdateData,
  ProfileUpdateData,
  NotificationSettingsData,
} from '../../services/settings.service';

// Query Keys
export const settingsKeys = {
  all: ['settings'] as const,
  profile: (userId: string) =>
    [...settingsKeys.all, 'profile', userId] as const,
  notifications: (userId: string) =>
    [...settingsKeys.all, 'notifications', userId] as const,
};

/**
 * Query for user profile (settings context)
 */
export function useSettingsUserProfileQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.profile(userId),
    queryFn: () => settingsService.getUserProfile(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (profile not found)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 404
      ) {
        return false;
      }
      return failureCount < 3;
    },
    select: data => data.data,
  });
}

/**
 * Mutation for updating user profile
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string;
      updates: ProfileUpdateData;
    }) => settingsService.updateProfile(userId, updates),
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        // Update the profile query cache
        queryClient.setQueryData(
          settingsKeys.profile(variables.userId),
          result
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: settingsKeys.profile(variables.userId),
        });

        notifications.success('Profile updated successfully');

        logger.info('Profile updated', {
          metadata: { userId: variables.userId, updates: variables.updates },
        });
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    },
    onError: (error, variables) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update profile';
      notifications.error('Failed to update profile', {
        description: errorMessage,
      });

      logger.error('Profile update failed', toError(error), {
        metadata: { userId: variables.userId, updates: variables.updates },
      });
    },
  });
}

/**
 * Mutation for updating email
 */
export function useUpdateEmailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailData: EmailUpdateData) =>
      settingsService.updateEmail(emailData),
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        notifications.success('Email update initiated', {
          description: 'Please check your new email for verification',
        });

        // Invalidate auth-related queries
        queryClient.invalidateQueries({ queryKey: ['auth'] });

        logger.info('Email update initiated', {
          metadata: { newEmail: variables.newEmail },
        });
      } else {
        throw new Error(result.error || 'Failed to update email');
      }
    },
    onError: (error, variables) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update email';
      notifications.error('Failed to update email', {
        description: errorMessage,
      });

      logger.error('Email update failed', toError(error), {
        metadata: { newEmail: variables.newEmail },
      });
    },
  });
}

/**
 * Mutation for updating password
 */
export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: (passwordData: PasswordUpdateData) =>
      settingsService.updatePassword(passwordData),
    onSuccess: result => {
      if (result.success && result.data) {
        notifications.success('Password updated successfully', {
          description: 'Your password has been changed',
        });

        logger.info('Password updated successfully');
      } else {
        throw new Error(result.error || 'Failed to update password');
      }
    },
    onError: error => {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update password';
      notifications.error('Failed to update password', {
        description: errorMessage,
      });

      logger.error('Password update failed', toError(error));
    },
  });
}

/**
 * Mutation for updating notification settings
 */
export function useUpdateNotificationSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      settings,
    }: {
      userId: string;
      settings: NotificationSettingsData;
    }) => settingsService.updateNotificationSettings(userId, settings),
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        // Invalidate profile query to refetch updated notification settings
        queryClient.invalidateQueries({
          queryKey: settingsKeys.profile(variables.userId),
        });

        notifications.success('Notification settings updated');

        logger.info('Notification settings updated', {
          metadata: {
            userId: variables.userId,
            settings: variables.settings,
          },
        });
      } else {
        throw new Error(
          result.error || 'Failed to update notification settings'
        );
      }
    },
    onError: (error, variables) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to update notification settings';
      notifications.error('Failed to update notification settings', {
        description: errorMessage,
      });

      logger.error('Notification settings update failed', toError(error), {
        metadata: { userId: variables.userId, settings: variables.settings },
      });
    },
  });
}

/**
 * Mutation for deleting account
 */
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsService.deleteAccount(),
    onSuccess: result => {
      if (result.success && result.data) {
        // Clear all cached data
        queryClient.clear();

        notifications.success('Account deleted successfully');
        logger.info('Account deleted successfully');
      } else {
        throw new Error(result.error || 'Failed to delete account');
      }
    },
    onError: error => {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete account';
      notifications.error('Failed to delete account', {
        description: errorMessage,
      });

      logger.error('Account deletion failed', toError(error));
    },
  });
}

/**
 * Combined settings operations hook
 */
export function useSettingsOperations(userId: string) {
  const profileQuery = useSettingsUserProfileQuery(userId);
  const updateProfileMutation = useUpdateProfileMutation();
  const updateEmailMutation = useUpdateEmailMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();
  const updateNotificationsMutation = useUpdateNotificationSettingsMutation();
  const deleteAccountMutation = useDeleteAccountMutation();

  return {
    // Profile data
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    refetch: profileQuery.refetch,

    // Profile operations
    updateProfile: (updates: ProfileUpdateData) =>
      updateProfileMutation.mutateAsync({ userId, updates }),
    isUpdatingProfile: updateProfileMutation.isPending,

    // Email operations
    updateEmail: (emailData: EmailUpdateData) =>
      updateEmailMutation.mutateAsync(emailData),
    isUpdatingEmail: updateEmailMutation.isPending,

    // Password operations
    updatePassword: (passwordData: PasswordUpdateData) =>
      updatePasswordMutation.mutateAsync(passwordData),
    isUpdatingPassword: updatePasswordMutation.isPending,

    // Notification operations
    updateNotifications: (settings: NotificationSettingsData) =>
      updateNotificationsMutation.mutateAsync({ userId, settings }),
    isUpdatingNotifications: updateNotificationsMutation.isPending,

    // Account operations
    deleteAccount: () => deleteAccountMutation.mutateAsync(),
    isDeletingAccount: deleteAccountMutation.isPending,

    // Combined loading state
    isMutating:
      updateProfileMutation.isPending ||
      updateEmailMutation.isPending ||
      updatePasswordMutation.isPending ||
      updateNotificationsMutation.isPending ||
      deleteAccountMutation.isPending,
  };
}
