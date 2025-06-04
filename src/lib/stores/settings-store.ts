/**
 * Settings Store (Zustand)
 * 
 * UI state management for settings functionality.
 * Server data is handled by TanStack Query hooks.
 * This store only manages UI-specific state.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

export interface SettingsState {
  // Modal and dialog states
  showDeleteAccountDialog: boolean;
  showEmailChangeDialog: boolean;
  showPasswordChangeDialog: boolean;
  
  // Form states - Track which forms are expanded/active
  isChangingEmail: boolean;
  isChangingPassword: boolean;
  isEditingProfile: boolean;
  
  // Form data for controlled inputs
  emailForm: {
    newEmail: string;
    confirmEmail: string;
  } | null;
  
  passwordForm: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  } | null;
  
  profileForm: {
    username?: string;
    display_name?: string;
    bio?: string;
    timezone?: string;
    preferred_language?: string;
  } | null;
  
  // UI feedback states
  showEmailSuccess: boolean;
  showPasswordSuccess: boolean;
  showProfileSuccess: boolean;
  
  // Settings tab/section navigation
  activeSection: 'general' | 'profile' | 'notifications' | 'privacy' | 'account';
  
  // Notification settings UI
  notificationSettings: {
    email_notifications: boolean;
    push_notifications: boolean;
    game_invites: boolean;
    friend_requests: boolean;
    tournament_updates: boolean;
  };
  
  // Privacy settings UI
  privacySettings: {
    profile_visibility: 'public' | 'friends' | 'private';
    show_online_status: boolean;
    allow_friend_requests: boolean;
  };
}

export interface SettingsActions {
  // Modal management
  setShowDeleteAccountDialog: (show: boolean) => void;
  setShowEmailChangeDialog: (show: boolean) => void;
  setShowPasswordChangeDialog: (show: boolean) => void;
  
  // Form state management
  setIsChangingEmail: (changing: boolean) => void;
  setIsChangingPassword: (changing: boolean) => void;
  setIsEditingProfile: (editing: boolean) => void;
  
  // Form data management
  setEmailForm: (form: SettingsState['emailForm']) => void;
  updateEmailField: (field: keyof NonNullable<SettingsState['emailForm']>, value: string) => void;
  resetEmailForm: () => void;
  
  setPasswordForm: (form: SettingsState['passwordForm']) => void;
  updatePasswordField: (field: keyof NonNullable<SettingsState['passwordForm']>, value: string) => void;
  resetPasswordForm: () => void;
  
  setProfileForm: (form: SettingsState['profileForm']) => void;
  updateProfileField: (field: keyof NonNullable<SettingsState['profileForm']>, value: string) => void;
  resetProfileForm: () => void;
  
  // Success state management
  setShowEmailSuccess: (show: boolean) => void;
  setShowPasswordSuccess: (show: boolean) => void;
  setShowProfileSuccess: (show: boolean) => void;
  
  // Section navigation
  setActiveSection: (section: SettingsState['activeSection']) => void;
  
  // Settings management
  setNotificationSettings: (settings: Partial<SettingsState['notificationSettings']>) => void;
  setPrivacySettings: (settings: Partial<SettingsState['privacySettings']>) => void;
  
  // Utility actions
  resetAllForms: () => void;
  reset: () => void;
}

const initialState: SettingsState = {
  showDeleteAccountDialog: false,
  showEmailChangeDialog: false,
  showPasswordChangeDialog: false,
  isChangingEmail: false,
  isChangingPassword: false,
  isEditingProfile: false,
  emailForm: null,
  passwordForm: null,
  profileForm: null,
  showEmailSuccess: false,
  showPasswordSuccess: false,
  showProfileSuccess: false,
  activeSection: 'general',
  notificationSettings: {
    email_notifications: true,
    push_notifications: true,
    game_invites: true,
    friend_requests: true,
    tournament_updates: true,
  },
  privacySettings: {
    profile_visibility: 'public',
    show_online_status: true,
    allow_friend_requests: true,
  },
};

const useSettingsStore = createWithEqualityFn<SettingsState & SettingsActions>()(
  devtools(
    (set, _get) => ({
      ...initialState,

      // Modal management
      setShowDeleteAccountDialog: (show) =>
        set({ showDeleteAccountDialog: show }, false, 'setShowDeleteAccountDialog'),

      setShowEmailChangeDialog: (show) =>
        set({ showEmailChangeDialog: show }, false, 'setShowEmailChangeDialog'),

      setShowPasswordChangeDialog: (show) =>
        set({ showPasswordChangeDialog: show }, false, 'setShowPasswordChangeDialog'),

      // Form state management
      setIsChangingEmail: (isChangingEmail) =>
        set({ isChangingEmail }, false, 'setIsChangingEmail'),

      setIsChangingPassword: (isChangingPassword) =>
        set({ isChangingPassword }, false, 'setIsChangingPassword'),

      setIsEditingProfile: (isEditingProfile) =>
        set({ isEditingProfile }, false, 'setIsEditingProfile'),

      // Email form management
      setEmailForm: (emailForm) =>
        set({ emailForm }, false, 'setEmailForm'),

      updateEmailField: (field, value) =>
        set(
          (state) => ({
            emailForm: state.emailForm
              ? { ...state.emailForm, [field]: value }
              : { newEmail: '', confirmEmail: '', [field]: value },
          }),
          false,
          'updateEmailField'
        ),

      resetEmailForm: () =>
        set({ emailForm: null, isChangingEmail: false }, false, 'resetEmailForm'),

      // Password form management
      setPasswordForm: (passwordForm) =>
        set({ passwordForm }, false, 'setPasswordForm'),

      updatePasswordField: (field, value) =>
        set(
          (state) => ({
            passwordForm: state.passwordForm
              ? { ...state.passwordForm, [field]: value }
              : { currentPassword: '', newPassword: '', confirmPassword: '', [field]: value },
          }),
          false,
          'updatePasswordField'
        ),

      resetPasswordForm: () =>
        set({ passwordForm: null, isChangingPassword: false }, false, 'resetPasswordForm'),

      // Profile form management
      setProfileForm: (profileForm) =>
        set({ profileForm }, false, 'setProfileForm'),

      updateProfileField: (field, value) =>
        set(
          (state) => ({
            profileForm: state.profileForm
              ? { ...state.profileForm, [field]: value }
              : { [field]: value },
          }),
          false,
          'updateProfileField'
        ),

      resetProfileForm: () =>
        set({ profileForm: null, isEditingProfile: false }, false, 'resetProfileForm'),

      // Success state management
      setShowEmailSuccess: (showEmailSuccess) =>
        set({ showEmailSuccess }, false, 'setShowEmailSuccess'),

      setShowPasswordSuccess: (showPasswordSuccess) =>
        set({ showPasswordSuccess }, false, 'setShowPasswordSuccess'),

      setShowProfileSuccess: (showProfileSuccess) =>
        set({ showProfileSuccess }, false, 'setShowProfileSuccess'),

      // Section navigation
      setActiveSection: (activeSection) =>
        set({ activeSection }, false, 'setActiveSection'),

      // Settings management
      setNotificationSettings: (newSettings) =>
        set(
          (state) => ({
            notificationSettings: { ...state.notificationSettings, ...newSettings },
          }),
          false,
          'setNotificationSettings'
        ),

      setPrivacySettings: (newSettings) =>
        set(
          (state) => ({
            privacySettings: { ...state.privacySettings, ...newSettings },
          }),
          false,
          'setPrivacySettings'
        ),

      // Utility actions
      resetAllForms: () =>
        set({
          emailForm: null,
          passwordForm: null,
          profileForm: null,
          isChangingEmail: false,
          isChangingPassword: false,
          isEditingProfile: false,
          showEmailSuccess: false,
          showPasswordSuccess: false,
          showProfileSuccess: false,
        }, false, 'resetAllForms'),

      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'settings-store',
    }
  )
);

// Selectors for performance optimization
export const useSettingsState = () =>
  useSettingsStore(
    useShallow(state => ({
      activeSection: state.activeSection,
      isChangingEmail: state.isChangingEmail,
      isChangingPassword: state.isChangingPassword,
      isEditingProfile: state.isEditingProfile,
      showEmailSuccess: state.showEmailSuccess,
      showPasswordSuccess: state.showPasswordSuccess,
      showProfileSuccess: state.showProfileSuccess,
    }))
  );

export const useSettingsModals = () =>
  useSettingsStore(
    useShallow(state => ({
      showDeleteAccountDialog: state.showDeleteAccountDialog,
      showEmailChangeDialog: state.showEmailChangeDialog,
      showPasswordChangeDialog: state.showPasswordChangeDialog,
    }))
  );

export const useSettingsForms = () =>
  useSettingsStore(
    useShallow(state => ({
      emailForm: state.emailForm,
      passwordForm: state.passwordForm,
      profileForm: state.profileForm,
    }))
  );

export const useSettingsPreferences = () =>
  useSettingsStore(
    useShallow(state => ({
      notificationSettings: state.notificationSettings,
      privacySettings: state.privacySettings,
    }))
  );

export const useSettingsActions = () =>
  useSettingsStore(
    useShallow(state => ({
      // Modal actions
      setShowDeleteAccountDialog: state.setShowDeleteAccountDialog,
      setShowEmailChangeDialog: state.setShowEmailChangeDialog,
      setShowPasswordChangeDialog: state.setShowPasswordChangeDialog,
      
      // Form state actions
      setIsChangingEmail: state.setIsChangingEmail,
      setIsChangingPassword: state.setIsChangingPassword,
      setIsEditingProfile: state.setIsEditingProfile,
      
      // Form data actions
      setEmailForm: state.setEmailForm,
      updateEmailField: state.updateEmailField,
      resetEmailForm: state.resetEmailForm,
      setPasswordForm: state.setPasswordForm,
      updatePasswordField: state.updatePasswordField,
      resetPasswordForm: state.resetPasswordForm,
      setProfileForm: state.setProfileForm,
      updateProfileField: state.updateProfileField,
      resetProfileForm: state.resetProfileForm,
      
      // Success state actions
      setShowEmailSuccess: state.setShowEmailSuccess,
      setShowPasswordSuccess: state.setShowPasswordSuccess,
      setShowProfileSuccess: state.setShowProfileSuccess,
      
      // Navigation actions
      setActiveSection: state.setActiveSection,
      
      // Settings actions
      setNotificationSettings: state.setNotificationSettings,
      setPrivacySettings: state.setPrivacySettings,
      
      // Utility actions
      resetAllForms: state.resetAllForms,
      reset: state.reset,
    }))
  );

export default useSettingsStore;