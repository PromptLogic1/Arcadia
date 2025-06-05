/**
 * Settings Service
 *
 * Service layer for user settings operations.
 * Handles email updates, password changes, and profile preferences.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database-generated';
import { logger } from '@/lib/logger';

export type UserProfile = Tables<'users'>;
export type UserProfileUpdate = TablesUpdate<'users'>;

export interface EmailUpdateData {
  newEmail: string;
  confirmEmail: string;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileUpdateData {
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  land?: string;
  region?: string;
}

export interface NotificationSettingsData {
  email_notifications?: boolean;
  push_notifications?: boolean;
  game_invites?: boolean;
  friend_requests?: boolean;
  tournament_updates?: boolean;
}

export const settingsService = {
  /**
   * Get user profile settings
   */
  async getUserProfile(userId: string): Promise<{
    profile: UserProfile | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { profile: null, error: error.message };
      }

      return { profile: data };
    } catch (error) {
      return {
        profile: null,
        error:
          error instanceof Error ? error.message : 'Failed to fetch profile',
      };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdateData
  ): Promise<{
    profile: UserProfile | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { profile: null, error: error.message };
      }

      return { profile: data };
    } catch (error) {
      return {
        profile: null,
        error:
          error instanceof Error ? error.message : 'Failed to update profile',
      };
    }
  },

  /**
   * Update user email
   */
  async updateEmail(emailData: EmailUpdateData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { newEmail, confirmEmail } = emailData;

      // Validation
      if (newEmail !== confirmEmail) {
        return { success: false, error: 'Email addresses do not match' };
      }

      const supabase = createClient();

      // Update email in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update email',
      };
    }
  },

  /**
   * Update user password
   */
  async updatePassword(passwordData: PasswordUpdateData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      // Validation
      if (newPassword !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' };
      }

      const supabase = createClient();

      // First verify current password by attempting to sign in
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        return { success: false, error: 'User not authenticated' };
      }

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update password',
      };
    }
  },

  /**
   * Update notification settings
   * Note: For now, this is a placeholder since notification settings
   * would be stored in a separate table or as JSON in the future
   */
  async updateNotificationSettings(
    userId: string,
    settings: NotificationSettingsData
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // For now, just return success as notification settings
      // would need a dedicated table or JSON column
      logger.info('Notification settings update requested', {
        userId,
        metadata: { settings },
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update notification settings',
      };
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Note: This is a placeholder - actual account deletion would need
      // to be handled server-side for security and to clean up related data
      // For now, just return a placeholder response
      logger.warn('Account deletion requested but not implemented', {
        feature: 'settings',
      });
      return { success: false, error: 'Account deletion not yet implemented' };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete account',
      };
    }
  },

  /**
   * Validate password requirements
   */
  validatePassword(password: string): {
    isValid: boolean;
    requirements: {
      minLength: boolean;
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumber: boolean;
      hasSpecialChar: boolean;
    };
  } {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const isValid = Object.values(requirements).every(Boolean);

    return { isValid, requirements };
  },

  /**
   * Check if email is available
   */
  async checkEmailAvailability(email: string): Promise<{
    available: boolean;
    error?: string;
  }> {
    try {
      // This would typically be handled by a database function
      // For now, we'll just return true (email validation happens in auth)
      logger.debug('Email availability check requested', {
        metadata: { email },
      });
      return { available: true };
    } catch (error) {
      return {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check email availability',
      };
    }
  },
};
