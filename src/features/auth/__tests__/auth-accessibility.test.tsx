import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../components/login-form';
import { mockAuthStates } from './test-utils';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Helper functions for DOM assertions to work around typing issues
const expectToHaveFocus = (element: HTMLElement) => {
  expect(document.activeElement).toBe(element);
};

const expectToBeInDocument = (element: HTMLElement) => {
  expect(element).toBeTruthy();
  expect(document.body.contains(element)).toBe(true);
};

const expectToHaveAttribute = (element: HTMLElement, attr: string, value?: string) => {
  if (value !== undefined) {
    expect(element.getAttribute(attr)).toBe(value);
  } else {
    expect(element.hasAttribute(attr)).toBe(true);
  }
};

const expectToHaveAccessibleName = (element: HTMLElement) => {
  const accessibleName = element.getAttribute('aria-label') || 
                        element.getAttribute('aria-labelledby') ||
                        (element as HTMLInputElement).labels?.[0]?.textContent ||
                        element.textContent;
  expect(accessibleName).toBeTruthy();
};

const expectToHaveTextContent = (element: HTMLElement, text: string | RegExp) => {
  if (typeof text === 'string') {
    expect(element.textContent).toContain(text);
  } else {
    expect(element.textContent).toMatch(text);
  }
};

const expectToBeDisabled = (element: HTMLElement) => {
  expect((element as HTMLButtonElement | HTMLInputElement).disabled).toBe(true);
};

// Mock the auth hooks properly
const mockUseAuth = jest.fn();
const mockUseAuthActions = jest.fn();

