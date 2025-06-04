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
    onSuccess: async (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.user) {
        setAuthUser(response.user);
        
        // Fetch user data after successful sign in
        try {
          const { userData } = await authService.getUserData(response.user.id);
          if (userData) {
            setUserData(userData);
          }
        } catch (error) {
          console.warn('Failed to fetch user data after sign in:', error);
        }

        // Invalidate auth queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.auth.userData(response.user.id) 
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
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.needsVerification) {
        notifications.success('Please check your email to verify your account.');
        return;
      }

      if (response.user) {
        setAuthUser(response.user);
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
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
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
    mutationFn: (updates: UserUpdateData) => authService.updateUserData(userId, updates),
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }

      if (response.userData) {
        setUserData(response.userData);
        
        // Update cached user data
        queryClient.setQueryData(
          queryKeys.auth.userData(userId),
          { userData: response.userData }
        );

        notifications.success('Profile updated successfully!');
      }
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Failed to update profile');
    },
  });
}