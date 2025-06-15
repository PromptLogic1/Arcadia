/**
 * Auth Store - Intentional Exception to UI-State-Only Rule
 *
 * This store is an INTENTIONAL EXCEPTION to the "UI-state-only" rule for Zustand stores.
 * It manages authentication state which requires:
 * 1. Global access across the entire application
 * 2. Persistence between sessions (localStorage)
 * 3. Synchronization with Supabase Auth state changes
 * 4. Direct integration with auth service callbacks
 *
 * This is NOT a pattern to follow for other stores. All other stores should:
 * - Only contain UI state
 * - Use TanStack Query for server state
 * - Follow the service → query → component pattern
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import {
  User as _User,
  Session as _Session,
  AuthError as _AuthError,
} from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { AuthUser, UserData } from './types';
import type { Tables } from '../../../types/database.types';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import {
  trackUserSession,
  blacklistAllUserSessions,
} from '@/lib/session-blacklist';

/**
 * Type guard for validating user role values
 * Follows RULE T2: ZERO TYPE ASSERTIONS
 */
function isValidUserRole(
  role: unknown
): role is 'user' | 'admin' | 'moderator' | 'premium' {
  return (
    typeof role === 'string' &&
    ['user', 'admin', 'moderator', 'premium'].includes(role)
  );
}

/**
 * Type-safe transformation function: Database Users -> UserData
 * Follows RULE T3: NO MANUAL OBJECT MAPPING
 * Single source of truth for user data transformation
 */
export const transformDbUserToUserData = (dbUser: Tables<'users'>): UserData =>
  ({
    ...dbUser,
    // Handle required fields with proper fallbacks
    experience_points: dbUser.experience_points ?? 0,
    created_at: dbUser.created_at ?? new Date().toISOString(),
    // Default visibility settings with proper null coalescing
    achievements_visibility: dbUser.achievements_visibility ?? 'public',
    profile_visibility: dbUser.profile_visibility ?? 'public',
    submissions_visibility: dbUser.submissions_visibility ?? 'public',
  }) satisfies UserData;

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  error?: Error;
  needsVerification?: boolean;
  user?: AuthUser;
}

interface UpdateUserDataParams {
  username?: string;
  full_name?: string;
  bio?: string;
  land?: string;
  region?: string;
  city?: string;
}

interface PasswordChecks {
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
}

interface AuthState {
  // State
  authUser: AuthUser | null;
  userData: UserData | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Basic Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthUser: (user: AuthUser) => void;
  setUserData: (userData: UserData) => void;
  clearUser: () => void;
  updateUserData: (updates: Partial<UserData>) => void;

  // Service Methods
  initializeApp: () => Promise<void>;
  setupAuthListener: () => void;
  signIn: (credentials: SignInCredentials) => Promise<AuthResponse>;
  signInWithOAuth: (provider: 'google') => Promise<AuthResponse>;
  signUp: (user: {
    email: string;
    password: string;
    username: string;
  }) => Promise<AuthResponse>;
  signOut: () => Promise<AuthResponse>;
  refreshUserData: () => Promise<UserData>;
  updateUserDataService: (
    userId: string,
    updates: UpdateUserDataParams
  ) => Promise<UserData>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (password: string) => Promise<AuthResponse>;
  resetPassword: (newPassword: string) => Promise<AuthResponse>;
  resetPasswordForEmail: (email: string) => Promise<AuthResponse>;
  checkPasswordRequirements: (password: string) => PasswordChecks;
}

