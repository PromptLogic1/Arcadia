import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthUser, UserData } from '@/lib/stores/types';
import { configureAxe } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Configure axe for better testing
export const axe = configureAxe({
  rules: {
    // Disable landmark rules when testing isolated components
    region: { enabled: false },
    // Color contrast doesn't work in JSDOM
    'color-contrast': { enabled: false },
  },
});

// Mock Supabase client type
interface MockSupabaseClient {
  auth: {
    getUser: jest.Mock;
    signInWithPassword: jest.Mock;
    signInWithOAuth: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    updateUser: jest.Mock;
    resetPasswordForEmail: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  from: jest.Mock;
}

// Global mockSupabaseClient is declared in jest.setup.ts

// Mock data factories following the data contracts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: new Date().toISOString(),
  phone: undefined,
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    username: 'testuser',
  },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
  ...overrides,
});

export const createMockAuthUser = (
  overrides?: Partial<AuthUser>
): AuthUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
  phone: null,
  auth_username: 'testuser',
  provider: 'email',
  userRole: 'user',
  ...overrides,
});

export const createMockUserData = (
  overrides?: Partial<UserData>
): UserData => ({
  id: 'test-userdata-id',
  auth_id: 'test-user-id',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  role: 'user',
  experience_points: 0,
  land: null,
  region: null,
  city: null,
  bio: null,
  last_login_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  achievements_visibility: 'public',
  profile_visibility: 'public',
  submissions_visibility: 'public',
  ...overrides,
});

// Authentication state builders for different scenarios
export const mockAuthStates = {
  // User is completely unauthenticated
  unauthenticated: {
    authUser: null,
    userData: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },

  // User is authenticated but data is still loading
  authenticatedLoading: {
    authUser: createMockAuthUser(),
    userData: null,
    isAuthenticated: true,
    loading: true,
    error: null,
  },

  // User is fully authenticated with complete data
  fullyAuthenticated: {
    authUser: createMockAuthUser(),
    userData: createMockUserData(),
    isAuthenticated: true,
    loading: false,
    error: null,
  },

  // Authentication error state
  authError: {
    authUser: null,
    userData: null,
    isAuthenticated: false,
    loading: false,
    error: 'Authentication failed',
  },
};

// Test utilities for mocking Supabase responses
export const mockSupabaseResponse = {
  success: <T>(data: T) => ({ data, error: null }),
  error: (message: string) => ({ data: null, error: { message } }),
  authSuccess: (user: User) => ({
    data: { user, session: { user, access_token: 'test-token' } },
    error: null,
  }),
  authError: (message: string) => ({
    data: { user: null, session: null },
    error: { message },
  }),
};

// Helper to mock auth store with specific state
export const mockAuthStore = (
  state: Partial<typeof mockAuthStates.unauthenticated>
) => {
  const mockStore = {
    ...mockAuthStates.unauthenticated,
    ...state,
    // Mock action functions
    setLoading: jest.fn(),
    setError: jest.fn(),
    setAuthUser: jest.fn(),
    setUserData: jest.fn(),
    clearUser: jest.fn(),
    updateUserData: jest.fn(),
    initializeApp: jest.fn(),
    setupAuthListener: jest.fn(),
    signIn: jest.fn(),
    signInWithOAuth: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshUserData: jest.fn(),
    updateUserDataService: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    resetPassword: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    checkPasswordRequirements: jest.fn(),
  };

  return mockStore;
};

// Authentication flow test scenarios
export const authFlowScenarios = {
  signIn: {
    success: {
      input: { email: 'test@example.com', password: 'password123' },
      expectedCalls: ['signIn', 'initializeApp'],
      expectedResult: { error: undefined },
    },
    invalidCredentials: {
      input: { email: 'test@example.com', password: 'wrong' },
      expectedCalls: ['signIn'],
      expectedResult: { error: new Error('Invalid login credentials') },
    },
    networkError: {
      input: { email: 'test@example.com', password: 'password123' },
      expectedCalls: ['signIn'],
      expectedResult: { error: new Error('Network error') },
    },
  },
  signUp: {
    success: {
      input: {
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      },
      expectedCalls: ['signUp'],
      expectedResult: { needsVerification: true },
    },
    emailExists: {
      input: {
        email: 'exists@example.com',
        password: 'password123',
        username: 'exists',
      },
      expectedCalls: ['signUp'],
      expectedResult: {
        error: new Error('Account with this email already exists'),
      },
    },
  },
  signOut: {
    success: {
      expectedCalls: ['signOut', 'clearUser'],
      expectedResult: { error: undefined },
    },
  },
};

