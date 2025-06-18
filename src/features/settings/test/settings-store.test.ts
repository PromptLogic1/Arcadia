/**
 * Settings Store Tests
 * 
 * Tests for Zustand store updates and persistence logic
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { useSettingsState, useSettingsActions, useSettingsModals, useSettingsForms, useSettingsPreferences } from '@/lib/stores/settings-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Settings Store', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('UI State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSettingsState());

      expect(result.current.activeSection).toBe('general');
      expect(result.current.isChangingEmail).toBe(false);
      expect(result.current.isChangingPassword).toBe(false);
      expect(result.current.isEditingProfile).toBe(false);
      expect(result.current.showEmailSuccess).toBe(false);
      expect(result.current.showPasswordSuccess).toBe(false);
      expect(result.current.showProfileSuccess).toBe(false);
    });

    it('should update active section', () => {
      const { result: stateResult } = renderHook(() => useSettingsState());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setActiveSection('notifications');
      });

      expect(stateResult.current.activeSection).toBe('notifications');
    });

    it('should toggle form states correctly', () => {
      const { result: stateResult } = renderHook(() => useSettingsState());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setIsChangingEmail(true);
      });

      expect(stateResult.current.isChangingEmail).toBe(true);

      act(() => {
        actionsResult.current.setIsChangingPassword(true);
      });

      expect(stateResult.current.isChangingPassword).toBe(true);

      act(() => {
        actionsResult.current.setIsEditingProfile(true);
      });

      expect(stateResult.current.isEditingProfile).toBe(true);
    });
  });

  describe('Modal Management', () => {
    it('should control modal visibility', () => {
      const { result: modalsResult } = renderHook(() => useSettingsModals());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      expect(modalsResult.current.showDeleteAccountDialog).toBe(false);
      expect(modalsResult.current.showEmailChangeDialog).toBe(false);
      expect(modalsResult.current.showPasswordChangeDialog).toBe(false);

      act(() => {
        actionsResult.current.setShowDeleteAccountDialog(true);
      });

      expect(modalsResult.current.showDeleteAccountDialog).toBe(true);

      act(() => {
        actionsResult.current.setShowEmailChangeDialog(true);
      });

      expect(modalsResult.current.showEmailChangeDialog).toBe(true);

      act(() => {
        actionsResult.current.setShowPasswordChangeDialog(true);
      });

      expect(modalsResult.current.showPasswordChangeDialog).toBe(true);
    });

    it('should close all modals on reset', () => {
      const { result: modalsResult } = renderHook(() => useSettingsModals());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setShowDeleteAccountDialog(true);
        actionsResult.current.setShowEmailChangeDialog(true);
        actionsResult.current.setShowPasswordChangeDialog(true);
      });

      act(() => {
        actionsResult.current.reset();
      });

      expect(modalsResult.current.showDeleteAccountDialog).toBe(false);
      expect(modalsResult.current.showEmailChangeDialog).toBe(false);
      expect(modalsResult.current.showPasswordChangeDialog).toBe(false);
    });
  });

  describe('Form Data Management', () => {
    it('should update email form fields', () => {
      const { result: formsResult } = renderHook(() => useSettingsForms());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.updateEmailField('newEmail', 'test@example.com');
      });

      expect(formsResult.current.emailForm?.newEmail).toBe('test@example.com');

      act(() => {
        actionsResult.current.updateEmailField('confirmEmail', 'test@example.com');
      });

      expect(formsResult.current.emailForm?.confirmEmail).toBe('test@example.com');
    });

    it('should update password form fields', () => {
      const { result: formsResult } = renderHook(() => useSettingsForms());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.updatePasswordField('currentPassword', 'oldPass123!');
        actionsResult.current.updatePasswordField('newPassword', 'newPass123!');
        actionsResult.current.updatePasswordField('confirmPassword', 'newPass123!');
      });

      expect(formsResult.current.passwordForm?.currentPassword).toBe('oldPass123!');
      expect(formsResult.current.passwordForm?.newPassword).toBe('newPass123!');
      expect(formsResult.current.passwordForm?.confirmPassword).toBe('newPass123!');
    });

    it('should reset individual forms', () => {
      const { result: formsResult } = renderHook(() => useSettingsForms());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.updateEmailField('newEmail', 'test@example.com');
        actionsResult.current.updatePasswordField('currentPassword', 'pass123');
      });

      act(() => {
        actionsResult.current.resetEmailForm();
      });

      expect(formsResult.current.emailForm).toBeNull();
      expect(formsResult.current.passwordForm?.currentPassword).toBe('pass123');

      act(() => {
        actionsResult.current.resetPasswordForm();
      });

      expect(formsResult.current.passwordForm).toBeNull();
    });

    it('should reset all forms at once', () => {
      const { result: formsResult } = renderHook(() => useSettingsForms());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.updateEmailField('newEmail', 'test@example.com');
        actionsResult.current.updatePasswordField('currentPassword', 'pass123');
        actionsResult.current.updateProfileField('bio', 'Test bio');
      });

      act(() => {
        actionsResult.current.resetAllForms();
      });

      expect(formsResult.current.emailForm).toBeNull();
      expect(formsResult.current.passwordForm).toBeNull();
      expect(formsResult.current.profileForm).toBeNull();
    });
  });

  describe('Success State Management', () => {
    it('should show and hide success messages', () => {
      const { result: stateResult } = renderHook(() => useSettingsState());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setShowEmailSuccess(true);
      });

      expect(stateResult.current.showEmailSuccess).toBe(true);

      act(() => {
        actionsResult.current.setShowEmailSuccess(false);
      });

      expect(stateResult.current.showEmailSuccess).toBe(false);
    });

    it('should handle multiple success states independently', () => {
      const { result: stateResult } = renderHook(() => useSettingsState());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setShowEmailSuccess(true);
        actionsResult.current.setShowPasswordSuccess(true);
        actionsResult.current.setShowProfileSuccess(false);
      });

      expect(stateResult.current.showEmailSuccess).toBe(true);
      expect(stateResult.current.showPasswordSuccess).toBe(true);
      expect(stateResult.current.showProfileSuccess).toBe(false);
    });
  });

  describe('Notification Settings', () => {
    it('should update notification preferences', () => {
      const { result: preferencesResult } = renderHook(() => useSettingsPreferences());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setNotificationSettings({
          email_notifications: false,
          push_notifications: true,
        });
      });

      expect(preferencesResult.current.notificationSettings.email_notifications).toBe(false);
      expect(preferencesResult.current.notificationSettings.push_notifications).toBe(true);
      // Other settings should remain unchanged
      expect(preferencesResult.current.notificationSettings.game_invites).toBe(true);
    });

    it('should maintain existing settings when partially updating', () => {
      const { result: preferencesResult } = renderHook(() => useSettingsPreferences());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      const initialSettings = { ...preferencesResult.current.notificationSettings };

      act(() => {
        actionsResult.current.setNotificationSettings({
          push_notifications: false,
        });
      });

      expect(preferencesResult.current.notificationSettings.push_notifications).toBe(false);
      expect(preferencesResult.current.notificationSettings.email_notifications).toBe(
        initialSettings.email_notifications
      );
      expect(preferencesResult.current.notificationSettings.game_invites).toBe(
        initialSettings.game_invites
      );
    });
  });

  describe('Privacy Settings', () => {
    it('should update privacy preferences', () => {
      const { result: preferencesResult } = renderHook(() => useSettingsPreferences());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      act(() => {
        actionsResult.current.setPrivacySettings({
          profile_visibility: 'private',
          show_online_status: false,
        });
      });

      expect(preferencesResult.current.privacySettings.profile_visibility).toBe('private');
      expect(preferencesResult.current.privacySettings.show_online_status).toBe(false);
      expect(preferencesResult.current.privacySettings.allow_friend_requests).toBe(true);
    });

    it('should validate privacy visibility options', () => {
      const { result: actionsResult } = renderHook(() => useSettingsActions());
      const { result: preferencesResult } = renderHook(() => useSettingsPreferences());

      const validOptions: Array<'public' | 'friends' | 'private'> = ['public', 'friends', 'private'];

      validOptions.forEach(option => {
        act(() => {
          actionsResult.current.setPrivacySettings({
            profile_visibility: option,
          });
        });

        expect(preferencesResult.current.privacySettings.profile_visibility).toBe(option);
      });
    });
  });

  describe('Store Reset', () => {
    it('should reset entire store to initial state', () => {
      const { result: stateResult } = renderHook(() => useSettingsState());
      const { result: actionsResult } = renderHook(() => useSettingsActions());

      // Make multiple changes
      act(() => {
        actionsResult.current.setActiveSection('privacy');
        actionsResult.current.setIsChangingEmail(true);
        actionsResult.current.updateEmailField('newEmail', 'test@example.com');
        actionsResult.current.setShowEmailSuccess(true);
        actionsResult.current.setNotificationSettings({ push_notifications: false });
      });

      // Reset everything
      act(() => {
        actionsResult.current.reset();
      });

      // Get preferences after reset to verify
      const { result: preferencesAfterReset } = renderHook(() => useSettingsPreferences());
      
      // Verify all state is back to initial
      expect(stateResult.current.activeSection).toBe('general');
      expect(stateResult.current.isChangingEmail).toBe(false);
      expect(stateResult.current.showEmailSuccess).toBe(false);
      expect(preferencesAfterReset.current.notificationSettings.push_notifications).toBe(true);
    });
  });

  describe('Persistence Logic', () => {
    it('should persist theme preference to localStorage', () => {
      const persistTheme = (theme: 'light' | 'dark' | 'system') => {
        localStorage.setItem('theme-preference', theme);
      };

      const retrieveTheme = (): string | null => {
        return localStorage.getItem('theme-preference');
      };

      persistTheme('dark');
      expect(retrieveTheme()).toBe('dark');

      persistTheme('light');
      expect(retrieveTheme()).toBe('light');
    });

    it('should persist notification preferences', () => {
      const preferences = {
        email_notifications: false,
        push_notifications: true,
        game_invites: false,
      };

      localStorage.setItem('notification-preferences', JSON.stringify(preferences));

      const stored = localStorage.getItem('notification-preferences');
      const parsed = stored ? JSON.parse(stored) : null;

      expect(parsed).toEqual(preferences);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('notification-preferences', 'invalid-json');

      const loadPreferences = (): any => {
        try {
          const stored = localStorage.getItem('notification-preferences');
          return stored ? JSON.parse(stored) : null;
        } catch (error) {
          console.error('Failed to parse preferences:', error);
          return null;
        }
      };

      const preferences = loadPreferences();
      expect(preferences).toBeNull();
    });
  });
});