export const useAuthStore = createWithEqualityFn<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        authUser: null,
        userData: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        // Basic Actions
        setLoading: loading => set({ loading }, false, 'auth/setLoading'),

        setError: error => set({ error }, false, 'auth/setError'),

        setAuthUser: authUser =>
          set(
            { authUser, isAuthenticated: true, error: null },
            false,
            'auth/setAuthUser'
          ),

        setUserData: userData =>
          set({ userData, error: null }, false, 'auth/setUserData'),

        clearUser: () =>
          set(
            {
              authUser: null,
              userData: null,
              isAuthenticated: false,
              error: null,
            },
            false,
            'auth/clearUser'
          ),

        updateUserData: updates => {
          const { userData } = get();
          if (userData) {
            set(
              { userData: { ...userData, ...updates } },
              false,
              'auth/updateUserData'
            );
          }
        },

        // Service Methods
        initializeApp: async () => {
          try {
            get().setLoading(true);

            let supabase;
            try {
              supabase = createClient();
            } catch (clientError) {
              logger.warn(
                'Failed to create Supabase client during initialization',
                {
                  metadata: {
                    store: 'AuthStore',
                    phase: 'client-creation',
                    error:
                      clientError instanceof Error
                        ? clientError.message
                        : 'Unknown client error',
                  },
                }
              );
              // If we can't create the client, clear the user and return early
              get().clearUser();
              return;
            }

            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();

            // If no user or error, just clear the store and return
            if (!user || authError) {
              if (authError) {
                logger.info(
                  'No authenticated user found during initialization',
                  {
                    metadata: { store: 'AuthStore', error: authError.message },
                  }
                );
              }
              get().clearUser();
              return;
            }
            // Only fetch user data if we have an authenticated user
            const { data: userData, error: dbError } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', user.id)
              .single();

            if (dbError) throw dbError;

            // Update store with user data
            get().setAuthUser({
              id: user.id,
              email: user.email ?? null,
              phone: user.phone ?? null,
              auth_username: user.user_metadata?.username ?? null,
              provider: user.app_metadata?.provider ?? null,
              userRole: isValidUserRole(userData?.role)
                ? userData.role
                : 'user',
            });

            // Transform database user to UserData using type-safe transformation
            get().setUserData({
              ...transformDbUserToUserData(userData),
              // Ensure we use the correct database user ID, not the auth ID
              id: userData.id,
              // Override auth_id with fallback to user.id if null
              auth_id: userData.auth_id ?? user.id,
            });
          } catch (error) {
            logger.error(
              'Auth initialization failed',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore' },
              }
            );
            get().clearUser();
          } finally {
            get().setLoading(false);
          }
        },

        setupAuthListener: () => {
          try {
            const supabase = createClient();
            return supabase.auth.onAuthStateChange(async (event, session) => {
              if (event === 'SIGNED_IN' && session?.user) {
                await get().initializeApp();
              }

              if (event === 'SIGNED_OUT') {
                get().clearUser();
              }
            });
          } catch (error) {
            logger.error(
              'Failed to setup auth listener',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore' },
              }
            );
            // Return a no-op unsubscribe function
            return { data: { subscription: { unsubscribe: () => {} } } };
          }
        },

        signIn: async ({
          email,
          password,
        }: SignInCredentials): Promise<AuthResponse> => {
          try {
            get().setLoading(true);
            const supabase = createClient();

            const { error } = await supabase.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (error) {
              return {
                error: new Error(error.message),
              };
            }

            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              return { error: new Error('No user data received') };
            }

            // Get the session separately for security tracking
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.access_token) {
              await trackUserSession(session.access_token, user.id);
            }

            await get().initializeApp();

            return {};
          } catch (error) {
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          } finally {
            get().setLoading(false);
          }
        },

        signInWithOAuth: async (provider: 'google'): Promise<AuthResponse> => {
          try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOAuth({
              provider,
              options: {
                redirectTo: `${window.location.origin}/auth/oauth-success`,
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                },
              },
            });

            if (error) {
              return { error: new Error(error.message) };
            }

            return {};
          } catch (error) {
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          }
        },

        signUp: async ({
          email,
          password,
          username,
        }: {
          email: string;
          password: string;
          username: string;
        }): Promise<AuthResponse> => {
          try {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username,
                },
                emailRedirectTo: `${window.location.origin}/auth/oauth-success`,
              },
            });

            if (error) {
              return { error: new Error(error.message) };
            }

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user?.identities?.length === 0) {
              return {
                error: new Error('Account with this email already exists'),
              };
            }

            if (!user?.confirmed_at) {
              return { needsVerification: true };
            }

            return {};
          } catch (error) {
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          }
        },

        signOut: async (): Promise<AuthResponse> => {
          try {
            get().setLoading(true);
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
              logger.error(
                'Sign out failed',
                error instanceof Error ? error : new Error('Unknown error'),
                {
                  metadata: { store: 'AuthStore' },
                }
              );
              notifications.error('Sign out failed', {
                description: 'Please try again or contact support.',
              });
              return {
                error:
                  error instanceof Error ? error : new Error('Unknown error'),
              };
            }

            // Clear the user data from store
            get().clearUser();

            // Let the router handle navigation
            window.location.href = '/';

            return {};
          } catch (error) {
            logger.error(
              'Sign out failed',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore' },
              }
            );
            notifications.error('Sign out failed', {
              description: 'Please try again or contact support.',
            });
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          } finally {
            get().setLoading(false);
          }
        },

        refreshUserData: async () => {
          try {
            const supabase = createClient();
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();

            if (!user || authError) {
              throw new Error(authError?.message || 'No user found');
            }

            const { data: userData, error: dbError } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', user.id)
              .single();

            if (dbError) throw dbError;

            // Transform database user to UserData using type-safe transformation
            get().setUserData(transformDbUserToUserData(userData));

            return userData;
          } catch (error) {
            logger.error(
              'Failed to refresh user data',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore' },
              }
            );
            throw error;
          }
        },

        updateUserDataService: async (
          userId: string,
          updates: UpdateUserDataParams
        ) => {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from('users')
              .update(updates)
              .eq('id', userId)
              .select()
              .single();

            if (error) throw error;

            // Transform database user to UserData using type-safe transformation
            get().setUserData(transformDbUserToUserData(data));
            notifications.success('Profile updated successfully!');
            logger.info('User data updated successfully', {
              metadata: { store: 'AuthStore', userId },
            });
            return data;
          } catch (error) {
            logger.error(
              'Failed to update user data',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore', userId, updates },
              }
            );
            notifications.error('Failed to update profile', {
              description: 'Please try again or contact support.',
            });
            throw error;
          }
        },

        updateEmail: async (newEmail: string): Promise<void> => {
          try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
              email: newEmail,
            });

            if (error) throw error;
            notifications.success(
              'Email updated successfully! Please check your inbox to verify the new email.'
            );
            logger.info('User email updated successfully', {
              metadata: { store: 'AuthStore', newEmail },
            });
          } catch (error) {
            logger.error(
              'Failed to update email',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore', newEmail },
              }
            );
            notifications.error('Failed to update email', {
              description: 'Please try again or contact support.',
            });
            throw error;
          }
        },

        updatePassword: async (password: string): Promise<AuthResponse> => {
          try {
            // First check if password meets requirements
            const checks = get().checkPasswordRequirements(password);
            if (!Object.values(checks).every(Boolean)) {
              return {
                error: new Error('Password does not meet all requirements'),
              };
            }

            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
              // Handle error cases
              let errorMessage = error.message || 'Failed to update password';
              switch (error.message) {
                case 'New password should be different from the old password':
                  errorMessage =
                    'Your new password must be different from your current password';
                  break;
                case 'Auth session missing!':
                  errorMessage =
                    'Your session has expired. Please log in again';
                  break;
              }
              logger.warn('Password update failed', {
                metadata: { store: 'AuthStore', supabaseError: error.message },
              });
              notifications.error('Password update failed', {
                description: errorMessage,
              });
              return { error: new Error(errorMessage) };
            }

            // Blacklist all existing sessions for security
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await blacklistAllUserSessions(user.id, 'Password changed');
            }

            notifications.success('Password updated successfully!');
            logger.info('User password updated successfully', {
              metadata: { store: 'AuthStore' },
            });
            return {};
          } catch (error) {
            logger.error(
              'Failed to update password',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore' },
              }
            );
            notifications.error('Failed to update password', {
              description: 'Please try again or contact support.',
            });
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          }
        },

        resetPassword: async (newPassword: string): Promise<AuthResponse> => {
          try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
              password: newPassword,
            });

            if (error) {
              logger.error(
                'Password reset failed',
                error instanceof Error ? error : new Error('Unknown error'),
                {
                  metadata: { store: 'AuthStore' },
                }
              );
              notifications.error('Password reset failed', {
                description: error.message,
              });
              return {
                error:
                  error instanceof Error ? error : new Error('Unknown error'),
              };
            }

            notifications.success('Password reset successfully!');
            logger.info('Password reset successfully', {
              metadata: { store: 'AuthStore' },
            });
            return {};
          } catch (error) {
            logger.error(
              'Password reset failed',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore' },
              }
            );
            notifications.error('Password reset failed', {
              description: 'Please try again or contact support.',
            });
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          }
        },

        resetPasswordForEmail: async (email: string): Promise<AuthResponse> => {
          try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
              logger.error(
                'Password reset email failed',
                error instanceof Error ? error : new Error('Unknown error'),
                {
                  metadata: { store: 'AuthStore', email },
                }
              );
              notifications.error('Password reset email failed', {
                description: error.message,
              });
              return {
                error:
                  error instanceof Error ? error : new Error('Unknown error'),
              };
            }

            notifications.success(
              'Password reset email sent! Please check your inbox.'
            );
            logger.info('Password reset email sent successfully', {
              metadata: { store: 'AuthStore', email },
            });
            return {};
          } catch (error) {
            logger.error(
              'Password reset email failed',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { store: 'AuthStore', email },
              }
            );
            notifications.error('Password reset email failed', {
              description: 'Please try again or contact support.',
            });
            return {
              error:
                error instanceof Error ? error : new Error('Unknown error'),
            };
          }
        },

        checkPasswordRequirements: (password: string): PasswordChecks => {
          return {
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            length: password.length >= 8,
          };
        },
      }),
      {
        name: 'auth-storage',
        partialize: state => ({
          // Only persist minimal, non-sensitive state
          // Remove authUser and userData to prevent XSS token theft
          isAuthenticated: state.isAuthenticated,
          // Note: authUser and userData will be re-fetched on app initialization
        }),
        storage: {
          getItem: (key: string) => {
            try {
              // Use sessionStorage instead of localStorage for better security
              const item = sessionStorage.getItem(key);
              return item ? JSON.parse(item) : null;
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: unknown) => {
            try {
              sessionStorage.setItem(key, JSON.stringify(value));
            } catch {
              // Silently fail if storage is not available
            }
          },
          removeItem: (key: string) => {
            try {
              sessionStorage.removeItem(key);
            } catch {
              // Silently fail if storage is not available
            }
          },
        },
      }
    ),
    {
      name: 'auth-store',
    }
  ),
  Object.is // default equality function, can be replaced with shallow if needed
);

