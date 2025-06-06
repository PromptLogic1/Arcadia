/**
 * Authentication React Query Hooks
 *
 * Hooks for authentication operations using TanStack Query.
 * Integrates with auth service and Zustand auth store.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type UserUpdateData } from '../../services/auth.service';
import { useAuth, useAuthActions } from '@/lib/stores/auth-store';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';
import { logger } from '@/lib/logger';

/**
 * Get current auth session query
 */
export function useAuthSessionQuery() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: authService.getSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (response) => response.success ? response.data : null,
  });
}

/**
 * Get current user query
 */
export function useCurrentUserQuery() {
  const { authUser } = useAuth();

  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: authService.getCurrentUser,
    enabled: !authUser, // Don't fetch if we already have user
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (response) => response.success ? response.data : null,
  });
}

/**
 * Get user data query
 */
export function useUserDataQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.auth.userData(userId || ''),
    queryFn: () => authService.getUserData(userId || ''),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (response) => response.success ? response.data : null,
  });
}

/**
 * Sign in mutation
 */
export function useSignInMutation() {
  const queryClient = useQueryClient();
  const { setAuthUser, setUserData } = useAuthActions();

  return useMutation({
    mutationFn: authService.signIn,
    onSuccess: async response => {
      if (!response.success || !response.data || !response.data.user) {
        notifications.error(response.error || 'Sign in failed');
        return;
      }

      if (response.data.user) {
        setAuthUser(response.data.user);

        // Fetch user data after successful sign in
        try {
          const userDataResponse = await authService.getUserData(response.data.user.id);
          if (userDataResponse.success && userDataResponse.data) {
            setUserData(userDataResponse.data);
          }
        } catch (error) {
          logger.error(
            'Failed to fetch user data after sign in',
            error instanceof Error ? error : new Error('Unknown error'),
            {
              metadata: { userId: response.data.user.id },
            }
          );
        }

        // Invalidate auth queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.auth.userData(response.data.user.id),
        });

        notifications.success('Signed in successfully!');
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Sign in failed');
    },
  });
}

/**
 * Sign up mutation
 */
export function useSignUpMutation() {
  const queryClient = useQueryClient();
  const { setAuthUser } = useAuthActions();

  return useMutation({
    mutationFn: authService.signUp,
    onSuccess: response => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Sign up failed');
        return;
      }

      if (response.data.needsVerification) {
        notifications.success(
          'Please check your email to verify your account.'
        );
        return;
      }

      if (response.data.user) {
        setAuthUser(response.data.user);
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
        notifications.success('Account created successfully!');
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Sign up failed');
    },
  });
}

/**
 * Sign out mutation
 */
export function useSignOutMutation() {
  const queryClient = useQueryClient();
  const { signOut } = useAuthActions();

  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: response => {
      if (!response.success) {
        notifications.error(response.error || 'Sign out failed');
        return;
      }

      // Clear auth state
      signOut();

      // Clear all cached data
      queryClient.clear();

      notifications.success('Signed out successfully!');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Sign out failed');
    },
  });
}

/**
 * Update user data mutation
 */
export function useUpdateUserDataMutation(userId: string) {
  const queryClient = useQueryClient();
  const { setUserData } = useAuthActions();

  return useMutation({
    mutationFn: (updates: UserUpdateData) =>
      authService.updateUserData(userId, updates),
    onSuccess: response => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to update profile');
        return;
      }

      if (response.data) {
        setUserData(response.data);

        // Update cached user data
        queryClient.setQueryData(queryKeys.auth.userData(userId), {
          userData: response.data,
        });

        notifications.success('Profile updated successfully!');
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to update profile');
    },
  });
}

/**
 * Reset password mutation
 */
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: response => {
      if (!response.success) {
        notifications.error(response.error || 'Password reset failed');
        return;
      }

      notifications.success(
        "If an account exists with that email, we've sent you instructions to reset your password."
      );
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Password reset failed');
    },
  });
}

/**
 * Update password mutation (auth service)
 */
export function useAuthUpdatePasswordMutation() {
  return useMutation({
    mutationFn: authService.updatePassword,
    onSuccess: response => {
      if (!response.success) {
        notifications.error(response.error || 'Password update failed');
        return;
      }

      notifications.success('Password updated successfully!');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Password update failed');
    },
  });
}
