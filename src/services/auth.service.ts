/**
 * Authentication Service
 *
 * Pure functions for authentication operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { AuthUser, UserData } from '@/lib/stores/types';
import { transformDbUserToUserData } from '@/lib/stores/auth-store';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import { userSchema } from '@/lib/validation/schemas/users';
import { log } from '@/lib/logger';
import type { Provider } from '@supabase/supabase-js';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  username?: string;
}

export interface AuthResponseData {
  user?: AuthUser;
  needsVerification?: boolean;
}

export interface UserUpdateData {
  username?: string;
  full_name?: string;
  bio?: string;
  land?: string;
  region?: string;
  city?: string;
}

export interface OAuthResponseData {
  url: string;
  provider: Provider;
}

export const authService = {
  /**
   * Get current session
   */
  async getSession(): Promise<
    ServiceResponse<{ user: { id: string; email?: string | null } } | null>
  > {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        log.error('Failed to get session', error, {
          metadata: { service: 'auth.service', method: 'getSession' },
        });
        return createServiceError(error.message);
      }

      if (!data.session) {
        return createServiceSuccess(null);
      }

      return createServiceSuccess({
        user: {
          id: data.session.user.id,
          email: data.session.user.email || null,
        },
      });
    } catch (error) {
      log.error(
        'Unexpected error getting session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'auth.service', method: 'getSession' },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ServiceResponse<AuthUser | null>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        log.error('Failed to get current user', error, {
          metadata: { service: 'auth.service', method: 'getCurrentUser' },
        });
        return createServiceError(error.message);
      }

      if (!data.user) {
        return createServiceSuccess(null);
      }

      // Transform Supabase user to our AuthUser type
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || null,
        phone: data.user.phone || null,
        auth_username: data.user.user_metadata?.username || null,
        username: data.user.user_metadata?.username || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        provider: data.user.app_metadata?.provider || null,
        userRole: 'user', // Default role
      };

      return createServiceSuccess(authUser);
    } catch (error) {
      log.error(
        'Unexpected error getting current user',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'auth.service', method: 'getCurrentUser' },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get user profile data from users table
   */
  async getUserData(userId: string): Promise<ServiceResponse<UserData>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (error) {
        log.error('Failed to get user data', error, {
          metadata: { service: 'auth.service', method: 'getUserData', userId },
        });
        return createServiceError(error.message);
      }

      // Validate the data from database
      const validationResult = userSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('User data validation failed', validationResult.error, {
          metadata: { service: 'auth.service', method: 'getUserData', userId },
        });
        return createServiceError('Invalid user data format');
      }

      // SAFE TRANSFORMATION - Use proper UserData transformation
      const userData = transformDbUserToUserData(validationResult.data);
      return createServiceSuccess(userData);
    } catch (error) {
      log.error(
        'Unexpected error getting user data',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'auth.service', method: 'getUserData', userId },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(
    credentials: SignInCredentials
  ): Promise<ServiceResponse<AuthResponseData>> {
    try {
      const supabase = createClient();
      const { data, error } =
        await supabase.auth.signInWithPassword(credentials);

      if (error) {
        log.error('Sign in failed', error, {
          metadata: {
            service: 'auth.service',
            method: 'signIn',
            email: credentials.email,
          },
        });
        return createServiceError(error.message);
      }

      if (!data.user) {
        return createServiceError('No user returned from sign in');
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || null,
        phone: data.user.phone || null,
        auth_username: data.user.user_metadata?.username || null,
        username: data.user.user_metadata?.username || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        provider: data.user.app_metadata?.provider || null,
        userRole: 'user',
      };

      return createServiceSuccess({ user: authUser });
    } catch (error) {
      log.error(
        'Unexpected error during sign in',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'auth.service',
            method: 'signIn',
            email: credentials.email,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Sign up with email and password
   */
  async signUp(
    credentials: SignUpCredentials
  ): Promise<ServiceResponse<AuthResponseData>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
          },
        },
      });

      if (error) {
        log.error('Sign up failed', error, {
          metadata: {
            service: 'auth.service',
            method: 'signUp',
            email: credentials.email,
          },
        });
        return createServiceError(error.message);
      }

      if (!data.user) {
        return createServiceError('No user returned from sign up');
      }

      // Check if email verification is required
      if (!data.user.email_confirmed_at) {
        return createServiceSuccess({ needsVerification: true });
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || null,
        phone: data.user.phone || null,
        auth_username: data.user.user_metadata?.username || null,
        username: data.user.user_metadata?.username || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        provider: data.user.app_metadata?.provider || null,
        userRole: 'user',
      };

      return createServiceSuccess({ user: authUser });
    } catch (error) {
      log.error(
        'Unexpected error during sign up',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'auth.service',
            method: 'signUp',
            email: credentials.email,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        log.error('Sign out failed', error, {
          metadata: { service: 'auth.service', method: 'signOut' },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error during sign out',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'auth.service', method: 'signOut' },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update user profile data
   */
  async updateUserData(
    userId: string,
    updates: UserUpdateData
  ): Promise<ServiceResponse<UserData>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', userId)
        .select()
        .single();

      if (error) {
        log.error('Failed to update user data', error, {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId,
          },
        });
        return createServiceError(error.message);
      }

      // Validate the data from database
      const validationResult = userSchema.safeParse(data);
      if (!validationResult.success) {
        log.error(
          'Updated user data validation failed',
          validationResult.error,
          {
            metadata: {
              service: 'auth.service',
              method: 'updateUserData',
              userId,
            },
          }
        );
        return createServiceError('Invalid user data format');
      }

      // SAFE TRANSFORMATION - Use proper UserData transformation
      const userData = transformDbUserToUserData(validationResult.data);
      return createServiceSuccess(userData);
    } catch (error) {
      log.error(
        'Unexpected error updating user data',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        log.error('Password reset failed', error, {
          metadata: { service: 'auth.service', method: 'resetPassword', email },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error during password reset',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'auth.service', method: 'resetPassword', email },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        log.error('Password update failed', error, {
          metadata: { service: 'auth.service', method: 'updatePassword' },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error updating password',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: { service: 'auth.service', method: 'updatePassword' },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(
    provider: Provider
  ): Promise<ServiceResponse<OAuthResponseData>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback/${provider}`,
        },
      });

      if (error) {
        log.error('OAuth sign in failed', error, {
          metadata: {
            service: 'auth.service',
            method: 'signInWithOAuth',
            provider,
          },
        });
        return createServiceError(error.message);
      }

      if (!data.url) {
        return createServiceError('No OAuth URL returned');
      }

      return createServiceSuccess({
        url: data.url,
        provider,
      });
    } catch (error) {
      log.error(
        'Unexpected error during OAuth sign in',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'auth.service',
            method: 'signInWithOAuth',
            provider,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Exchange OAuth code for session
   */
  async exchangeCodeForSession(
    code: string,
    _state?: string
  ): Promise<ServiceResponse<AuthResponseData>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        log.error('OAuth code exchange failed', error, {
          metadata: {
            service: 'auth.service',
            method: 'exchangeCodeForSession',
            code: code.substring(0, 10) + '...',
          },
        });
        return createServiceError(error.message);
      }

      if (!data.user) {
        return createServiceError('No user returned from OAuth code exchange');
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || null,
        phone: data.user.phone || null,
        auth_username: data.user.user_metadata?.username || null,
        username: data.user.user_metadata?.username || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        provider: data.user.app_metadata?.provider || null,
        userRole: 'user',
      };

      return createServiceSuccess({ user: authUser });
    } catch (error) {
      log.error(
        'Unexpected error during OAuth code exchange',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'auth.service',
            method: 'exchangeCodeForSession',
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(
    callback: (
      event: string,
      session: { user: { id: string; email?: string | null } } | null
    ) => void
  ) {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        callback(event, null);
      } else {
        callback(event, {
          user: {
            id: session.user.id,
            email: session.user.email || null,
          },
        });
      }
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  },
};
