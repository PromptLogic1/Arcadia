'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth, useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

// Import our new compound components
import { FormField } from './form-field';
import { PasswordRequirements } from './password-requirements';
import { FormMessage } from './form-message';

// Import utilities and types
import type {
  SignUpFormProps,
  FormData,
  SignUpStatus,
  SignUpMessage,
  FormConfig,
  OAuthProvider,
  ValidationErrors,
} from '../types/signup-form.types';
import {
  validateForm,
  checkPasswordRequirements,
  isFormValid as validateFormComplete,
} from '../utils/validation.utils';
import { createFormPersistence } from '../utils/persistence.utils';

// 🎨 CVA Variant System - Main Form Container
const signUpFormVariants = cva(
  'w-full max-w-md space-y-8',
  {
    variants: {
      variant: {
        default: '',
        gaming: 'relative',
        neon: 'relative',
        cyber: 'relative group',
      },
      size: {
        sm: 'max-w-sm space-y-6',
        default: 'max-w-md space-y-8',
        lg: 'max-w-lg space-y-10',
      },
      state: {
        idle: '',
        loading: 'pointer-events-none opacity-75',
        success: '',
        error: '',
        verification_pending: 'pointer-events-none opacity-50',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'idle',
    },
  }
);

// 🎨 CVA Variant System - Form Header
const headerVariants = cva(
  'text-center space-y-2',
  {
    variants: {
      variant: {
        default: '',
        gaming: '',
        neon: '',
        cyber: '',
      },
      size: {
        sm: 'space-y-1',
        default: 'space-y-2',
        lg: 'space-y-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// 🎨 CVA Variant System - OAuth Section
const oauthSectionVariants = cva(
  'space-y-4',
  {
    variants: {
      variant: {
        default: '',
        gaming: 'relative',
        neon: 'relative',
        cyber: 'relative group',
      },
      show: {
        true: 'block',
        false: 'hidden',
      },
    },
    defaultVariants: {
      variant: 'default',
      show: true,
    },
  }
);

// 🧱 Default Configuration
const defaultConfig: FormConfig = {
  enableLocalStorage: true,
  enableOAuth: true,
  redirectPath: '/user/user-page',
  redirectDelay: 3,
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },
};

// 🎯 Enhanced Props Interface
interface EnhancedSignUpFormProps 
  extends Omit<SignUpFormProps, 'className'>,
    VariantProps<typeof signUpFormVariants> {
  variant?: VariantProps<typeof signUpFormVariants>['variant'];
  size?: VariantProps<typeof signUpFormVariants>['size'];
  showHeader?: boolean;
  showOAuth?: boolean;
  customTitle?: string;
  customSubtitle?: string;
  theme?: 'default' | 'gaming' | 'neon' | 'cyber';
  className?: string;
}

// 🎯 Forward Ref Implementation
export const SignUpForm = React.forwardRef<HTMLDivElement, EnhancedSignUpFormProps>(
  (
    {
      config: userConfig,
      initialData,
      variant = 'default',
      size = 'default',
      showHeader = true,
      showOAuth = true,
      customTitle,
      customSubtitle,
      theme = 'default',
      onFormSubmit,
      onOAuthSignUp,
      onSuccess,
      onError,
      onStatusChange,
      customValidation,
      className,
      ...props
    },
    ref
  ) => {
    // 🧼 Configuration Merging
    const config = React.useMemo(
      () => ({ ...defaultConfig, ...userConfig }),
      [userConfig]
    );

    // 🧼 Form State Management
    const [formData, setFormData] = React.useState<FormData>({
      username: initialData?.username || '',
      email: initialData?.email || '',
      password: initialData?.password || '',
      confirmPassword: initialData?.confirmPassword || '',
    });

    const [status, setStatus] = React.useState<SignUpStatus>('idle');
    const [message, setMessage] = React.useState<SignUpMessage | null>(null);
    const [redirectTimer, setRedirectTimer] = React.useState<number | null>(null);
    const [validationErrors, setValidationErrors] = React.useState<ValidationErrors>({});
    const [passwordRequirements, setPasswordRequirements] = React.useState(
      checkPasswordRequirements('', config.passwordRequirements)
    );

    // 🧼 External State
    const router = useRouter();
    const { loading } = useAuth();
    const { setLoading, signUp, signInWithOAuth } = useAuthActions();

    // 🧼 Persistence Setup
    const persistence = React.useMemo(() => 
      config.enableLocalStorage ? createFormPersistence() : null,
      [config.enableLocalStorage]
    );

    // 🧼 Load Saved Data Effect
    React.useEffect(() => {
      if (!persistence) return;

      const savedData = persistence.load();
      if (savedData) {
        setFormData(prev => ({
          ...prev,
          username: savedData.username || prev.username,
          email: savedData.email || prev.email,
        }));

        logger.debug('Loaded saved form data', {
          component: 'SignUpForm',
          metadata: { fields: Object.keys(savedData) },
        });
      }
    }, [persistence]);

    // 🧼 Password Requirements Effect
    React.useEffect(() => {
      setPasswordRequirements(
        checkPasswordRequirements(formData.password, config.passwordRequirements)
      );
    }, [formData.password, config.passwordRequirements]);

    // 🧼 Status Change Effect
    React.useEffect(() => {
      onStatusChange?.(status);
    }, [status, onStatusChange]);

    // 🧼 Redirect Timer Effect
    React.useEffect(() => {
      if (status === 'success' && redirectTimer !== null) {
        const timer = setTimeout(() => {
          if (redirectTimer > 1) {
            setRedirectTimer(redirectTimer - 1);
          } else {
            router.push(config.redirectPath);
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [redirectTimer, status, router, config.redirectPath]);

    // 🧼 Pure Logic - Field Change Handler
    const handleFieldChange = React.useCallback(
      (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear field-specific validation error
        setValidationErrors(prev => ({ ...prev, [field]: undefined }));

        // Save to persistence if enabled and field is persistable
        if (persistence && (field === 'username' || field === 'email')) {
          persistence.save({ [field]: value });
        }

        logger.debug('Form field changed', {
          component: 'SignUpForm',
          metadata: { field, hasValue: !!value },
        });
      },
      [persistence]
    );

    // 🧼 Pure Logic - Form Validation
    const validateFormData = React.useCallback((): boolean => {
      const errors = validateForm(formData, customValidation);
      setValidationErrors(errors);
      return !Object.keys(errors).length;
    }, [formData, customValidation]);

    // 🧼 Form Submit Handler
    const handleSubmit = React.useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!validateFormData()) {
          setMessage({
            text: 'Please fix the errors below',
            type: 'error',
          });
          return;
        }

        setStatus('loading');
        setLoading(true);

        try {
          logger.debug('Starting user signup process', {
            component: 'SignUpForm',
            metadata: { email: formData.email, username: formData.username },
          });

          if (onFormSubmit) {
            await onFormSubmit(formData);
          } else {
            // Use the actual auth store signup method
            const result = await signUp({
              email: formData.email.trim(),
              password: formData.password,
              username: formData.username.trim(),
            });

            if (result.error) {
              throw result.error;
            }

            if (result.needsVerification) {
              setStatus('verification_pending');
              setMessage({
                text: 'Please check your email to verify your account',
                type: 'info',
              });
              return;
            }
          }

          // Success handling
          setStatus('success');
          setMessage({
            text: 'Account created successfully!',
            type: 'success',
          });
          setRedirectTimer(config.redirectDelay);

          // Clear persistence on success
          persistence?.clear();

          onSuccess?.(formData);

          logger.info('User signup completed successfully', {
            component: 'SignUpForm',
            metadata: { email: formData.email, username: formData.username },
          });
        } catch (error) {
          const errorObj = error as Error;
          setStatus('error');
          setMessage({
            text: errorObj.message || 'An error occurred during sign up',
            type: 'error',
            actionLabel: 'Try Again',
          });

          onError?.(errorObj, 'form_submit');

          logger.error('Signup process failed', errorObj, {
            component: 'SignUpForm',
            metadata: { email: formData.email, username: formData.username },
          });
        } finally {
          setLoading(false);
        }
      },
      [
        formData,
        validateFormData,
        onFormSubmit,
        onSuccess,
        onError,
        config.redirectDelay,
        persistence,
        setLoading,
        router,
        signUp,
      ]
    );

    // 🧼 OAuth Handler
    const handleOAuthSignUp = React.useCallback(
      async (provider: OAuthProvider) => {
        setLoading(true);
        setMessage(null);

        try {
          logger.debug('Starting OAuth signup process', {
            component: 'SignUpForm',
            metadata: { provider },
          });

          if (onOAuthSignUp) {
            await onOAuthSignUp(provider);
          } else {
            // Currently only Google OAuth is supported
            if (provider !== 'google') {
              throw new Error(`${provider} OAuth is not yet supported`);
            }

            // Use the actual auth store OAuth method
            const result = await signInWithOAuth(provider);

            if (result.error) {
              throw result.error;
            }

            setMessage({
              text: `Redirecting to ${provider}...`,
              type: 'info',
            });

            // Note: OAuth will redirect away from page
          }

          logger.info('OAuth signup completed successfully', {
            component: 'SignUpForm',
            metadata: { provider },
          });
        } catch (error) {
          const errorObj = error as Error;
          setMessage({
            text: `Failed to sign up with ${provider}. ${errorObj.message}`,
            type: 'error',
          });

          onError?.(errorObj, `oauth_${provider}`);

          notifications.error('OAuth signup failed', {
            description: errorObj.message || 'Please try again or contact support if the problem persists.',
          });

          logger.error('OAuth signup failed', errorObj, {
            component: 'SignUpForm',
            metadata: { provider },
          });
        } finally {
          setLoading(false);
        }
      },
      [onOAuthSignUp, onError, setLoading, signInWithOAuth]
    );

    // 🎨 Style Calculations
    const formStyles = signUpFormVariants({ variant, size, state: status });
    const headerStyles = headerVariants({ variant, size });
    const oauthStyles = oauthSectionVariants({ 
      variant, 
      show: config.enableOAuth && showOAuth 
    });

    // 🧼 Derived States
    const isFormCompletelyValid = React.useMemo(
      (): boolean => validateFormComplete(formData, customValidation),
      [formData, customValidation]
    );

    const canSubmit = React.useMemo(
      () => !loading && isFormCompletelyValid,
      [loading, isFormCompletelyValid]
    );

    return (
      <div ref={ref} className={cn(formStyles, className)} {...props}>
        {/* Form Header */}
        {showHeader && (
          <div className={headerStyles}>
            <h2 className={cn(
              'text-3xl font-bold tracking-tight',
              'bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent',
              {
                'text-2xl': size === 'sm',
                'text-4xl': size === 'lg',
              }
            )}>
              {customTitle || 'Create your account'}
            </h2>
            <p className={cn(
              'text-gray-400',
              {
                'text-sm': size === 'sm',
                'text-base': size === 'lg',
              }
            )}>
              {customSubtitle || 'Join our community and start your journey'}
            </p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error Message */}
          {message && (
            <FormMessage
              message={message}
              redirectTimer={redirectTimer}
              variant={theme}
              dismissible={message.type === 'error'}
              onDismiss={() => setMessage(null)}
            />
          )}

          {/* Username Field */}
          <FormField
            label="Account Name"
            type="text"
            value={formData.username}
            onChange={(value) => handleFieldChange('username', value)}
            error={validationErrors.username}
            placeholder="This will not be your shown username"
            disabled={loading}
            required
            variant={theme}
            helpText="Choose a unique identifier for your account"
          />

          {/* Email Field */}
          <FormField
            label="Email address"
            type="email"
            value={formData.email}
            onChange={(value) => handleFieldChange('email', value)}
            error={validationErrors.email}
            placeholder="Enter your email"
            disabled={loading}
            required
            variant={theme}
          />

          {/* Password Field */}
          <FormField
            label="Password"
            type="password"
            value={formData.password}
            onChange={(value) => handleFieldChange('password', value)}
            error={typeof validationErrors.password === 'string' ? validationErrors.password : undefined}
            placeholder="Create a password"
            disabled={loading}
            required
            variant={theme}
          />

          {/* Password Requirements */}
          <PasswordRequirements
            requirements={passwordRequirements}
            variant={theme}
            showProgress={theme === 'neon' || theme === 'cyber'}
            hideCompleted={false}
          />

          {/* Confirm Password Field */}
          <FormField
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(value) => handleFieldChange('confirmPassword', value)}
            error={validationErrors.confirmPassword}
            placeholder="Confirm your password"
            disabled={loading}
            required
            variant={theme}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500',
              'rounded-full py-2 font-medium text-white',
              'transition-all duration-200 hover:opacity-90',
              'shadow-lg shadow-cyan-500/25',
              !canSubmit && 'cursor-not-allowed opacity-50'
            )}
          >
            {loading ? 'Processing...' : 'Sign Up'}
          </Button>
        </form>

        {/* OAuth Section */}
        {config.enableOAuth && showOAuth && (
          <>
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900 px-2 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className={oauthStyles}>
              <Button
                variant="outline"
                onClick={() => handleOAuthSignUp('google')}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Continue with Google
              </Button>
            </div>
          </>
        )}

        {/* Login Link */}
        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }
);

SignUpForm.displayName = 'SignUpForm';

// 🎯 Type Exports
export type { EnhancedSignUpFormProps as SignUpFormProps };
export { signUpFormVariants, headerVariants, oauthSectionVariants }; 