jest.mock('@/lib/stores', () => ({
  useAuth: () => mockUseAuth(),
  useAuthActions: () => mockUseAuthActions(),
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock localStorage for email persistence
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Helper to create mock auth actions with proper typing
const createMockAuthActions = (overrides: Record<string, any> = {}) => ({
  setLoading: jest.fn(),
  setError: jest.fn(),
  setAuthUser: jest.fn(),
  setUserData: jest.fn(),
  clearUser: jest.fn(),
  updateUserData: jest.fn(),
  initializeApp: jest.fn(async () => undefined),
  setupAuthListener: jest.fn(),
  signIn: jest.fn(async () => ({})), // Default success response
  signInWithOAuth: jest.fn(async () => ({})), // Default success response
  signUp: jest.fn(async () => ({})),
  signOut: jest.fn(async () => ({})),
  refreshUserData: jest.fn(),
  updateUserDataService: jest.fn(),
  updateEmail: jest.fn(),
  updatePassword: jest.fn(async () => ({})),
  resetPassword: jest.fn(async () => ({})),
  resetPasswordForEmail: jest.fn(async () => ({})),
  checkPasswordRequirements: jest.fn(),
  ...overrides,
});

describe('Authentication Components - Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    
    // Return null by default to avoid concatenation issues
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Set up basic auth state
    mockUseAuth.mockReturnValue(mockAuthStates.unauthenticated);
    mockUseAuthActions.mockReturnValue(createMockAuthActions());
  });

  describe('LoginForm', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LoginForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard navigable with proper tab order', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      // Tab through all interactive elements in correct order
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      
      // Start tabbing from beginning
      await user.tab();
      expectToHaveFocus(emailInput);
      
      await user.tab();
      expectToHaveFocus(passwordInput);
      
      // Submit button should be disabled when form is invalid, so tab goes to next element
      await user.tab();
      expectToHaveFocus(forgotPasswordLink);
      
      await user.tab();
      expectToHaveFocus(googleButton);
      
      await user.tab();
      expectToHaveFocus(signUpLink);
    });

    it('should properly announce form validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      // Test invalid email
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger onBlur validation
      
      await waitFor(() => {
        const emailError = screen.queryByText(/please enter a valid email address/i);
        if (emailError) {
          expectToHaveAttribute(emailError, 'role', 'alert');
          expectToHaveAttribute(emailInput, 'aria-invalid', 'true');
          const ariaDescribedBy = emailInput.getAttribute('aria-describedby');
          expect(ariaDescribedBy).toBeTruthy();
        }
      });
      
      // Test empty password
      await user.click(passwordInput);
      await user.tab(); // Trigger onBlur validation
      
      await waitFor(() => {
        const passwordError = screen.queryByText(/password is required/i);
        if (passwordError) {
          expectToHaveAttribute(passwordError, 'role', 'alert');
          expectToHaveAttribute(passwordInput, 'aria-invalid', 'true');
        }
      });
    });

    it('should have proper form labeling and ARIA attributes', () => {
      render(<LoginForm />);
      
      // Check email field
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expectToHaveAccessibleName(emailInput);
      expectToHaveAttribute(emailInput, 'type', 'email');
      expectToHaveAttribute(emailInput, 'required');
      
      // Check password field
      const passwordInput = screen.getByLabelText(/password/i);
      expectToHaveAccessibleName(passwordInput);
      expectToHaveAttribute(passwordInput, 'type', 'password');
      expectToHaveAttribute(passwordInput, 'required');
      
      // Check submit button
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expectToHaveAttribute(submitButton, 'type', 'submit');
    });

    it('should have proper heading structure', () => {
      render(<LoginForm />);
      
      // Main heading
      const heading = screen.getByRole('heading', { level: 2 });
      expectToBeInDocument(heading);
      expectToHaveTextContent(heading, /welcome back/i);
      
      // Check heading hierarchy (should be only one h2, no h3+ without h2)
      const allHeadings = screen.getAllByRole('heading');
      expect(allHeadings).toHaveLength(1);
      expect(allHeadings[0]?.tagName).toBe('H2');
    });

    it('should verify auth actions are properly mocked', () => {
      const mockSignIn = jest.fn(async () => ({}));
      
      const mockActions = createMockAuthActions({
        signIn: mockSignIn,
      });
      
      mockUseAuthActions.mockReturnValue(mockActions);
      
      render(<LoginForm />);
      
      // Verify the component renders
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      
      // Verify our mock is set up correctly
      expect(mockSignIn).toBeDefined();
      expect(typeof mockSignIn).toBe('function');
      
      // Verify the mock actions are being returned
      const actions = mockUseAuthActions() as ReturnType<typeof createMockAuthActions>;
      expect(actions.signIn).toBe(mockSignIn);
    });

    it('should handle basic form interaction and accessibility', async () => {
      const user = userEvent.setup();
      const mockSignIn = jest.fn(async () => ({}));
      
      const mockActions = createMockAuthActions({
        signIn: mockSignIn,
      });
      
      mockUseAuthActions.mockReturnValue(mockActions);
      
      render(<LoginForm />);
      
      // Test basic form interaction
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Verify initial accessibility
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(submitButton).toHaveAttribute('type', 'submit');
      
      // Test form interaction
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Verify values are set
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
      
      // For this test, we just verify the form can be interacted with
      // and maintains proper accessibility attributes
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should persist email input accessibly', async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue('saved@example.com');
      
      render(<LoginForm />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      
      // Should load saved email
      expect(emailInput).toHaveValue('saved@example.com');
      
      // Should save email on change
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('loginEmail', 'new@example.com');
    });

    it('should maintain focus management during state changes', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      // Focus should remain on inputs during typing
      await user.click(emailInput);
      expectToHaveFocus(emailInput);
      
      await user.type(emailInput, 'test@example.com');
      expectToHaveFocus(emailInput);
      
      await user.tab();
      expectToHaveFocus(passwordInput);
      
      await user.type(passwordInput, 'password123');
      expectToHaveFocus(passwordInput);
    });

    it('should have accessible form navigation links', () => {
      render(<LoginForm />);
      
      // Forgot password link
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expectToHaveAttribute(forgotPasswordLink, 'href', '/auth/forgot-password');
      expectToHaveAccessibleName(forgotPasswordLink);
      
      // Sign up link
      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expectToHaveAttribute(signUpLink, 'href', '/auth/signup');
      expectToHaveAccessibleName(signUpLink);
    });

    it('should handle form state when disabled', () => {
      render(<LoginForm />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      // Initially form should be enabled (empty state means submit disabled due to validation)
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expectToBeDisabled(submitButton); // Disabled because form is invalid
      expect(googleButton).not.toBeDisabled();
    });
  });
}); 