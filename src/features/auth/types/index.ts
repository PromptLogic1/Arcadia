import { z as _z } from 'zod';
import type {
  TablesInsert,
  TablesUpdate,
  User,
  UserRole,
  VisibilityType,
} from '@/types';

// Auth state types
export interface AuthUser extends User {
  email?: string;
  emailVerified?: boolean;
  lastSignInAt?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: AuthUser;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  fullName?: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token: string;
}

export interface UpdatePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileFormData {
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  region?: string;
  land?: string;
  profile_visibility?: VisibilityType;
  achievements_visibility?: VisibilityType;
  submissions_visibility?: VisibilityType;
}

// Auth context types
export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (data: LoginFormData) => Promise<{ error?: string }>;
  signUp: (data: SignupFormData) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (data: UpdatePasswordFormData) => Promise<{ error?: string }>;
  updateProfile: (data: UpdateProfileFormData) => Promise<{ error?: string }>;
  refreshSession: () => Promise<void>;
}

// Auth provider props
export interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth guard types
export interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireRole?: UserRole;
  fallback?: React.ReactNode;
}

// OAuth types
export interface OAuthProvider {
  id: 'google' | 'github' | 'discord' | 'twitter';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface OAuthSignInOptions {
  provider: OAuthProvider['id'];
  redirectTo?: string;
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  status?: number;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Session management types
export interface SessionInfo {
  id: string;
  device_info?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
  };
  ip_address?: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_current?: boolean;
}

// User insert/update types
export type UserInsert = TablesInsert<'users'>;
export type UserUpdate = TablesUpdate<'users'>;

// Constants
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  OAUTH_SUCCESS: '/auth/oauth-success',
} as const;

export const USER_ROLES: Record<UserRole, string> = {
  user: 'User',
  premium: 'Premium',
  moderator: 'Moderator',
  admin: 'Administrator',
} as const;

export const VISIBILITY_OPTIONS: Record<VisibilityType, string> = {
  public: 'Public',
  friends: 'Friends Only',
  private: 'Private',
} as const;

// Re-export types for convenience
export type { UserRole, VisibilityType };
