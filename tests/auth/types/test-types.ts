import type { Database, Tables } from '../../../types/database.types';

// Core test user type with password for authentication
// Note: email comes from Supabase auth, not public.users table
export type TestUser = Tables<'users'> & {
  password: string; // For testing only - not stored in DB
  email: string; // From Supabase auth.users, not public.users
  email_verified?: boolean; // From Supabase auth.users
};

// Auth session type from database with proper ip_address typing
export type AuthSession = Omit<Tables<'user_sessions'>, 'ip_address'> & {
  ip_address: string | null; // Fix from unknown to string
};

// Test auth state matching Zustand store structure
export type TestAuthState = {
  user: TestUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

// Auth API response types (with email field for auth responses)
export type LoginResponse = {
  user: Omit<TestUser, 'password'> & { password?: string }; // Password not included in API responses
  session: AuthSession;
  access_token: string;
  refresh_token: string;
  usedBackupCode?: boolean; // For MFA scenarios
  bypassUsed?: boolean; // For MFA bypass scenarios
};

export type SignupResponse = {
  user: Omit<TestUser, 'password'> & { password?: string }; // Password not included in API responses
  session?: AuthSession;
  requiresEmailVerification: boolean;
  success?: boolean;
  message?: string; // For various signup scenarios
};

export type PasswordResetResponse = {
  success: boolean;
  message: string;
};

export type EmailVerificationResponse = {
  success: boolean;
  user: Omit<TestUser, 'password'> & { password?: string }; // Password not included in API responses
  autoLogin?: boolean;
  session?: AuthSession;
  access_token?: string;
  refresh_token?: string;
};

export type ResendVerificationResponse = {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
};

// Error response types (extended for various auth scenarios)
export type AuthErrorResponse = {
  error: string;
  code: string;
  statusCode: number;
  // Optional fields for specific error types
  expiresAt?: string;
  retryAfter?: number;
  error_description?: string;
};

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'discord';

// Test user roles for RBAC testing
export type TestUserRole = Database['public']['Enums']['user_role'];

// Form data types for testing
export type LoginFormData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type SignupFormData = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
};

export type ForgotPasswordFormData = {
  email: string;
};

export type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
  token: string;
};

// Window extension for test utilities
export interface TestWindow extends Window {
  __zustand?: Record<string, {
    getState: () => unknown;
    setState: (state: unknown) => void;
    subscribe: (listener: (state: unknown) => void) => () => void;
  }>;
  xssTest?: boolean;
}

// Performance metrics type
export type AuthPerformanceMetrics = {
  loginTime: number;
  logoutTime: number;
  tokenRefreshTime: number;
  pageLoadTime: number;
  authCheckTime: number;
};

// Accessibility violation type
export type A11yViolation = {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
  }>;
};