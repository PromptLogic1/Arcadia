/**
 * Settings Hook
 *
 * Combines TanStack Query + Zustand + Service Layer pattern for settings management.
 * This replaces the legacy useEmailUpdate and usePasswordUpdate hooks.
 *
 * - TanStack Query: Server state (profile data, mutations)
 * - Zustand Store: UI state (forms, modals, sections)
 * - Service Layer: Pure API functions
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/stores/auth-store';
import { useSettingsOperations } from '@/hooks/queries/useSettingsQueries';
import {
  useSettingsState,
  useSettingsModals,
  useSettingsForms,
  useSettingsPreferences,
  useSettingsActions,
  type SettingsState,
} from '@/lib/stores/settings-store';
import { settingsService } from '../../../services/settings.service';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-guards';
import type {
  EmailUpdateData,
  PasswordUpdateData,
  ProfileUpdateData,
  NotificationSettingsData,
  UserProfile,
} from '../../../services/settings.service';

export interface UseSettingsReturn {
  // Server state (from TanStack Query)
  profile: UserProfile | null | undefined;
  isLoading: boolean;
  error: Error | null;

  // UI state (from Zustand store)
  activeSection: SettingsState['activeSection'];
  isChangingEmail: boolean;
  isChangingPassword: boolean;
  isEditingProfile: boolean;
  showEmailSuccess: boolean;
  showPasswordSuccess: boolean;
  showProfileSuccess: boolean;

  // Modal states
  showDeleteAccountDialog: boolean;
  showEmailChangeDialog: boolean;
  showPasswordChangeDialog: boolean;

  // Form data
  emailForm: SettingsState['emailForm'];
  passwordForm: SettingsState['passwordForm'];
  profileForm: SettingsState['profileForm'];

  // Preferences
  notificationSettings: SettingsState['notificationSettings'];
  privacySettings: SettingsState['privacySettings'];

  // Loading states for operations
  isUpdatingProfile: boolean;
  isUpdatingEmail: boolean;
  isUpdatingPassword: boolean;
  isUpdatingNotifications: boolean;
  isDeletingAccount: boolean;
  isMutating: boolean;

  // Actions - Modal management
  setShowDeleteAccountDialog: (show: boolean) => void;
  setShowEmailChangeDialog: (show: boolean) => void;
  setShowPasswordChangeDialog: (show: boolean) => void;

  // Actions - Form state management
  setIsChangingEmail: (changing: boolean) => void;
  setIsChangingPassword: (changing: boolean) => void;
  setIsEditingProfile: (editing: boolean) => void;

  // Actions - Form data management
  updateEmailField: (
    field: keyof NonNullable<SettingsState['emailForm']>,
    value: string
  ) => void;
  updatePasswordField: (
    field: keyof NonNullable<SettingsState['passwordForm']>,
    value: string
  ) => void;
  updateProfileField: (
    field: keyof NonNullable<SettingsState['profileForm']>,
    value: string
  ) => void;
  resetEmailForm: () => void;
  resetPasswordForm: () => void;
  resetProfileForm: () => void;

  // Actions - Settings operations
  handleEmailUpdate: (data: EmailUpdateData) => Promise<void>;
  handlePasswordUpdate: (data: PasswordUpdateData) => Promise<void>;
  handleProfileUpdate: (data: ProfileUpdateData) => Promise<void>;
  handleNotificationUpdate: (
    settings: NotificationSettingsData
  ) => Promise<void>;
  handleDeleteAccount: () => Promise<void>;

  // Actions - Section navigation
  setActiveSection: (
    section: 'general' | 'profile' | 'notifications' | 'privacy' | 'account'
  ) => void;

  // Actions - Success state management
  setShowEmailSuccess: (show: boolean) => void;
  setShowPasswordSuccess: (show: boolean) => void;
  setShowProfileSuccess: (show: boolean) => void;

  // Utility actions
  resetAllForms: () => void;
  refreshProfile: () => void;
  validatePassword: (
    password: string
  ) => ReturnType<typeof settingsService.validatePassword>;
}

/**
 * Modern settings hook combining TanStack Query + Zustand
 */
