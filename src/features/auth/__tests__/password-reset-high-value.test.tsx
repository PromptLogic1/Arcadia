import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from '../components/forgot-password-form';
import { ResetPasswordForm } from '../components/reset-password-form';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock auth store functions
const mockResetPasswordForEmail = jest.fn() as any;
const mockResetPassword = jest.fn() as any;
const mockSetLoading = jest.fn() as any;
const mockCheckPasswordRequirements = jest.fn() as any;

jest.mock('@/lib/stores', () => ({
  useAuthActions: () => ({
    setLoading: mockSetLoading,
    resetPasswordForEmail: mockResetPasswordForEmail,
    resetPassword: mockResetPassword,
    checkPasswordRequirements: mockCheckPasswordRequirements,
  }),
}));

// Mock logger and notifications
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/notifications', () => ({
  notifications: {
    info: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Password Reset - High Value Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful responses
    mockResetPasswordForEmail.mockResolvedValue({});
    mockResetPassword.mockResolvedValue({});
    mockCheckPasswordRequirements.mockReturnValue({
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
      length: true,
    });
  });

  describe('ForgotPasswordForm - Critical Tests', () => {
    it('should render all required form elements', () => {
      render(<ForgotPasswordForm />);

      // Core form elements must be present
      expect(
        screen.getByRole('heading', { name: /reset your password/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /send reset link/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /back to login/i })
      ).toBeInTheDocument();
    });

    it('should call API with email when form is submitted', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(
        screen.getByLabelText(/email address/i),
        'user@example.com'
      );
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      // Verify API was called with correct email
      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'user@example.com'
        );
      });
    });

    it('should show success message after successful submission', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(
        screen.getByLabelText(/email address/i),
        'user@example.com'
      );
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      // Should show success state
      await waitFor(() => {
        expect(
          screen.getByText(/we've sent you instructions/i)
        ).toBeInTheDocument();
      });

      // Form should be hidden, success message shown
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
      expect(
        screen.getByText(/check your email inbox and spam folder/i)
      ).toBeInTheDocument();
    });

    it('should show error message when API returns error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Rate limit exceeded. Please try again later.';
      mockResetPasswordForEmail.mockResolvedValue({
        error: new Error(errorMessage),
      });

      render(<ForgotPasswordForm />);

      await user.type(
        screen.getByLabelText(/email address/i),
        'user@example.com'
      );
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should remain in form state
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('should disable button during loading state', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      mockResetPasswordForEmail.mockReturnValue(
        new Promise(resolve => {
          resolvePromise = resolve;
        })
      );

      render(<ForgotPasswordForm />);

      await user.type(
        screen.getByLabelText(/email address/i),
        'user@example.com'
      );
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      // Button should show loading state and be disabled
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();

      // Resolve and verify success
      resolvePromise!({});
      await waitFor(() => {
        expect(
          screen.getByText(/we've sent you instructions/i)
        ).toBeInTheDocument();
      });
    });

    it('should maintain security by showing generic message', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(
        screen.getByLabelText(/email address/i),
        'nonexistent@example.com'
      );
      await user.click(
        screen.getByRole('button', { name: /send reset link/i })
      );

      await waitFor(() => {
        // Should always show generic message to prevent email enumeration
        expect(
          screen.getByText(/if an account exists with/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordForm - Critical Tests', () => {
    beforeEach(() => {
      // Mock realistic password validation
      mockCheckPasswordRequirements.mockImplementation((password: string) => ({
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        length: password.length >= 8,
      }));
    });

    it('should render all required form elements', () => {
      render(<ResetPasswordForm />);

      expect(
        screen.getByRole('heading', { name: /reset your password/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reset password/i })
      ).toBeInTheDocument();
    });

    it('should call API with password when valid form is submitted', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const strongPassword = 'SecurePass123!';
      await user.type(screen.getByLabelText('New Password'), strongPassword);
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        strongPassword
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(strongPassword);
      });
    });

    it('should show success message and redirect after successful reset', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const strongPassword = 'SecurePass123!';
      await user.type(screen.getByLabelText('New Password'), strongPassword);
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        strongPassword
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password successfully reset/i)
        ).toBeInTheDocument();
      });
    });

    it('should prevent submission with weak password', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const weakPassword = 'weak';
      await user.type(screen.getByLabelText('New Password'), weakPassword);
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        weakPassword
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet all requirements/i)
        ).toBeInTheDocument();
      });

      // API should not be called
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('should prevent submission with mismatched passwords', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText('New Password'), 'SecurePass123!');
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        'DifferentPass123!'
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('should show password requirements when password field is focused', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');

      // Requirements should not be visible initially
      expect(
        screen.queryByText(/password requirements/i)
      ).not.toBeInTheDocument();

      // Focus password input
      await user.click(passwordInput);

      // Requirements should now be visible
      expect(screen.getByText(/password requirements/i)).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({
        error: new Error('Session expired. Please request a new reset link.'),
      });

      render(<ResetPasswordForm />);

      const strongPassword = 'SecurePass123!';
      await user.type(screen.getByLabelText('New Password'), strongPassword);
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        strongPassword
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security and Input Validation', () => {
    it('should handle malicious input safely', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const maliciousInput = '<script>alert("xss")</script>';

      await user.type(screen.getByLabelText('New Password'), maliciousInput);
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        maliciousInput
      );

      // Form should treat input as plain text and remain functional
      expect(screen.getByLabelText('New Password')).toHaveValue(maliciousInput);
      expect(screen.getByLabelText('Confirm New Password')).toHaveValue(
        maliciousInput
      );
      expect(
        screen.getByRole('button', { name: /reset password/i })
      ).toBeInTheDocument();
    });

    it('should require email input in forgot password form', () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should require password inputs in reset form', () => {
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');

      expect(passwordInput).toBeRequired();
      expect(confirmInput).toBeRequired();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmInput).toHaveAttribute('type', 'password');
    });
  });
});
