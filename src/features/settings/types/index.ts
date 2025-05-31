import type { 
  TablesUpdate, 
  ProfileFormData,
  VisibilityType 
} from '@/types';

// Settings categories
export interface UserSettings {
  profile: ProfileSettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  preferences: UserPreferences;
  security: SecuritySettings;
}

// Profile settings (use consolidated type)
export type ProfileSettings = ProfileFormData;

export interface ProfileSettingsFormData extends ProfileFormData {
  currentPassword?: string; // Required for sensitive changes
}

// Privacy settings
export interface PrivacySettings {
  profile_visibility: VisibilityType;
  achievements_visibility: VisibilityType;
  submissions_visibility: VisibilityType;
  show_online_status: boolean;
  allow_friend_requests: boolean;
  show_activity: boolean;
  search_visibility: boolean;
}

export type PrivacySettingsFormData = PrivacySettings;

// Notification settings
export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  friend_requests: boolean;
  friend_activity: boolean;
  game_invites: boolean;
  game_updates: boolean;
  challenge_notifications: boolean;
  achievement_notifications: boolean;
  community_updates: boolean;
  marketing_emails: boolean;
  weekly_digest: boolean;
  maintenance_alerts: boolean;
}

export type NotificationSettingsFormData = NotificationSettings;

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  time_format: '12h' | '24h';
  sound_effects: boolean;
  animations: boolean;
  reduced_motion: boolean;
  auto_save: boolean;
  show_tooltips: boolean;
  items_per_page: number;
  default_board_size: number;
  default_game_visibility: boolean;
}

export type UserPreferencesFormData = UserPreferences;

// Security settings
export interface SecuritySettings {
  two_factor_enabled: boolean;
  backup_codes_count: number;
  active_sessions_count: number;
  last_password_change?: string;
  login_alerts: boolean;
  suspicious_activity_alerts: boolean;
}

export interface SecuritySettingsFormData {
  current_password: string;
  new_password?: string;
  confirm_password?: string;
  two_factor_enabled?: boolean;
  login_alerts?: boolean;
  suspicious_activity_alerts?: boolean;
}

// Account management
export interface AccountSettings {
  email: string;
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  created_at: string;
  last_login_at?: string;
  status: 'active' | 'suspended' | 'deleted';
}

export interface UpdateEmailFormData {
  current_password: string;
  new_email: string;
  confirm_email: string;
}

export interface UpdatePasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface DeactivateAccountFormData {
  password: string;
  reason?: string;
  feedback?: string;
  confirm_deactivation: boolean;
}

// Two-factor authentication
export interface TwoFactorSettings {
  enabled: boolean;
  secret?: string;
  qr_code?: string;
  backup_codes: string[];
  recovery_email?: string;
}

export interface EnableTwoFactorFormData {
  password: string;
  token: string;
}

export interface DisableTwoFactorFormData {
  password: string;
  token?: string;
  backup_code?: string;
}

// Session management
export interface UserSession {
  id: string;
  device_info?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    os?: string;
  };
  ip_address?: string;
  location?: {
    city?: string;
    country?: string;
  };
  created_at: string;
  last_activity: string;
  is_current: boolean;
}

// Data export/import
export interface DataExportRequest {
  types: (
    | 'profile'
    | 'boards'
    | 'games'
    | 'achievements'
    | 'friends'
    | 'submissions'
  )[];
  format: 'json' | 'csv';
  date_range?: {
    from: string;
    to: string;
  };
}

export interface DataExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  download_url?: string;
  expires_at?: string;
  error_message?: string;
}

// Settings validation
export interface SettingsValidationRules {
  username: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
    reserved: string[];
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  bio: {
    maxLength: number;
  };
  fullName: {
    maxLength: number;
  };
}

// Component props
export interface SettingsTabProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

export interface SettingsFormProps<T> {
  data: T;
  onSubmit: (data: T) => Promise<void>;
  loading?: boolean;
  errors?: Record<string, string>;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

// Settings navigation
export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subsections?: SettingsSubsection[];
}

export interface SettingsSubsection {
  id: string;
  title: string;
  description?: string;
}

// API types
export type UserSettingsUpdate = TablesUpdate<'users'>;

export interface SettingsUpdateRequest {
  section: 'profile' | 'privacy' | 'notifications' | 'preferences' | 'security';
  data: Record<string, unknown>;
}

export interface SettingsUpdateResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}

// Constants
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your public profile information',
    subsections: [
      { id: 'basic', title: 'Basic Information' },
      { id: 'avatar', title: 'Profile Picture' },
      { id: 'location', title: 'Location' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Control who can see your information',
    subsections: [
      { id: 'visibility', title: 'Profile Visibility' },
      { id: 'activity', title: 'Activity Settings' },
      { id: 'search', title: 'Search & Discovery' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Choose what you want to be notified about',
    subsections: [
      { id: 'email', title: 'Email Notifications' },
      { id: 'push', title: 'Push Notifications' },
      { id: 'marketing', title: 'Marketing Communications' },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your experience',
    subsections: [
      { id: 'appearance', title: 'Appearance' },
      { id: 'language', title: 'Language & Region' },
      { id: 'accessibility', title: 'Accessibility' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Keep your account secure',
    subsections: [
      { id: 'password', title: 'Password' },
      { id: 'two-factor', title: 'Two-Factor Authentication' },
      { id: 'sessions', title: 'Active Sessions' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your account settings',
    subsections: [
      { id: 'email', title: 'Email Address' },
      { id: 'data', title: 'Data & Privacy' },
      { id: 'delete', title: 'Delete Account' },
    ],
  },
] as const;

// Validation rules (moved locally since not used from @/types)
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  FULL_NAME: {
    MAX_LENGTH: 100,
  },
} as const;

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
] as const;

export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
] as const;
