/**
 * @jest-environment node
 */

import { settingsService } from '../settings.service';
import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
    signInWithPassword: jest.fn(),
  },
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
};

describe('settingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.upsert.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.maybeSingle.mockReturnValue(mockFrom);
  });

  describe('getUserProfile', () => {
    it('should fetch user profile by user ID', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
      };

      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await settingsService.getUserProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should try auth_id if user ID not found', async () => {
      // First query returns no data
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Second query with auth_id succeeds
      const mockProfile = {
        id: 'user-123',
        auth_id: 'auth-456',
        username: 'testuser',
      };

      // Setup the second call to from() with proper chaining
      const mockSecondFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFrom)
        .mockReturnValueOnce(mockSecondFrom);

      const result = await settingsService.getUserProfile('auth-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'users');
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'users');
    });

    it('should handle profile not found', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Second query also returns no data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await settingsService.getUserProfile('unknown-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User profile not found');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await settingsService.getUserProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = {
        username: 'newusername',
        bio: 'New bio text',
      };

      const updatedProfile = {
        id: 'user-123',
        username: 'newusername',
        bio: 'New bio text',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      const result = await settingsService.updateProfile('user-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProfile);
      expect(mockFrom.update).toHaveBeenCalledWith(updates);
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should handle update errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await settingsService.updateProfile('user-123', {
        username: 'newusername',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateEmail', () => {
    it('should update email when addresses match', async () => {
      const emailData = {
        newEmail: 'new@example.com',
        confirmEmail: 'new@example.com',
      };

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        error: null,
      });

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Email updated successfully');
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
    });

    it('should reject when emails do not match', async () => {
      const emailData = {
        newEmail: 'new@example.com',
        confirmEmail: 'different@example.com',
      };

      const result = await settingsService.updateEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email addresses do not match');
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('should handle auth update errors', async () => {
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        error: { message: 'Email already in use' },
      });

      const result = await settingsService.updateEmail({
        newEmail: 'taken@example.com',
        confirmEmail: 'taken@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already in use');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update password when current password is correct', async () => {
      const passwordData = {
        currentPassword: 'oldPass123!',
        newPassword: 'newPass456!',
        confirmPassword: 'newPass456!',
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        error: null,
      });

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        error: null,
      });

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Password updated successfully');
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'oldPass123!',
      });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPass456!',
      });
    });

    it('should reject when passwords do not match', async () => {
      const passwordData = {
        currentPassword: 'oldPass123!',
        newPassword: 'newPass456!',
        confirmPassword: 'different789!',
      };

      const result = await settingsService.updatePassword(passwordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Passwords do not match');
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should reject when current password is incorrect', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid credentials' },
      });

      const result = await settingsService.updatePassword({
        currentPassword: 'wrongPass',
        newPassword: 'newPass456!',
        confirmPassword: 'newPass456!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await settingsService.updatePassword({
        currentPassword: 'oldPass',
        newPassword: 'newPass',
        confirmPassword: 'newPass',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('getNotificationSettings', () => {
    it('should fetch existing notification settings', async () => {
      const mockSettings = {
        email_notifications: false,
        push_notifications: true,
        friend_requests: false,
        friend_activity: true,
        game_invites: true,
        game_updates: false,
        challenge_notifications: true,
        achievement_notifications: true,
        community_updates: false,
        marketing_emails: true,
        weekly_digest: false,
        maintenance_alerts: true,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
    });

    it('should handle null values with defaults', async () => {
      // Return a settings object with some null values to test the ?? operators
      const mockSettings = {
        email_notifications: null,
        push_notifications: null,
        friend_requests: null,
        friend_activity: null,
        game_invites: null,
        game_updates: null,
        challenge_notifications: null,
        achievement_notifications: null,
        community_updates: null,
        marketing_emails: null,
        weekly_digest: null,
        maintenance_alerts: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(true);
      // Should use default values when fields are null
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

    it('should handle undefined values with defaults', async () => {
      // Return a partially empty settings object to test the ?? operators with undefined
      const mockSettings = {
        email_notifications: undefined,
        push_notifications: false,
        game_invites: undefined,
        marketing_emails: undefined,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(true);
      // Should use default values when fields are undefined
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

    it('should return default settings when none exist', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        email_notifications: true,
        push_notifications: false,
        friend_requests: true,
        marketing_emails: false,
      });
    });

    it('should handle database errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors with Error instance', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in getNotificationSettings',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId: 'user-123' },
        })
      );
    });

    it('should handle unexpected errors with non-Error instance', async () => {
      mockFrom.single.mockRejectedValueOnce('String error');

      const result = await settingsService.getNotificationSettings('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch notification settings');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in getNotificationSettings',
        expect.any(Error),
        expect.objectContaining({
          metadata: { userId: 'user-123' },
        })
      );
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings successfully', async () => {
      const settings = {
        email_notifications: false,
        push_notifications: true,
        marketing_emails: true,
      };

      const updatedData = {
        user_id: 'user-123',
        ...settings,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedData,
        error: null,
      });

      const result = await settingsService.updateNotificationSettings(
        'user-123',
        settings
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        email_notifications: false,
        push_notifications: true,
        marketing_emails: true,
      });
      expect(mockFrom.upsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        ...settings,
        updated_at: expect.any(String),
      });
    });

    it('should handle null values in updated settings with defaults', async () => {
      const settings = {
        email_notifications: false,
      };

      // Return data with some null values to test the ?? operators
      const updatedData = {
        user_id: 'user-123',
        email_notifications: false,
        push_notifications: null,
        friend_requests: null,
        friend_activity: null,
        game_invites: null,
        game_updates: null,
        challenge_notifications: null,
        achievement_notifications: null,
        community_updates: null,
        marketing_emails: null,
        weekly_digest: null,
        maintenance_alerts: null,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedData,
        error: null,
      });

      const result = await settingsService.updateNotificationSettings(
        'user-123',
        settings
      );

      expect(result.success).toBe(true);
      // Should use default values when fields are null
      expect(result.data).toEqual({
        email_notifications: false,
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

    it('should handle undefined values in updated settings with defaults', async () => {
      const settings = {
        push_notifications: true,
        marketing_emails: true,
      };

      // Return data with some undefined values to test the ?? operators
      const updatedData = {
        user_id: 'user-123',
        email_notifications: undefined,
        push_notifications: true,
        game_invites: undefined,
        marketing_emails: true,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedData,
        error: null,
      });

      const result = await settingsService.updateNotificationSettings(
        'user-123',
        settings
      );

      expect(result.success).toBe(true);
      // Should use default values when fields are undefined
      expect(result.data).toEqual({
        email_notifications: true,
        push_notifications: true,
        friend_requests: true,
        friend_activity: true,
        game_invites: true,
        game_updates: true,
        challenge_notifications: true,
        achievement_notifications: true,
        community_updates: true,
        marketing_emails: true,
        weekly_digest: true,
        maintenance_alerts: true,
      });
    });

    it('should handle update errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await settingsService.updateNotificationSettings(
        'user-123',
        { email_notifications: false }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('should return not implemented error', async () => {
      const result = await settingsService.deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account deletion not yet implemented');
      expect(logger.warn).toHaveBeenCalledWith(
        'Account deletion requested but not implemented',
        expect.objectContaining({ feature: 'settings' })
      );
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = settingsService.validatePassword('StrongPass123!');

      expect(result.isValid).toBe(true);
      expect(result.requirements).toEqual({
        minLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecialChar: true,
      });
    });

    it('should reject weak password', () => {
      const result = settingsService.validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.requirements).toMatchObject({
        minLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    });

    it('should check individual requirements', () => {
      const result = settingsService.validatePassword('longenough');

      expect(result.isValid).toBe(false);
      expect(result.requirements).toMatchObject({
        minLength: true,
        hasUppercase: false,
        hasLowercase: true,
        hasNumber: false,
        hasSpecialChar: false,
      });
    });
  });

  describe('checkEmailAvailability', () => {
    it('should return email as available', async () => {
      const result =
        await settingsService.checkEmailAvailability('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ available: true });
      expect(logger.debug).toHaveBeenCalledWith(
        'Email availability check requested',
        expect.objectContaining({
          metadata: { email: 'test@example.com' },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Force an error by mocking logger.debug to throw
      (logger.debug as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result =
        await settingsService.checkEmailAvailability('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
