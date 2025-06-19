/**
 * @jest-environment node
 */

import { settingsService } from '../settings.service';
import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { ProfileUpdateData, NotificationSettingsData } from '../settings.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

const mockSupabase = {
  from: jest.fn(),
  auth: {
    updateUser: jest.fn(),
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
  },
};

const mockFrom = {
  select: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  eq: jest.fn(),
  maybeSingle: jest.fn(),
  single: jest.fn(),
};

describe('settingsService - Additional Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.upsert.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.maybeSingle.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
  });

  describe('getUserProfile - additional edge cases', () => {
    it('should fallback to auth_id when public ID not found', async () => {
      const userId = 'auth-user-123';
      const userProfile = {
        id: 'public-user-456',
        auth_id: 'auth-user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      // First call (by public ID) returns no data
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Second call (by auth_id) returns user data
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: userProfile,
        error: null,
      });

      const result = await settingsService.getUserProfile(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(userProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', userId);
      expect(mockFrom.eq).toHaveBeenCalledWith('auth_id', userId);
    });

    it('should handle database error in first query', async () => {
      const userId = 'user-123';

      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await settingsService.getUserProfile(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user profile',
        expect.any(Object),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });

    it('should handle database error in fallback query', async () => {
      const userId = 'user-123';

      // First call succeeds but returns no data
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Second call (fallback) fails
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Auth ID query failed' },
      });

      const result = await settingsService.getUserProfile(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth ID query failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle user not found in both queries', async () => {
      const userId = 'nonexistent-user';

      // Both queries return no data
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await settingsService.getUserProfile(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User profile not found');
      expect(logger.error).toHaveBeenCalledWith(
        'User profile not found',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });

    it('should handle unexpected error', async () => {
      const userId = 'user-123';

      mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Network error'));

      const result = await settingsService.getUserProfile(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in getUserProfile',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });

    it('should handle non-Error unexpected error', async () => {
      const userId = 'user-123';

      mockFrom.maybeSingle.mockRejectedValueOnce('String error');

      const result = await settingsService.getUserProfile(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch profile');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in getUserProfile',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });
  });

  describe('updateProfile - additional edge cases', () => {
    it('should handle partial profile updates', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = {
        username: 'newusername',
        bio: 'Updated bio',
      };

      const updatedProfile = {
        id: userId,
        username: 'newusername',
        bio: 'Updated bio',
        full_name: 'Existing Name',
        email: 'test@example.com',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      const result = await settingsService.updateProfile(userId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProfile);
      expect(mockFrom.update).toHaveBeenCalledWith(updates);
    });

    it('should handle empty updates object', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = {};

      const existingProfile = {
        id: userId,
        username: 'existinguser',
        email: 'test@example.com',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
      });

      const result = await settingsService.updateProfile(userId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(existingProfile);
      expect(mockFrom.update).toHaveBeenCalledWith(updates);
    });

    it('should handle database constraint violation', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = {
        username: 'takenusername',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Username already exists', code: '23505' },
      });

      const result = await settingsService.updateProfile(userId, updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already exists');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update user profile',
        expect.any(Object),
        expect.objectContaining({
          metadata: { userId, updates },
        })
      );
    });

    it('should handle unexpected error during update', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = {
        username: 'newusername',
      };

      mockFrom.single.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await settingsService.updateProfile(userId, updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updateProfile',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId, updates },
        })
      );
    });

    it('should handle non-Error unexpected error during update', async () => {
      const userId = 'user-123';
      const updates: ProfileUpdateData = {
        username: 'newusername',
      };

      mockFrom.single.mockRejectedValueOnce('String error');

      const result = await settingsService.updateProfile(userId, updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update profile');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updateProfile',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId, updates },
        })
      );
    });
  });

  describe('updateEmail - additional edge cases', () => {
    it('should handle Supabase auth error', async () => {
      const emailData = {
        newEmail: 'new@example.com',
        confirmEmail: 'new@example.com',
      };

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email already in use' },
      });

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already in use');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update email',
        expect.any(Object),
        expect.objectContaining({
          metadata: { newEmail: 'new@example.com' },
        })
      );
    });

    it('should handle email validation with whitespace', async () => {
      const emailData = {
        newEmail: ' new@example.com ',
        confirmEmail: ' new@example.com ',
      };

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { email: 'new@example.com' } },
        error: null,
      });

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Email updated successfully');
    });

    it('should handle case-sensitive email mismatch', async () => {
      const emailData = {
        newEmail: 'new@example.com',
        confirmEmail: 'New@Example.com',
      };

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email addresses do not match');
    });

    it('should handle unexpected error during email update', async () => {
      const emailData = {
        newEmail: 'new@example.com',
        confirmEmail: 'new@example.com',
      };

      mockSupabase.auth.updateUser.mockRejectedValueOnce(new Error('Auth service unavailable'));

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth service unavailable');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updateEmail',
        expect.any(Error)
      );
    });

    it('should handle non-Error unexpected error during email update', async () => {
      const emailData = {
        newEmail: 'new@example.com',
        confirmEmail: 'new@example.com',
      };

      mockSupabase.auth.updateUser.mockRejectedValueOnce('Auth error');

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update email');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updateEmail',
        expect.any(Error)
      );
    });
  });

  describe('updatePassword - additional edge cases', () => {
    it('should handle user not authenticated', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle user without email', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } }, // No email
        error: null,
      });

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      expect(logger.warn).toHaveBeenCalledWith(
        'Current password verification failed',
        expect.objectContaining({
          metadata: { userId: 'user-123' },
        })
      );
    });

    it('should handle password update failure', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Password too weak' },
      });

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update password',
        expect.any(Object),
        expect.objectContaining({
          metadata: { userId: 'user-123' },
        })
      );
    });

    it('should handle case-sensitive password confirmation', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'NewPass123!',
        confirmPassword: 'newpass123!',
      };

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });

    it('should handle unexpected error during password update', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth service down'));

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth service down');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updatePassword',
        expect.any(Error)
      );
    });

    it('should handle non-Error unexpected error during password update', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      mockSupabase.auth.getUser.mockRejectedValueOnce('Auth error');

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update password');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updatePassword',
        expect.any(Error)
      );
    });
  });

  describe('getNotificationSettings - additional edge cases', () => {
    it('should return default settings when record not found', async () => {
      const userId = 'user-123';

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await settingsService.getNotificationSettings(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
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
    });

    it('should handle partial notification settings with defaults', async () => {
      const userId = 'user-123';
      const partialSettings = {
        user_id: userId,
        email_notifications: false,
        game_invites: false,
        // Other fields missing/null
      };

      mockFrom.single.mockResolvedValueOnce({
        data: partialSettings,
        error: null,
      });

      const result = await settingsService.getNotificationSettings(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        email_notifications: false,
        push_notifications: false, // default
        friend_requests: true, // default
        friend_activity: true, // default
        game_invites: false,
        game_updates: true, // default
        challenge_notifications: true, // default
        achievement_notifications: true, // default
        community_updates: true, // default
        marketing_emails: false, // default
        weekly_digest: true, // default
        maintenance_alerts: true, // default
      });
    });

    it('should handle database error that is not "not found"', async () => {
      const userId = 'user-123';

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database connection failed' },
      });

      const result = await settingsService.getNotificationSettings(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch notification settings',
        expect.any(Object),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });

    it('should handle unexpected error', async () => {
      const userId = 'user-123';

      mockFrom.single.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await settingsService.getNotificationSettings(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in getNotificationSettings',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });

    it('should handle non-Error unexpected error', async () => {
      const userId = 'user-123';

      mockFrom.single.mockRejectedValueOnce('String error');

      const result = await settingsService.getNotificationSettings(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch notification settings');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in getNotificationSettings',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId },
        })
      );
    });
  });

  describe('updateNotificationSettings - additional edge cases', () => {
    it('should handle partial settings update', async () => {
      const userId = 'user-123';
      const partialSettings: NotificationSettingsData = {
        email_notifications: false,
        game_invites: true,
      };

      const updatedRecord = {
        user_id: userId,
        email_notifications: false,
        push_notifications: true,
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
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedRecord,
        error: null,
      });

      const result = await settingsService.updateNotificationSettings(userId, partialSettings);

      expect(result.success).toBe(true);
      expect(mockFrom.upsert).toHaveBeenCalledWith({
        user_id: userId,
        ...partialSettings,
        updated_at: expect.any(String),
      });
    });

    it('should handle upsert database error', async () => {
      const userId = 'user-123';
      const settings: NotificationSettingsData = {
        email_notifications: false,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Foreign key violation', code: '23503' },
      });

      const result = await settingsService.updateNotificationSettings(userId, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Foreign key violation');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update notification settings',
        expect.any(Object),
        expect.objectContaining({
          metadata: { userId, settings },
        })
      );
    });

    it('should handle unexpected error during update', async () => {
      const userId = 'user-123';
      const settings: NotificationSettingsData = {
        email_notifications: false,
      };

      mockFrom.single.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await settingsService.updateNotificationSettings(userId, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updateNotificationSettings',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId, settings },
        })
      );
    });

    it('should handle non-Error unexpected error during update', async () => {
      const userId = 'user-123';
      const settings: NotificationSettingsData = {
        email_notifications: false,
      };

      mockFrom.single.mockRejectedValueOnce('Network error');

      const result = await settingsService.updateNotificationSettings(userId, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update notification settings');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in updateNotificationSettings',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId, settings },
        })
      );
    });
  });

  describe('deleteAccount', () => {
    it('should return not implemented error', async () => {
      const result = await settingsService.deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account deletion not yet implemented');
      expect(logger.warn).toHaveBeenCalledWith(
        'Account deletion requested but not implemented',
        expect.objectContaining({
          feature: 'settings',
        })
      );
    });

    it('should handle unexpected error', async () => {
      // Force an error by making logger.warn throw
      const originalWarn = logger.warn;
      logger.warn = jest.fn().mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      const result = await settingsService.deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logger error');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in deleteAccount',
        expect.any(Error)
      );

      // Restore original logger
      logger.warn = originalWarn;
    });

    it('should handle non-Error unexpected error', async () => {
      // Force a non-Error by making logger.warn throw string
      const originalWarn = logger.warn;
      logger.warn = jest.fn().mockImplementationOnce(() => {
        throw 'String error';
      });

      const result = await settingsService.deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete account');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in deleteAccount',
        expect.any(Error)
      );

      // Restore original logger
      logger.warn = originalWarn;
    });
  });

  describe('validatePassword', () => {
    it('should validate password with all requirements met', () => {
      const password = 'StrongPass123!';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(true);
      expect(result.requirements).toEqual({
        minLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecialChar: true,
      });
    });

    it('should fail validation for short password', () => {
      const password = 'Short1!';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.requirements.minLength).toBe(false);
    });

    it('should fail validation for password without uppercase', () => {
      const password = 'lowercase123!';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.requirements.hasUppercase).toBe(false);
    });

    it('should fail validation for password without lowercase', () => {
      const password = 'UPPERCASE123!';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.requirements.hasLowercase).toBe(false);
    });

    it('should fail validation for password without numbers', () => {
      const password = 'NoNumbers!';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.requirements.hasNumber).toBe(false);
    });

    it('should fail validation for password without special characters', () => {
      const password = 'NoSpecial123';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.requirements.hasSpecialChar).toBe(false);
    });

    it('should handle empty password', () => {
      const password = '';

      const result = settingsService.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.requirements).toEqual({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    });

    it('should validate various special characters', () => {
      const specialChars = '!@#$%^&*(),.?":{}|<>';
      
      for (const char of specialChars) {
        const password = `Valid123${char}`;
        const result = settingsService.validatePassword(password);
        
        expect(result.requirements.hasSpecialChar).toBe(true);
      }
    });

    it('should fail for password with only spaces as special chars', () => {
      const password = 'Password123 ';

      const result = settingsService.validatePassword(password);

      expect(result.requirements.hasSpecialChar).toBe(false);
    });
  });

  describe('checkEmailAvailability', () => {
    it('should return available true for any email', async () => {
      const email = 'test@example.com';

      const result = await settingsService.checkEmailAvailability(email);

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        'Email availability check requested',
        expect.objectContaining({
          metadata: { email },
        })
      );
    });

    it('should handle unexpected error', async () => {
      const email = 'test@example.com';

      // Force an error by making logger.debug throw
      const originalDebug = logger.debug;
      logger.debug = jest.fn().mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      const result = await settingsService.checkEmailAvailability(email);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logger error');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in checkEmailAvailability',
        expect.any(Error),
        expect.objectContaining({
          metadata: { email },
        })
      );

      // Restore original logger
      logger.debug = originalDebug;
    });

    it('should handle non-Error unexpected error', async () => {
      const email = 'test@example.com';

      // Force a non-Error by making logger.debug throw string
      const originalDebug = logger.debug;
      logger.debug = jest.fn().mockImplementationOnce(() => {
        throw 'String error';
      });

      const result = await settingsService.checkEmailAvailability(email);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check email availability');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in checkEmailAvailability',
        expect.any(Error),
        expect.objectContaining({
          metadata: { email },
        })
      );

      // Restore original logger
      logger.debug = originalDebug;
    });
  });
});