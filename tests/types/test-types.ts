/**
 * Global test types for all test suites
 * Aligned with actual project implementation
 */

import type { Database, Tables } from '../../types/database.types';

// Window extension for test utilities (consistent across all tests)
export interface TestWindow extends Window {
  __zustand?: Record<string, {
    getState: () => unknown;
    setState: (state: unknown) => void;
    subscribe: (listener: (state: unknown) => void) => () => void;
  }>;
  __analyticsEvents?: Array<{
    provider?: string;
    data?: unknown;
    args?: unknown[];
    timestamp?: number;
  }>;
  
  // Analytics providers for testing
  gtag?: (...args: unknown[]) => void;
  ga?: (...args: unknown[]) => void;
  analytics?: {
    track?: (...args: unknown[]) => void;
    [key: string]: unknown;
  };
  fbq?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  twq?: (...args: unknown[]) => void;
  hj?: (...args: unknown[]) => void;
  _linkedin_data_partner_ids?: unknown;
  
  // Test flags
  xssTest?: boolean;
}

// Core test user type with password for authentication
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

// Performance metrics type
export type PerformanceMetrics = {
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

// Test user roles for RBAC testing
export type TestUserRole = Database['public']['Enums']['user_role'];

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'discord';