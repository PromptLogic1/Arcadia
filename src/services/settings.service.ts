/**
 * Settings Service
 *
 * Service layer for user settings operations.
 * Handles email updates, password changes, and profile preferences.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database.types';
import { logger } from '@/lib/logger';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';

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
  friend_requests?: boolean;
  friend_activity?: boolean;
  game_invites?: boolean;
  game_updates?: boolean;
  challenge_notifications?: boolean;
  achievement_notifications?: boolean;
  community_updates?: boolean;
  marketing_emails?: boolean;
  weekly_digest?: boolean;
  maintenance_alerts?: boolean;
}

export const settingsService = {
  /**
   * Get user profile settings
   */
  async getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const supabase = createClient();

      // First try to get by public user ID
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // If no data found, it might be an auth_id, so try that
      if (!data && !error) {
        const authResult = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', userId)
          .maybeSingle();

        data = authResult.data;
        error = authResult.error;
      }

      if (error) {
        logger.error('Failed to fetch user profile', error, {
          metadata: { userId },
        });
        return createServiceError(error.message);
      }

      if (!data) {
        logger.error('User profile not found', new Error('User not found'), {
          metadata: { userId },
        });
        return createServiceError('User profile not found');
      }

      return createServiceSuccess(data);
    } catch (error) {
      // Ensure error is properly typed before logging
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in getUserProfile', errorToLog, {
        metadata: { userId },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to fetch profile'
      );
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdateData
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update user profile', error, {
          metadata: { userId, updates },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      // Ensure error is properly typed before logging
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in updateProfile', errorToLog, {
        metadata: { userId, updates },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    }
  },

  /**
   * Update user email
   */
  async updateEmail(
    emailData: EmailUpdateData
  ): Promise<ServiceResponse<{ message: string }>> {
    try {
      const { newEmail, confirmEmail } = emailData;

      // Validation
      if (newEmail !== confirmEmail) {
        return createServiceError('Email addresses do not match');
      }

      const supabase = createClient();

      // Update email in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        logger.error('Failed to update email', error, {
          metadata: { newEmail },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess({ message: 'Email updated successfully' });
    } catch (error) {
      // Ensure error is properly typed before logging
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in updateEmail', errorToLog);
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to update email'
      );
    }
  },

  /**
   * Update user password
   */
  async updatePassword(
    passwordData: PasswordUpdateData
  ): Promise<ServiceResponse<{ message: string }>> {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      // Validation
      if (newPassword !== confirmPassword) {
        return createServiceError('Passwords do not match');
      }

      const supabase = createClient();

      // First verify current password by attempting to sign in
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        return createServiceError('User not authenticated');
      }

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (verifyError) {
        logger.warn('Current password verification failed', {
          metadata: { userId: currentUser.id },
        });
        return createServiceError('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        logger.error('Failed to update password', updateError, {
          metadata: { userId: currentUser.id },
        });
        return createServiceError(updateError.message);
      }

      return createServiceSuccess({ message: 'Password updated successfully' });
    } catch (error) {
      // Ensure error is properly typed before logging
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in updatePassword', errorToLog);
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to update password'
      );
    }
  },

  /**
   * Get notification settings
   */
  async getNotificationSettings(
    userId: string
  ): Promise<ServiceResponse<NotificationSettingsData>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If settings don't exist, return defaults
        if (error.code === 'PGRST116') {
          return createServiceSuccess({
            email_notifications: true,
            push_notifications: false,
            friend_requests: true,
            friend_activity: true,
            game_invites: true,
            game_updates: true,
            challenge_notifications: true,
            achievement_notifications: true,
            community_updates: true,
            marketing_emails: false,
            weekly_digest: true,
            maintenance_alerts: true,
          });
        }

        logger.error('Failed to fetch notification settings', error, {
          metadata: { userId },
        });
        return createServiceError(error.message);
      }

      const settings: NotificationSettingsData = {
        email_notifications: data.email_notifications ?? true,
        push_notifications: data.push_notifications ?? false,
        friend_requests: data.friend_requests ?? true,
        friend_activity: data.friend_activity ?? true,
        game_invites: data.game_invites ?? true,
        game_updates: data.game_updates ?? true,
        challenge_notifications: data.challenge_notifications ?? true,
        achievement_notifications: data.achievement_notifications ?? true,
        community_updates: data.community_updates ?? true,
        marketing_emails: data.marketing_emails ?? false,
        weekly_digest: data.weekly_digest ?? true,
        maintenance_alerts: data.maintenance_alerts ?? true,
      };
      return createServiceSuccess(settings);
    } catch (error) {
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in getNotificationSettings', errorToLog, {
        metadata: { userId },
      });
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch notification settings'
      );
    }
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: NotificationSettingsData
  ): Promise<ServiceResponse<NotificationSettingsData>> {
    try {
      const supabase = createClient();

      // Upsert settings
      const { data, error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to update notification settings', error, {
          metadata: { userId, settings },
        });
        return createServiceError(error.message);
      }

      const updatedSettings: NotificationSettingsData = {
        email_notifications: data.email_notifications ?? true,
        push_notifications: data.push_notifications ?? false,
        friend_requests: data.friend_requests ?? true,
        friend_activity: data.friend_activity ?? true,
        game_invites: data.game_invites ?? true,
        game_updates: data.game_updates ?? true,
        challenge_notifications: data.challenge_notifications ?? true,
        achievement_notifications: data.achievement_notifications ?? true,
        community_updates: data.community_updates ?? true,
        marketing_emails: data.marketing_emails ?? false,
        weekly_digest: data.weekly_digest ?? true,
        maintenance_alerts: data.maintenance_alerts ?? true,
      };
      return createServiceSuccess(updatedSettings);
    } catch (error) {
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        'Unexpected error in updateNotificationSettings',
        errorToLog,
        {
          metadata: { userId, settings },
        }
      );
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to update notification settings'
      );
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<ServiceResponse<{ message: string }>> {
    try {
      // Note: This is a placeholder - actual account deletion would need
      // to be handled server-side for security and to clean up related data
      // For now, just return a placeholder response
      logger.warn('Account deletion requested but not implemented', {
        feature: 'settings',
      });
      return createServiceError('Account deletion not yet implemented');
    } catch (error) {
      // Ensure error is properly typed before logging
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in deleteAccount', errorToLog);
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to delete account'
      );
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
  async checkEmailAvailability(
    email: string
  ): Promise<ServiceResponse<{ available: boolean }>> {
    try {
      // This would typically be handled by a database function
      // For now, we'll just return true (email validation happens in auth)
      logger.debug('Email availability check requested', {
        metadata: { email },
      });
      return createServiceSuccess({ available: true });
    } catch (error) {
      // Ensure error is properly typed before logging
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in checkEmailAvailability', errorToLog, {
        metadata: { email },
      });
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to check email availability'
      );
    }
  },
};
