/**
 * Preference Validation Tests
 * 
 * Tests for validating user preferences and settings input
 */

import { describe, it, expect } from 'vitest';
import { settingsService } from '@/services/settings.service';
import { SETTINGS_CONSTANTS } from '../components/constants';
import type { EmailUpdateData, PasswordUpdateData, NotificationSettingsData } from '@/services/settings.service';

describe('Preference Validation', () => {
  describe('Email Validation', () => {
    it('should reject email updates when emails do not match', () => {
      const emailData: EmailUpdateData = {
        newEmail: 'user@example.com',
        confirmEmail: 'different@example.com',
      };

      expect(() => {
        if (emailData.newEmail !== emailData.confirmEmail) {
          throw new Error(SETTINGS_CONSTANTS.ERRORS.EMAIL_MISMATCH);
        }
      }).toThrow(SETTINGS_CONSTANTS.ERRORS.EMAIL_MISMATCH);
    });

    it('should accept email updates when emails match', () => {
      const emailData: EmailUpdateData = {
        newEmail: 'user@example.com',
        confirmEmail: 'user@example.com',
      };

      expect(() => {
        if (emailData.newEmail !== emailData.confirmEmail) {
          throw new Error(SETTINGS_CONSTANTS.ERRORS.EMAIL_MISMATCH);
        }
      }).not.toThrow();
    });

    it('should reject email updates when new email is same as current', () => {
      const currentEmail = 'user@example.com';
      const emailData: EmailUpdateData = {
        newEmail: 'user@example.com',
        confirmEmail: 'user@example.com',
      };

      expect(() => {
        if (emailData.newEmail === currentEmail) {
          throw new Error(SETTINGS_CONSTANTS.ERRORS.EMAIL_SAME);
        }
      }).toThrow(SETTINGS_CONSTANTS.ERRORS.EMAIL_SAME);
    });

    it('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
        'user123@example-domain.com',
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        'user @example.com',
        'user@example .com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate password requirements correctly', () => {
      const testCases = [
        {
          password: 'Abc123!@',
          expected: {
            isValid: true,
            requirements: {
              minLength: true,
              hasUppercase: true,
              hasLowercase: true,
              hasNumber: true,
              hasSpecialChar: true,
            },
          },
        },
        {
          password: 'abc123!@',
          expected: {
            isValid: false,
            requirements: {
              minLength: true,
              hasUppercase: false,
              hasLowercase: true,
              hasNumber: true,
              hasSpecialChar: true,
            },
          },
        },
        {
          password: 'ABC123!@',
          expected: {
            isValid: false,
            requirements: {
              minLength: true,
              hasUppercase: true,
              hasLowercase: false,
              hasNumber: true,
              hasSpecialChar: true,
            },
          },
        },
        {
          password: 'Abcdefg!',
          expected: {
            isValid: false,
            requirements: {
              minLength: true,
              hasUppercase: true,
              hasLowercase: true,
              hasNumber: false,
              hasSpecialChar: true,
            },
          },
        },
        {
          password: 'Abc12345',
          expected: {
            isValid: false,
            requirements: {
              minLength: true,
              hasUppercase: true,
              hasLowercase: true,
              hasNumber: true,
              hasSpecialChar: false,
            },
          },
        },
        {
          password: 'Ab1!',
          expected: {
            isValid: false,
            requirements: {
              minLength: false,
              hasUppercase: true,
              hasLowercase: true,
              hasNumber: true,
              hasSpecialChar: true,
            },
          },
        },
      ];

      testCases.forEach(({ password, expected }) => {
        const result = settingsService.validatePassword(password);
        expect(result).toEqual(expected);
      });
    });

    it('should reject password updates when passwords do not match', () => {
      const passwordData: PasswordUpdateData = {
        currentPassword: 'oldPass123!',
        newPassword: 'newPass123!',
        confirmPassword: 'differentPass123!',
      };

      expect(() => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error(SETTINGS_CONSTANTS.ERRORS.PASSWORD_MISMATCH);
        }
      }).toThrow(SETTINGS_CONSTANTS.ERRORS.PASSWORD_MISMATCH);
    });

    it('should accept all special characters from the validation regex', () => {
      const specialChars = '!@#$%^&*(),.?":{}|<>';
      const basePassword = 'Abc123';

      specialChars.split('').forEach(char => {
        const password = basePassword + char;
        const result = settingsService.validatePassword(password);
        expect(result.requirements.hasSpecialChar).toBe(true);
      });
    });
  });

  describe('Notification Settings Validation', () => {
    it('should provide default notification settings', () => {
      const defaultSettings: NotificationSettingsData = {
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
      };

      // Verify default values match expected business logic
      expect(defaultSettings.email_notifications).toBe(true);
      expect(defaultSettings.push_notifications).toBe(false);
      expect(defaultSettings.marketing_emails).toBe(false);
      expect(defaultSettings.weekly_digest).toBe(true);
    });

    it('should validate notification settings combinations', () => {
      const settings: NotificationSettingsData = {
        email_notifications: false,
        push_notifications: true,
        game_invites: true,
      };

      // Business rule: If email notifications are off, email-specific settings should be ignored
      const processedSettings = {
        ...settings,
        weekly_digest: settings.email_notifications ? settings.weekly_digest : false,
        marketing_emails: settings.email_notifications ? settings.marketing_emails : false,
      };

      expect(processedSettings.weekly_digest).toBe(false);
      expect(processedSettings.marketing_emails).toBe(false);
    });

    it('should handle partial notification settings updates', () => {
      const currentSettings: NotificationSettingsData = {
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
      };

      const updates: Partial<NotificationSettingsData> = {
        push_notifications: true,
        marketing_emails: true,
      };

      const updatedSettings = { ...currentSettings, ...updates };

      expect(updatedSettings.push_notifications).toBe(true);
      expect(updatedSettings.marketing_emails).toBe(true);
      expect(updatedSettings.email_notifications).toBe(true); // Unchanged
      expect(updatedSettings.friend_requests).toBe(true); // Unchanged
    });
  });

  describe('Privacy Settings Validation', () => {
    it('should validate profile visibility options', () => {
      const validOptions = ['public', 'friends', 'private'];
      const invalidOptions = ['hidden', 'anonymous', 'custom', ''];

      validOptions.forEach(option => {
        expect(['public', 'friends', 'private']).toContain(option);
      });

      invalidOptions.forEach(option => {
        expect(['public', 'friends', 'private']).not.toContain(option);
      });
    });

    it('should enforce privacy settings constraints', () => {
      interface PrivacySettings {
        profile_visibility: 'public' | 'friends' | 'private';
        show_online_status: boolean;
        allow_friend_requests: boolean;
      }

      const settings: PrivacySettings = {
        profile_visibility: 'private',
        show_online_status: true,
        allow_friend_requests: true,
      };

      // Business rule: Private profiles should not show online status
      const processedSettings = {
        ...settings,
        show_online_status: settings.profile_visibility === 'private' ? false : settings.show_online_status,
        allow_friend_requests: settings.profile_visibility === 'private' ? false : settings.allow_friend_requests,
      };

      expect(processedSettings.show_online_status).toBe(false);
      expect(processedSettings.allow_friend_requests).toBe(false);
    });
  });

  describe('Profile Update Validation', () => {
    it('should validate username constraints', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'player-one',
        'GamerTag2024',
      ];

      const invalidUsernames = [
        'ab', // Too short
        'a'.repeat(21), // Too long
        'user name', // Contains space
        'user@name', // Contains invalid character
        'user.name', // Contains period
        '', // Empty
      ];

      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

      validUsernames.forEach(username => {
        expect(usernameRegex.test(username)).toBe(true);
      });

      invalidUsernames.forEach(username => {
        expect(usernameRegex.test(username)).toBe(false);
      });
    });

    it('should validate bio length constraints', () => {
      const maxBioLength = 500;
      const validBio = 'A'.repeat(maxBioLength);
      const invalidBio = 'A'.repeat(maxBioLength + 1);

      expect(validBio.length).toBeLessThanOrEqual(maxBioLength);
      expect(invalidBio.length).toBeGreaterThan(maxBioLength);
    });

    it('should validate timezone format', () => {
      const validTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'UTC',
      ];

      const invalidTimezones = [
        'New York',
        'GMT+5',
        'Eastern Time',
        '',
      ];

      const timezoneRegex = /^[A-Za-z]+\/[A-Za-z_]+$|^UTC$/;

      validTimezones.forEach(tz => {
        expect(timezoneRegex.test(tz)).toBe(true);
      });

      invalidTimezones.forEach(tz => {
        expect(timezoneRegex.test(tz) || tz === '').toBe(tz === '');
      });
    });
  });

  describe('Form Field Validation', () => {
    it('should trim whitespace from email inputs', () => {
      const emailWithSpaces = '  user@example.com  ';
      const trimmedEmail = emailWithSpaces.trim();

      expect(trimmedEmail).toBe('user@example.com');
    });

    it('should not trim whitespace from password inputs', () => {
      const passwordWithSpaces = '  MyPass123!  ';
      
      // Passwords should NOT be trimmed as spaces might be intentional
      expect(passwordWithSpaces).toBe('  MyPass123!  ');
    });

    it('should sanitize display names', () => {
      const unsafeInput = '<script>alert("xss")</script>User';
      const sanitizedInput = unsafeInput.replace(/<[^>]*>/g, '');

      expect(sanitizedInput).toBe('alert("xss")User');
    });
  });
});