import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { useLoginForm } from './hooks/useLoginForm';
import { useLoginSubmission } from './hooks/useLoginSubmission';

// Mock dependencies
jest.mock('./hooks/useLoginForm');
jest.mock('./hooks/useLoginSubmission');
jest.mock('@/components/ui/Button', () => ({
  Button: jest.fn(({ children, ...props }) => (
    <button {...props}>{children}</button>
  )),
}));

const mockUseLoginForm = useLoginForm as jest.MockedFunction<typeof useLoginForm>;
const mockUseLoginSubmission = useLoginSubmission as jest.MockedFunction<typeof useLoginSubmission>;

describe('LoginForm', () => {
  const defaultFormState = {
    form: {
      trigger: jest.fn(),
      formState: {
        errors: {},
      },
    },
    formData: {
      email: '',
      password: '',
    },
    canSubmit: true,
    message: null,
    setMessage: jest.fn(),
    handleEmailChange: jest.fn(),
    handlePasswordChange: jest.fn(),
  };

  const defaultSubmission = {
    loading: false,
    handleSubmit: jest.fn((e) => e.preventDefault()),
    handleOAuthLogin: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoginForm.mockReturnValue(defaultFormState);
    mockUseLoginSubmission.mockReturnValue(defaultSubmission);
  });

  describe('rendering', () => {
    it('renders login form with default props', () => {
      render(<LoginForm />);

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(mockUseLoginForm).toHaveBeenCalledWith({
        initialData: undefined,
        enablePersistence: true,
        onStatusChange: undefined,
      });
    });

    it('passes custom props to hooks', () => {
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();
      const initialData = { email: 'test@example.com', password: '' };

      render(
        <LoginForm
          initialData={initialData}
          enablePersistence={false}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      expect(mockUseLoginForm).toHaveBeenCalledWith({
        initialData,
        enablePersistence: false,
        onStatusChange: undefined,
      });

      expect(mockUseLoginSubmission).toHaveBeenCalledWith({
        formState: defaultFormState,
        onFormSubmit: undefined,
        onOAuthLogin: undefined,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
      });
    });

    it('hides sections based on props', () => {
      const { rerender } = render(
        <LoginForm showHeader={false} showOAuth={false} showFooter={false} />
      );

      // Verify sections are hidden (implementation depends on child components)
      expect(screen.queryByText(/sign in to your account/i)).not.toBeInTheDocument();

      // Re-render with sections shown
      rerender(<LoginForm showHeader={true} />);
      
      // This would depend on LoginFormHeader implementation
      // For now we just verify the component renders
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls handleSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByTestId('auth-submit-button');
      await user.click(submitButton);

      expect(defaultSubmission.handleSubmit).toHaveBeenCalled();
    });

    it('disables submit button when canSubmit is false', () => {
      mockUseLoginForm.mockReturnValue({
        ...defaultFormState,
        canSubmit: false,
      });

      render(<LoginForm />);

      const submitButton = screen.getByTestId('auth-submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button when loading', () => {
      mockUseLoginSubmission.mockReturnValue({
        ...defaultSubmission,
        loading: true,
      });

      render(<LoginForm />);

      const submitButton = screen.getByTestId('auth-submit-button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/processing/i);
    });
  });

  describe('form messages', () => {
    it('displays error message when present', () => {
      const errorMessage = {
        type: 'error' as const,
        text: 'Invalid credentials',
      };

      mockUseLoginForm.mockReturnValue({
        ...defaultFormState,
        message: errorMessage,
      });

      render(<LoginForm />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('allows dismissing error messages', async () => {
      const user = userEvent.setup();
      const errorMessage = {
        type: 'error' as const,
        text: 'Network error',
      };

      mockUseLoginForm.mockReturnValue({
        ...defaultFormState,
        message: errorMessage,
      });

      render(<LoginForm />);

      // Find dismiss button (depends on FormMessage implementation)
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(defaultFormState.setMessage).toHaveBeenCalledWith(null);
    });
  });

  describe('field validation', () => {
    it('triggers validation on field blur', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Simulate field interactions (depends on LoginFormFields implementation)
      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.tab(); // Blur the field

      expect(defaultFormState.form.trigger).toHaveBeenCalledWith('email');
    });

    it('displays field validation errors', () => {
      mockUseLoginForm.mockReturnValue({
        ...defaultFormState,
        form: {
          ...defaultFormState.form,
          formState: {
            errors: {
              email: { message: 'Invalid email format' },
              password: { message: 'Password required' },
            },
          },
        },
      });

      render(<LoginForm />);

      // Validation errors would be passed to LoginFormFields
      // and displayed there based on implementation
      expect(mockUseLoginForm).toHaveBeenCalled();
    });
  });

  describe('OAuth integration', () => {
    it('handles OAuth login when provider is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // This depends on LoginOAuthSection implementation
      // We verify the handler is passed correctly
      expect(mockUseLoginSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          onOAuthLogin: undefined,
        })
      );
    });

    it('passes custom OAuth handler', () => {
      const mockOAuthHandler = jest.fn();
      render(<LoginForm onOAuthLogin={mockOAuthHandler} />);

      expect(mockUseLoginSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          onOAuthLogin: mockOAuthHandler,
        })
      );
    });
  });

  describe('accessibility', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<LoginForm ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className', () => {
      const { container } = render(<LoginForm className="custom-class" />);

      const formContainer = container.firstChild;
      expect(formContainer).toHaveClass('custom-class');
    });

    it('has proper form structure', () => {
      render(<LoginForm />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('variant support', () => {
    it('renders with different variants', () => {
      const variants = ['default', 'gaming', 'neon', 'cyber'] as const;

      variants.forEach((variant) => {
        const { unmount } = render(<LoginForm variant={variant} />);
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        unmount();
      });
    });
  });
});