export const useAuth = () =>
  useAuthStore(
    useShallow(state => ({
      authUser: state.authUser,
      userData: state.userData,
      isAuthenticated: state.isAuthenticated,
      loading: state.loading,
      error: state.error,
    }))
  );

export const useAuthActions = () =>
  useAuthStore(
    useShallow(state => ({
      setLoading: state.setLoading,
      setError: state.setError,
      setAuthUser: state.setAuthUser,
      setUserData: state.setUserData,
      clearUser: state.clearUser,
      updateUserData: state.updateUserData,
      initializeApp: state.initializeApp,
      setupAuthListener: state.setupAuthListener,
      signIn: state.signIn,
      signInWithOAuth: state.signInWithOAuth,
      signUp: state.signUp,
      signOut: state.signOut,
      refreshUserData: state.refreshUserData,
      updateUserDataService: state.updateUserDataService,
      updateEmail: state.updateEmail,
      updatePassword: state.updatePassword,
      resetPassword: state.resetPassword,
      resetPasswordForEmail: state.resetPasswordForEmail,
      checkPasswordRequirements: state.checkPasswordRequirements,
    }))
  );

export const useAuthLoading = () => useAuthStore(state => state.loading);

// Granular selectors for specific auth state to minimize re-renders
export const useAuthUser = () => useAuthStore(state => state.authUser);
export const useIsAuthenticated = () =>
  useAuthStore(state => state.isAuthenticated);
export const useAuthError = () => useAuthStore(state => state.error);
export const useUserData = () => useAuthStore(state => state.userData);

// Selector for just authentication status (commonly needed)
export const useAuthStatus = () =>
  useAuthStore(
    useShallow(state => ({
      isAuthenticated: state.isAuthenticated,
      loading: state.loading,
    }))
  );

// Selector for user info only (for display purposes)
export const useAuthUserInfo = () =>
  useAuthStore(
    useShallow(state => ({
      authUser: state.authUser,
      userData: state.userData,
    }))
  );
