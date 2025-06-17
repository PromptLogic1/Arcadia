import type { Database, Tables } from '@/types/database.types';

// Core test user type with password for authentication
export type TestUser = Tables<'users'> & {
  password: string;
  email: string; // Ensure email is always present for auth
};

// Auth session type from database
export type AuthSession = Tables<'user_sessions'>;

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
  user: Tables<'users'> & { email: string };
  session: AuthSession;
  access_token: string;
  refresh_token: string;
};

export type SignupResponse = {
  user: Tables<'users'> & { email: string };
  session?: AuthSession;
  requiresEmailVerification: boolean;
  success?: boolean;
};

export type PasswordResetResponse = {
  success: boolean;
  message: string;
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