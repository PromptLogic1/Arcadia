/**
 * Global test types for all test suites
 * Aligned with actual project implementation
 */

import type { Database, Tables } from '../../types/database.types';

// Window extension for test utilities (consistent across all tests)
export interface TestWindow {
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

// Create a properly typed window interface that extends the global Window
export type ExtendedTestWindow = Window & TestWindow;

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

// Additional E2E test types for proper exports
export interface TestError extends Error {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  metadata?: Record<string, unknown>;
  errorBoundaryData?: {
    componentStack?: string;
    errorBoundary?: string;
    eventId?: string;
    errorInfo?: Record<string, unknown>;
  };
}

export interface MockSupabaseClient {
  realtime?: SupabaseRealtimeClient;
  auth?: {
    getSession: () => Promise<{ data: { session: unknown } }>;
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => { unsubscribe: () => void };
  };
  from: (table: string) => unknown;
}

export interface SupabaseRealtimeChannel {
  on: (event: string, callback: (payload: unknown) => void) => SupabaseRealtimeChannel;
  subscribe: (callback?: (status: string, err?: Error) => void) => SupabaseRealtimeChannel;
  unsubscribe: () => SupabaseRealtimeChannel;
  send: (message: unknown) => void;
}

export interface SupabaseRealtimeClient {
  channel: (name: string) => SupabaseRealtimeChannel;
}

export type MockRealtimeChannel = SupabaseRealtimeChannel;

export interface MockWebSocket extends WebSocket {
  mockClose?: () => void;
  mockError?: (error: Error) => void;
  mockMessage?: (data: unknown) => void;
}

export interface SentryScope {
  setTag: (key: string, value: string) => void;
  setContext: (key: string, context: Record<string, unknown>) => void;
  setUser: (user: Record<string, unknown> | null) => void;
}

export type EventCallback = (event: unknown) => void;

export interface RouteHandler {
  (route: import('@playwright/test').Route, request: import('@playwright/test').Request): Promise<void> | void;
}

export interface RealtimeEvent {
  type: string;
  channel?: string;
  message?: unknown;
  timestamp: number;
  eventType?: string;
  table?: string;
  schema?: string;
  new?: unknown;
  old?: unknown;
  commit_timestamp?: string;
}

export type StatusCallback = (status: string, error?: Error) => void;
export type RouteCallback = (route: import('@playwright/test').Route) => Promise<void> | void;
export type AnyFunction = (...args: unknown[]) => unknown;
export type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

export interface PageEvaluateOptions<T = unknown> {
  (arg?: T): unknown;
}

export interface MockWebSocketClass extends WebSocket {
  new (url: string, protocols?: string | string[]): WebSocket;
}

export interface PerformanceObserverCallback {
  (list: PerformanceObserverEntryList, observer: PerformanceObserver): void;
}