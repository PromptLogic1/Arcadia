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
import type {
  EmailUpdateData,
  PasswordUpdateData,
  ProfileUpdateData,
  NotificationSettingsData,
} from '../../services/settings.service';

// Query Keys
export const settingsKeys = {
  all: ['settings'] as const,
  profile: (userId: string) => [...settingsKeys.all, 'profile', userId] as const,
  notifications: (userId: string) => [...settingsKeys.all, 'notifications', userId] as const,
};

/**
 * Query for user profile
 */
export function useUserProfileQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.profile(userId),
    queryFn: () => settingsService.getUserProfile(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (profile not found)
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    select: (data) => data.profile,
  });
}

/**
 * Mutation for updating user profile
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: ProfileUpdateData }) =>
      settingsService.updateProfile(userId, updates),
    onSuccess: (data, variables) => {
      if (data && 'profile' in data && data.profile) {
        // Update the profile query cache
        queryClient.setQueryData(
          settingsKeys.profile(variables.userId),
          { profile: data.profile }
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: settingsKeys.profile(variables.userId)
        });

        notifications.success('Profile updated successfully');
        
        logger.info('Profile updated', {
          metadata: { userId: variables.userId, updates: variables.updates }
        });
      }
    },
    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      notifications.error('Failed to update profile', {
        description: errorMessage
      });
      
      logger.error('Profile update failed', error as Error, {
        metadata: { userId: variables.userId, updates: variables.updates }
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
    mutationFn: (emailData: EmailUpdateData) => settingsService.updateEmail(emailData),
    onSuccess: (data, variables) => {
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          notifications.success('Email update initiated', {
            description: 'Please check your new email for verification'
          });

          // Invalidate auth-related queries
          queryClient.invalidateQueries({ queryKey: ['auth'] });
          
          logger.info('Email update initiated', {
            metadata: { newEmail: variables.newEmail }
          });
        } else if ('error' in data && typeof data.error === 'string') {
          throw new Error(data.error);
        }
      }
    },
    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email';
      notifications.error('Failed to update email', {
        description: errorMessage
      });
      
      logger.error('Email update failed', error as Error, {
        metadata: { newEmail: variables.newEmail }
      });
    },
  });
}

/**
 * Mutation for updating password
 */
export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: (passwordData: PasswordUpdateData) => settingsService.updatePassword(passwordData),
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          notifications.success('Password updated successfully', {
            description: 'Your password has been changed'
          });
          
          logger.info('Password updated successfully');
        } else if ('error' in data && typeof data.error === 'string') {
          throw new Error(data.error);
        }
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      notifications.error('Failed to update password', {
        description: errorMessage
      });
      
      logger.error('Password update failed', error as Error);
    },
  });
}

/**
 * Mutation for updating notification settings
 */
export function useUpdateNotificationSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, settings }: { userId: string; settings: NotificationSettingsData }) =>
      settingsService.updateNotificationSettings(userId, settings),
    onSuccess: (data, variables) => {
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          // Invalidate profile query to refetch updated notification settings
          queryClient.invalidateQueries({
            queryKey: settingsKeys.profile(variables.userId)
          });

          notifications.success('Notification settings updated');
          
          logger.info('Notification settings updated', {
            metadata: { userId: variables.userId, settings: variables.settings }
          });
        } else if ('error' in data && typeof data.error === 'string') {
          throw new Error(data.error);
        }
      }
    },
    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update notification settings';
      notifications.error('Failed to update notification settings', {
        description: errorMessage
      });
      
      logger.error('Notification settings update failed', error as Error, {
        metadata: { userId: variables.userId, settings: variables.settings }
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
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          // Clear all cached data
          queryClient.clear();
          
          notifications.success('Account deleted successfully');
          logger.info('Account deleted successfully');
        } else if ('error' in data && typeof data.error === 'string') {
          throw new Error(data.error);
        }
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      notifications.error('Failed to delete account', {
        description: errorMessage
      });
      
      logger.error('Account deletion failed', error as Error);
    },
  });
}

/**
 * Combined settings operations hook
 */
export function useSettingsOperations(userId: string) {
  const profileQuery = useUserProfileQuery(userId);
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