// Password validation test cases
export const passwordTestCases = {
  weak: {
    password: 'weak',
    expected: {
      uppercase: false,
      lowercase: true,
      number: false,
      special: false,
      length: false,
    },
  },
  strong: {
    password: 'StrongPass123!',
    expected: {
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
      length: true,
    },
  },
  noSpecial: {
    password: 'StrongPass123',
    expected: {
      uppercase: true,
      lowercase: true,
      number: true,
      special: false,
      length: true,
    },
  },
};

// Custom render function for testing components that use auth
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: Partial<typeof mockAuthStates.unauthenticated>;
}

export const renderWithAuth = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { authState, ...renderOptions } = options || {};

  // Mock the auth store hooks
  const { useAuth, useAuthActions } = jest.requireActual('@/lib/stores');
  jest.spyOn({ useAuth, useAuthActions }, 'useAuth').mockReturnValue({
    ...mockAuthStates.unauthenticated,
    ...authState,
  });

  jest
    .spyOn({ useAuth, useAuthActions }, 'useAuthActions')
    .mockReturnValue(mockAuthStore(authState || {}));

  return render(ui, renderOptions);
};

// Enhanced render function with user-event and accessibility testing
export const renderWithUserAndA11y = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const user = userEvent.setup();
  const view = renderWithAuth(ui, options);

  return {
    user,
    ...view,
    // Helper for accessibility testing
    checkA11y: async () => {
      const results = await axe(view.container);
      expect(results).toHaveNoViolations();
      return results;
    },
  };
};

// Assertion helpers
export const assertAuthenticationFlow = {
  userIsAuthenticated: (
    authUser: AuthUser | null,
    userData: UserData | null
  ) => {
    expect(authUser).not.toBeNull();
    expect(userData).not.toBeNull();
    expect(authUser?.email).toBeTruthy();
  },

  userIsUnauthenticated: (
    authUser: AuthUser | null,
    userData: UserData | null
  ) => {
    expect(authUser).toBeNull();
    expect(userData).toBeNull();
  },

  loadingState: (loading: boolean, expectedLoading: boolean) => {
    expect(loading).toBe(expectedLoading);
  },

  errorState: (error: string | null, expectedError?: string) => {
    if (expectedError) {
      expect(error).toBe(expectedError);
    } else {
      expect(error).toBeNull();
    }
  },
};

// Setup helpers for integration tests
export const setupIntegrationTest = {
  // Setup mock Supabase client for successful authentication
  mockSuccessfulAuth: () => {
    const mockClient = globalThis.mockSupabaseClient;
    mockClient.auth.getUser.mockResolvedValue(
      mockSupabaseResponse.authSuccess(createMockUser())
    );
    mockClient.auth.signInWithPassword.mockResolvedValue(
      mockSupabaseResponse.success({ user: createMockUser(), session: null })
    );
    mockClient
      .from()
      .select()
      .eq()
      .single.mockResolvedValue(
        mockSupabaseResponse.success(createMockUserData())
      );
  },

  // Setup mock Supabase client for failed authentication
  mockFailedAuth: (errorMessage = 'Authentication failed') => {
    const mockClient = globalThis.mockSupabaseClient;
    mockClient.auth.getUser.mockResolvedValue(
      mockSupabaseResponse.authError(errorMessage)
    );
    mockClient.auth.signInWithPassword.mockResolvedValue(
      mockSupabaseResponse.error(errorMessage)
    );
  },

  // Reset all mocks between tests
  resetMocks: () => {
    jest.clearAllMocks();
    globalThis.mockSupabaseClient.auth.getUser.mockResolvedValue(
      mockSupabaseResponse.authError('User not authenticated')
    );
  },
};
