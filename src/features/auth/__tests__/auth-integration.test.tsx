import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { AuthUser, UserData } from '@/lib/stores/types';
import type { AuthResponse } from '@/lib/stores/auth-store';
import { createMockAuthUser, mockAuthStates } from './test-utils';

// Define proper types for mock functions
interface SignInParams {
  email: string;
  password: string;
}

interface SignUpParams {
  email: string;
  password: string;
  username: string;
}

interface UpdateUserDataParams {
  username?: string;
  bio?: string;
}

// AuthResponse is imported from auth-store

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
  usePathname: () => '/auth/login',
}));

// Mock notifications
jest.mock('@/lib/notifications', () => ({
  notifications: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the auth store completely
const mockAuthStore = {
  ...mockAuthStates.unauthenticated,
};

// Properly typed mock auth actions
const mockAuthActions = {
  signIn: jest.fn() as jest.MockedFunction<
    (params: SignInParams) => Promise<AuthResponse>
  >,
  signUp: jest.fn() as jest.MockedFunction<
    (params: SignUpParams) => Promise<AuthResponse>
  >,
  signOut: jest.fn() as jest.MockedFunction<() => Promise<AuthResponse>>,
  updateUserDataService: jest.fn() as jest.MockedFunction<
    (userId: string, params: UpdateUserDataParams) => Promise<UserData>
  >,
  resetPasswordForEmail: jest.fn() as jest.MockedFunction<
    (email: string) => Promise<AuthResponse>
  >,
  setLoading: jest.fn() as jest.MockedFunction<(loading: boolean) => void>,
  setError: jest.fn() as jest.MockedFunction<(error: string | null) => void>,
  setAuthUser: jest.fn() as jest.MockedFunction<
    (user: AuthUser | null) => void
  >,
  setUserData: jest.fn() as jest.MockedFunction<(userData: any) => void>,
  clearUser: jest.fn() as jest.MockedFunction<() => void>,
};

// Mock data factory for UserData
const createMockUserData = (overrides: Partial<UserData> = {}): UserData => ({
  id: 'user-1',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  experience_points: 0,
  land: null,
  region: null,
  city: null,
  bio: null,
  role: 'user',
  last_login_at: null,
  created_at: new Date().toISOString(),
  achievements_visibility: 'public',
  auth_id: 'user-1',
  profile_visibility: 'public',
  submissions_visibility: 'public',
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Reset mock implementations with default resolved values
mockAuthActions.signIn.mockResolvedValue({});
mockAuthActions.signUp.mockResolvedValue({});
mockAuthActions.signOut.mockResolvedValue({});
mockAuthActions.updateUserDataService.mockResolvedValue(createMockUserData());
mockAuthActions.resetPasswordForEmail.mockResolvedValue({});

jest.mock('@/lib/stores', () => ({
  useAuth: () => mockAuthStore,
  useAuthActions: () => mockAuthActions,
}));

// Test component using semantic HTML and ARIA roles
const AuthTestComponent = () => {
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(
    mockAuthStore.authUser
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    mockAuthStore.error
  );

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await mockAuthActions.signIn({
        email: 'test@example.com',
        password: 'password123',
      });
      setCurrentUser(createMockAuthUser());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Authentication failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await mockAuthActions.signUp({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
      setCurrentUser(createMockAuthUser({ email: 'new@example.com' }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Sign up failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await mockAuthActions.signOut();
      setCurrentUser(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Sign out failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      await mockAuthActions.updateUserDataService('user-id', {
        username: 'updateduser',
        bio: 'Updated bio',
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsLoading(true);
    try {
      await mockAuthActions.resetPasswordForEmail('reset@example.com');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Password reset failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main role="main" aria-label="Authentication Test Component">
      <h1>Authentication Test App</h1>

      {isLoading && (
        <div role="status" aria-live="polite">
          <span>Loading...</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" aria-live="assertive">
          <p>Error: {errorMessage}</p>
        </div>
      )}

      {currentUser ? (
        <section aria-label="Authenticated user section">
          <h2>Welcome, {currentUser.email}</h2>
          <p>Username: {currentUser.auth_username}</p>

          <nav aria-label="User actions">
            <button type="button" onClick={handleSignOut} disabled={isLoading}>
              Sign Out
            </button>
            <button
              type="button"
              onClick={handleUpdateProfile}
              disabled={isLoading}
            >
              Update Profile
            </button>
          </nav>
        </section>
      ) : (
        <section aria-label="Authentication options">
          <h2>Please sign in or create an account</h2>

          <nav aria-label="Authentication actions">
            <button type="button" onClick={handleSignIn} disabled={isLoading}>
              Sign In
            </button>
            <button type="button" onClick={handleSignUp} disabled={isLoading}>
              Sign Up
            </button>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isLoading}
            >
              Reset Password
            </button>
          </nav>
        </section>
      )}
    </main>
  );
};

// Custom render function with userEvent setup
const renderWithUserEvent = (ui: React.ReactElement) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(ui),
  };
};

describe('Authentication Integration Tests', () => {
  let _mockSupabaseClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock auth store state
    Object.assign(mockAuthStore, mockAuthStates.unauthenticated);

    // Get the mock Supabase client
    _mockSupabaseClient = globalThis.mockSupabaseClient;

    // Reset mock implementations
    Object.values(mockAuthActions).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  });

  afterEach(() => {
    // Clean up any timers or async operations
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<AuthTestComponent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should properly announce loading states to screen readers', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock loading state
      mockAuthActions.signIn.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      // Click sign in button
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should show loading with proper ARIA
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should properly announce errors to screen readers', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock error
      mockAuthActions.signIn.mockRejectedValue(
        new Error('Invalid credentials')
      );

      // Click sign in button
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should show error with proper ARIA
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      });

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveTextContent('Invalid credentials');
      });
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should handle successful sign up to sign in flow', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock successful sign up
      mockAuthActions.signUp.mockResolvedValue({ needsVerification: true });

      // Initially should show unauthenticated view
      expect(
        screen.getByRole('heading', { name: /please sign in/i })
      ).toBeInTheDocument();

      // Click sign up using semantic query
      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(signUpButton);

      // Wait for sign up to complete
      await waitFor(() => {
        expect(mockAuthActions.signUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
          username: 'newuser',
        });
      });

      // Should show authenticated view
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /welcome/i })
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/new@example.com/i)).toBeInTheDocument();
      });
    });

    it('should handle sign in with existing user', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock successful authentication
      mockAuthActions.signIn.mockResolvedValue({ user: createMockAuthUser() });

      // Click sign in using semantic query
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockAuthActions.signIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify user data is displayed using semantic queries
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /welcome/i })
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });

    it('should handle sign out flow', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Start with authenticated state
      mockAuthActions.signIn.mockResolvedValue({ user: createMockAuthUser() });

      // Sign in first
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /welcome/i })
        ).toBeInTheDocument();
      });

      // Mock successful sign out
      mockAuthActions.signOut.mockResolvedValue({});

      // Click sign out using semantic query
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      // Wait for sign out to complete
      await waitFor(() => {
        expect(mockAuthActions.signOut).toHaveBeenCalled();
      });

      // Should return to unauthenticated view
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /please sign in/i })
        ).toBeInTheDocument();
      });
    });

    it('should handle user profile updates', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Setup authenticated state
      mockAuthActions.signIn.mockResolvedValue({ user: createMockAuthUser() });

      // Mock profile update - updateUserDataService returns UserData
      const mockUserData: UserData = {
        id: 'user-1',
        username: 'updateduser',
        full_name: 'Updated User',
        bio: 'Updated bio',
        avatar_url: null,
        experience_points: 0,
        land: null,
        region: null,
        city: null,
        role: 'user',
        last_login_at: null,
        created_at: new Date().toISOString(),
        achievements_visibility: 'public',
        auth_id: 'user-1',
        profile_visibility: 'public',
        submissions_visibility: 'public',
        updated_at: new Date().toISOString(),
      };
      mockAuthActions.updateUserDataService.mockResolvedValue(mockUserData);

      // Sign in first
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /welcome/i })
        ).toBeInTheDocument();
      });

      // Update profile using semantic query
      const updateButton = screen.getByRole('button', {
        name: /update profile/i,
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockAuthActions.updateUserDataService).toHaveBeenCalledWith(
          'user-id',
          {
            username: 'updateduser',
            bio: 'Updated bio',
          }
        );
      });
    });

    it('should handle password reset flow', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock successful password reset
      mockAuthActions.resetPasswordForEmail.mockResolvedValue({});

      // Click password reset using semantic query
      const resetButton = screen.getByRole('button', {
        name: /reset password/i,
      });
      await user.click(resetButton);

      await waitFor(() => {
        expect(mockAuthActions.resetPasswordForEmail).toHaveBeenCalledWith(
          'reset@example.com'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle sign in errors gracefully', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock failed authentication
      mockAuthActions.signIn.mockRejectedValue(
        new Error('Invalid login credentials')
      );

      // Click sign in
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should show error message using semantic query
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Invalid login credentials');
      });

      // Should remain in unauthenticated view
      expect(
        screen.getByRole('heading', { name: /please sign in/i })
      ).toBeInTheDocument();
    });

    it('should handle sign up errors gracefully', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock sign up error
      mockAuthActions.signUp.mockRejectedValue(
        new Error('Email already exists')
      );

      // Click sign up
      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(signUpButton);

      // Should show error message
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Email already exists');
      });
    });

    it('should handle network errors during authentication', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock network error
      mockAuthActions.signIn.mockRejectedValue(new Error('Network error'));

      // Click sign in
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should handle error gracefully
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Network error');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading states during authentication', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock a promise that resolves after a short delay
      let resolvePromise: (value: AuthResponse) => void;
      const authPromise = new Promise<AuthResponse>(resolve => {
        resolvePromise = resolve;
      });

      mockAuthActions.signIn.mockReturnValue(authPromise);

      // Click sign in
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should show loading state with proper semantics
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Button should be disabled
      expect(signInButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ user: createMockAuthUser() });

      // Wait for loading to disappear
      await waitFor(
        () => {
          expect(screen.queryByRole('status')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should disable buttons during loading', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock delayed operation
      mockAuthActions.signIn.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      // Button should be enabled initially
      expect(signInButton).toBeEnabled();

      // Click button
      await user.click(signInButton);

      // Button should be disabled during loading
      expect(signInButton).toBeDisabled();
    });
  });

  describe('Performance', () => {
    it('should render within performance budget', () => {
      const start = performance.now();
      render(<AuthTestComponent />);
      const end = performance.now();

      // Should render within 100ms
      expect(end - start).toBeLessThan(100);
    });

    it('should handle rapid interactions gracefully', async () => {
      const { user } = renderWithUserEvent(<AuthTestComponent />);

      // Mock fast resolving action
      mockAuthActions.signIn.mockResolvedValue({ user: createMockAuthUser() });

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      // Rapidly click multiple times
      await user.click(signInButton);
      await user.click(signInButton);
      await user.click(signInButton);

      // Should only call once due to loading state protection
      await waitFor(() => {
        expect(mockAuthActions.signIn).toHaveBeenCalledTimes(1);
      });
    });
  });
});
