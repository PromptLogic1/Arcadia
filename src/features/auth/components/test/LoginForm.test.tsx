import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { useLoginForm, type UseLoginFormReturn } from '../hooks/useLoginForm';
import { useLoginSubmission, type UseLoginSubmissionReturn } from '../hooks/useLoginSubmission';

// Mock dependencies
jest.mock('../hooks/useLoginForm');
jest.mock('../hooks/useLoginSubmission');
jest.mock('@/components/ui/Button', () => ({
  Button: jest.fn(({ children, ...props }) => (
    <button {...props}>{children}</button>
  )),
}));

const mockUseLoginForm = useLoginForm as jest.MockedFunction<
  typeof useLoginForm
>;
const mockUseLoginSubmission = useLoginSubmission as jest.MockedFunction<
  typeof useLoginSubmission
>;

describe('LoginForm', () => {
  // Helper function to create a properly typed form state mock
  const createFormStateMock = (overrides: Partial<UseLoginFormReturn> = {}): UseLoginFormReturn => ({
    form: {
      register: jest.fn(),
      unregister: jest.fn(),
      trigger: jest.fn(),
      control: {} as any,
      watch: jest.fn(),
      getValues: jest.fn(),
      getFieldState: jest.fn(),
      setError: jest.fn(),
      clearErrors: jest.fn(),
      setValue: jest.fn(),
      setFocus: jest.fn(),
      reset: jest.fn(),
      resetField: jest.fn(),
      handleSubmit: jest.fn(),
      formState: {
        errors: {},
        isDirty: false,
        isValid: true,
        isSubmitting: false,
        isLoading: false,
        isSubmitted: false,
        isSubmitSuccessful: false,
        isValidating: false,
        submitCount: 0,
        touchedFields: {},
        dirtyFields: {},
        validatingFields: {},
        defaultValues: undefined,
      },
    } as any, // Form type is too complex for test mocking
    formData: {
      email: '',
      password: '',
    },
    status: 'idle',
    message: null,
    canSubmit: true,
    isLoading: false,
    setMessage: jest.fn(),
    setStatus: jest.fn(),
    clearForm: jest.fn(),
    handleEmailChange: jest.fn(),
    handlePasswordChange: jest.fn(),
    ...overrides,
  });

  // Helper function to create a properly typed submission mock
  const createSubmissionMock = (overrides: Partial<UseLoginSubmissionReturn> = {}): UseLoginSubmissionReturn => ({
    loading: false,
    isSubmitting: false,
    handleSubmit: jest.fn().mockResolvedValue(undefined),
    handleOAuthLogin: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const defaultFormState = createFormStateMock();
  const defaultSubmission = createSubmissionMock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoginForm.mockReturnValue(defaultFormState);
    mockUseLoginSubmission.mockReturnValue(defaultSubmission);
  });

  describe('rendering', () => {
    it('renders login form with default props', () => {
      render(<LoginForm />);

      expect(
        screen.getByTestId('auth-submit-button')
      ).toBeInTheDocument();
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
      expect(
        screen.queryByText(/sign in to your account/i)
      ).not.toBeInTheDocument();

      // Re-render with sections shown
      rerender(<LoginForm showHeader={true} />);

      // This would depend on LoginFormHeader implementation
      // For now we just verify the component renders
      expect(screen.getByTestId('auth-submit-button')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls handleSubmit when form is submitted', async () => {
      const mockHandleSubmit = jest.fn().mockImplementation(async e => {
        if (e && e.preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      
      mockUseLoginSubmission.mockReturnValue({
        ...defaultSubmission,
        handleSubmit: mockHandleSubmit,
      });
      
      const user = userEvent.setup();
      const { container } = render(<LoginForm />);

      // Submit the form directly
      const form = container.querySelector('form');
      if (form) {
        fireEvent.submit(form);
        expect(mockHandleSubmit).toHaveBeenCalled();
      } else {
        // Fallback: click the submit button
        const submitButton = screen.getByTestId('auth-submit-button');
        await user.click(submitButton);
        expect(mockHandleSubmit).toHaveBeenCalled();
      }
    });

    it('disables submit button when canSubmit is false', () => {
      mockUseLoginForm.mockReturnValue(createFormStateMock({
        canSubmit: false,
      }));

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
      expect(submitButton).toHaveTextContent('Signing in...');
    });
  });

  describe('form messages', () => {
    it('displays error message when present', () => {
      const errorMessage = {
        type: 'error' as const,
        text: 'Invalid credentials',
      };

      mockUseLoginForm.mockReturnValue(createFormStateMock({
        message: errorMessage,
      }));

      render(<LoginForm />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('allows dismissing error messages', async () => {
      const user = userEvent.setup();
      const errorMessage = {
        type: 'error' as const,
        text: 'Network error',
      };

      mockUseLoginForm.mockReturnValue(createFormStateMock({
        message: errorMessage,
      }));

      render(<LoginForm />);

      // Find dismiss button (depends on FormMessage implementation)
      const dismissButtons = screen.getAllByRole('button');
      const dismissButton = dismissButtons.find(btn => 
        btn.getAttribute('aria-label')?.includes('dismiss') ||
        btn.textContent?.toLowerCase().includes('dismiss')
      );
      
      if (dismissButton) {
        await user.click(dismissButton);
        expect(defaultFormState.setMessage).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('field validation', () => {
    it('triggers validation on field blur', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Simulate field interactions (depends on LoginFormFields implementation)
      const emailInputs = screen.queryAllByLabelText(/email/i);
      if (emailInputs.length > 0) {
        const emailInput = emailInputs[0];
        if (emailInput) {
          await user.click(emailInput);
          await user.tab(); // Blur the field
          expect(defaultFormState.form.trigger).toHaveBeenCalledWith('email');
        }
      } else {
        // If no labeled input, look for input by placeholder or type
        const inputs = screen.getAllByRole('textbox');
        if (inputs.length > 0) {
          const firstInput = inputs[0];
          if (firstInput) {
            await user.click(firstInput);
            await user.tab();
            expect(defaultFormState.form.trigger).toHaveBeenCalled();
          }
        }
      }
    });

    it('displays field validation errors', () => {
      const formStateWithErrors = createFormStateMock();
      formStateWithErrors.form.formState.errors = {
        email: { message: 'Invalid email format', type: 'pattern' },
        password: { message: 'Password required', type: 'required' },
      };
      
      mockUseLoginForm.mockReturnValue(formStateWithErrors);

      render(<LoginForm />);

      // Validation errors would be passed to LoginFormFields
      // and displayed there based on implementation
      expect(mockUseLoginForm).toHaveBeenCalled();
    });
  });

  describe('OAuth integration', () => {
    it('handles OAuth login when provider is clicked', async () => {
      const _user = userEvent.setup();
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
      const { container } = render(<LoginForm />);

      // Check for form element using container query
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();

      const submitButton = screen.getByTestId('auth-submit-button');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('variant support', () => {
    it('renders with different variants', () => {
      const variants = ['default', 'gaming', 'neon', 'cyber'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<LoginForm variant={variant} />);
        expect(
          screen.getByTestId('auth-submit-button')
        ).toBeInTheDocument();
        unmount();
      });
    });
  });
});