export function useSettings(): UseSettingsReturn {
  // Auth state
  const { authUser } = useAuth();
  const userId = authUser?.id || '';

  // Mount tracking for setTimeout cleanup
  const isMountedRef = useRef(true);
  const emailSuccessTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const passwordSuccessTimeoutRef = useRef<NodeJS.Timeout | undefined>(
    undefined
  );
  const profileSuccessTimeoutRef = useRef<NodeJS.Timeout | undefined>(
    undefined
  );

  // TanStack Query for server state
  const settingsOperations = useSettingsOperations(userId);

  // Destructure operations for stable references
  const {
    updateEmail,
    updatePassword,
    updateProfile,
    updateNotifications,
    deleteAccount,
    refetch,
  } = settingsOperations;

  // Zustand store for UI state
  const uiState = useSettingsState();
  const modals = useSettingsModals();
  const forms = useSettingsForms();
  const preferences = useSettingsPreferences();
  const actions = useSettingsActions();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts
      if (emailSuccessTimeoutRef.current) {
        clearTimeout(emailSuccessTimeoutRef.current);
      }
      if (passwordSuccessTimeoutRef.current) {
        clearTimeout(passwordSuccessTimeoutRef.current);
      }
      if (profileSuccessTimeoutRef.current) {
        clearTimeout(profileSuccessTimeoutRef.current);
      }
    };
  }, []);

  // Auto-refresh profile when user changes
  useEffect(() => {
    if (userId && refetch) {
      refetch();
    }
  }, [userId, refetch]);

  // Enhanced email update with validation and UI feedback
  const handleEmailUpdate = useCallback(
    async (data: EmailUpdateData) => {
      try {
        // Pre-validation
        if (data.newEmail !== data.confirmEmail) {
          throw new Error('Email addresses do not match');
        }

        if (data.newEmail === authUser?.email) {
          throw new Error('New email is the same as current email');
        }

        await updateEmail(data);

        // UI feedback
        actions.setShowEmailSuccess(true);
        actions.resetEmailForm();

        // Auto-hide success message after delay with cleanup
        emailSuccessTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            actions.setShowEmailSuccess(false);
          }
        }, 5000);

        logger.info('Email update completed successfully', {
          metadata: { userId, newEmail: data.newEmail },
        });
      } catch (error) {
        logger.error('Email update failed', toError(error), {
          metadata: { userId, newEmail: data.newEmail },
        });
        throw error; // Re-throw to let the mutation handle error notifications
      }
    },
    [authUser?.email, updateEmail, actions, userId]
  );

  // Enhanced password update with validation
  const handlePasswordUpdate = useCallback(
    async (data: PasswordUpdateData) => {
      try {
        // Pre-validation
        if (data.newPassword !== data.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const passwordValidation = settingsService.validatePassword(
          data.newPassword
        );
        if (!passwordValidation.isValid) {
          throw new Error('Password does not meet security requirements');
        }

        await updatePassword(data);

        // UI feedback
        actions.setShowPasswordSuccess(true);
        actions.resetPasswordForm();

        // Auto-hide success message after delay with cleanup
        passwordSuccessTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            actions.setShowPasswordSuccess(false);
          }
        }, 5000);

        logger.info('Password update completed successfully', {
          metadata: { userId },
        });
      } catch (error) {
        logger.error('Password update failed', toError(error), {
          metadata: { userId },
        });
        throw error; // Re-throw to let the mutation handle error notifications
      }
    },
    [updatePassword, actions, userId]
  );

  // Enhanced profile update
  const handleProfileUpdate = useCallback(
    async (data: ProfileUpdateData) => {
      try {
        await updateProfile(data);

        // UI feedback
        actions.setShowProfileSuccess(true);
        actions.resetProfileForm();

        // Auto-hide success message after delay with cleanup
        profileSuccessTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            actions.setShowProfileSuccess(false);
          }
        }, 5000);

        logger.info('Profile update completed successfully', {
          metadata: { userId, updates: data },
        });
      } catch (error) {
        logger.error('Profile update failed', toError(error), {
          metadata: { userId, updates: data },
        });
        throw error; // Re-throw to let the mutation handle error notifications
      }
    },
    [updateProfile, actions, userId]
  );

  // Enhanced notification settings update
  const handleNotificationUpdate = useCallback(
    async (settings: NotificationSettingsData) => {
      try {
        await updateNotifications(settings);

        // Update local UI state
        actions.setNotificationSettings(settings);

        logger.info('Notification settings updated successfully', {
          metadata: { userId, settings },
        });
      } catch (error) {
        logger.error('Notification settings update failed', toError(error), {
          metadata: { userId, settings },
        });
        throw error;
      }
    },
    [updateNotifications, actions, userId]
  );

  // Enhanced account deletion
  const handleDeleteAccount = useCallback(async () => {
    try {
      await deleteAccount();

      logger.info('Account deletion completed successfully', {
        metadata: { userId },
      });
    } catch (error) {
      logger.error('Account deletion failed', toError(error), {
        metadata: { userId },
      });
      throw error;
    }
  }, [deleteAccount, userId]);

  // Enhanced form field updates with validation
  const updateEmailField = useCallback(
    (field: keyof NonNullable<SettingsState['emailForm']>, value: string) => {
      actions.updateEmailField(field, value);
    },
    [actions]
  );

  const updatePasswordField = useCallback(
    (
      field: keyof NonNullable<SettingsState['passwordForm']>,
      value: string
    ) => {
      actions.updatePasswordField(field, value);
    },
    [actions]
  );

  const updateProfileField = useCallback(
    (field: keyof NonNullable<SettingsState['profileForm']>, value: string) => {
      actions.updateProfileField(field, value);
    },
    [actions]
  );

  // Password validation helper
  const validatePassword = useCallback((password: string) => {
    return settingsService.validatePassword(password);
  }, []);

  return {
    // Server state
    profile: settingsOperations.profile,
    isLoading: settingsOperations.isLoading,
    error: settingsOperations.error,

    // UI state
    activeSection: uiState.activeSection,
    isChangingEmail: uiState.isChangingEmail,
    isChangingPassword: uiState.isChangingPassword,
    isEditingProfile: uiState.isEditingProfile,
    showEmailSuccess: uiState.showEmailSuccess,
    showPasswordSuccess: uiState.showPasswordSuccess,
    showProfileSuccess: uiState.showProfileSuccess,

    // Modal states
    showDeleteAccountDialog: modals.showDeleteAccountDialog,
    showEmailChangeDialog: modals.showEmailChangeDialog,
    showPasswordChangeDialog: modals.showPasswordChangeDialog,

    // Form data
    emailForm: forms.emailForm,
    passwordForm: forms.passwordForm,
    profileForm: forms.profileForm,

    // Preferences
    notificationSettings: preferences.notificationSettings,
    privacySettings: preferences.privacySettings,

    // Loading states
    isUpdatingProfile: settingsOperations.isUpdatingProfile,
    isUpdatingEmail: settingsOperations.isUpdatingEmail,
    isUpdatingPassword: settingsOperations.isUpdatingPassword,
    isUpdatingNotifications: settingsOperations.isUpdatingNotifications,
    isDeletingAccount: settingsOperations.isDeletingAccount,
    isMutating: settingsOperations.isMutating,

    // Modal management
    setShowDeleteAccountDialog: actions.setShowDeleteAccountDialog,
    setShowEmailChangeDialog: actions.setShowEmailChangeDialog,
    setShowPasswordChangeDialog: actions.setShowPasswordChangeDialog,

    // Form state management
    setIsChangingEmail: actions.setIsChangingEmail,
    setIsChangingPassword: actions.setIsChangingPassword,
    setIsEditingProfile: actions.setIsEditingProfile,

    // Form data management
    updateEmailField,
    updatePasswordField,
    updateProfileField,
    resetEmailForm: actions.resetEmailForm,
    resetPasswordForm: actions.resetPasswordForm,
    resetProfileForm: actions.resetProfileForm,

    // Settings operations
    handleEmailUpdate,
    handlePasswordUpdate,
    handleProfileUpdate,
    handleNotificationUpdate,
    handleDeleteAccount,

    // Section navigation
    setActiveSection: actions.setActiveSection,

    // Success state management
    setShowEmailSuccess: actions.setShowEmailSuccess,
    setShowPasswordSuccess: actions.setShowPasswordSuccess,
    setShowProfileSuccess: actions.setShowProfileSuccess,

    // Utility actions
    resetAllForms: actions.resetAllForms,
    refreshProfile: refetch,
    validatePassword,
  };
}
