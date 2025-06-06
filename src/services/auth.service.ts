/**
 * Authentication Service
 *
 * Pure functions for authentication operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { AuthUser, UserData } from '@/lib/stores/types';
// Validation imports available if needed later
import { transformDbUserToUserData } from '@/lib/stores/auth-store';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  username?: string;
}

export interface AuthResponse {
  user?: AuthUser;
  error?: string;
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

export const authService = {
  /**
   * Get current session
   */
  async getSession(): Promise<{
    session: { user: { id: string; email?: string | null } } | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { session: null, error: error.message };
      }

      return { session: data.session };
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error.message : 'Failed to get session',
      };
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ user: AuthUser | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null };
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

      return { user: authUser };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Failed to get user',
      };
    }
  },

  /**
   * Get user profile data from users table
   */
  async getUserData(
    userId: string
  ): Promise<{ userData: UserData | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (error) {
        return { userData: null, error: error.message };
      }

      // SAFE TRANSFORMATION - Use proper UserData transformation
      const userData = transformDbUserToUserData(data);
      return { userData };
    } catch (error) {
      return {
        userData: null,
        error:
          error instanceof Error ? error.message : 'Failed to get user data',
      };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      const supabase = createClient();
      const { data, error } =
        await supabase.auth.signInWithPassword(credentials);

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'No user returned from sign in' };
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

      return { user: authUser };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign in failed',
      };
    }
  },

  /**
   * Sign up with email and password
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
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
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'No user returned from sign up' };
      }

      // Check if email verification is required
      if (!data.user.email_confirmed_at) {
        return { needsVerification: true };
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

      return { user: authUser };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign up failed',
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign out failed',
      };
    }
  },

  /**
   * Update user profile data
   */
  async updateUserData(
    userId: string,
    updates: UserUpdateData
  ): Promise<{ userData: UserData | null; error?: string }> {
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
        return { userData: null, error: error.message };
      }

      // SAFE TRANSFORMATION - Use proper UserData transformation
      const userData = transformDbUserToUserData(data);
      return { userData };
    } catch (error) {
      return {
        userData: null,
        error:
          error instanceof Error ? error.message : 'Failed to update user data',
      };
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Password reset failed',
      };
    }
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Password update failed',
      };
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
      callback(event, session);
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  },
};
