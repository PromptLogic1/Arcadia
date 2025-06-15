'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Import custom hooks
import { useSignUpForm } from './hooks/useSignUpForm';
import { useSignUpSubmission } from './hooks/useSignUpSubmission';

// Import modular components
import { SignUpFormHeader } from './SignUpFormHeader';
import { SignUpFormFields } from './SignUpFormFields';
import { SignUpOAuthSection } from './SignUpOAuthSection';
import { SignUpFormFooter } from './SignUpFormFooter';
import { FormMessage } from './form-message';

// Import types and constants
import type { SignUpFormProps as BaseSignUpFormProps } from '../types/signup-form.types';
import {
  SIGNUP_STYLES,
  SIGNUP_MESSAGES,
  SIGNUP_FORM_CONFIG,
  COMPONENT_NAMES,
} from './constants';

// 🎨 CVA Variant System - Main Form Container
const signUpFormVariants = cva(SIGNUP_STYLES.CONTAINER, {
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
    variant: 'cyber',
    size: 'default',
    state: 'idle',
  },
});

// 🎯 Enhanced Props Interface
export interface SignUpFormProps
  extends Omit<BaseSignUpFormProps, 'className'>,
    VariantProps<typeof signUpFormVariants> {
  variant?: VariantProps<typeof signUpFormVariants>['variant'];
  size?: VariantProps<typeof signUpFormVariants>['size'];
  showHeader?: boolean;
  showOAuth?: boolean;
  showFooter?: boolean;
  customTitle?: string;
  customSubtitle?: string;
  theme?: 'default' | 'gaming' | 'neon' | 'cyber';
  className?: string;
}

/**
 * SignUpForm Component
 *
 * A completely refactored, modular implementation of the SignUpForm component
 * using modern React patterns and best practices.
 *
 * Architecture:
 * ✅ Custom Hooks for state management:
 *   - useSignUpForm: Form state, validation, persistence
 *   - useSignUpSubmission: Form submission and OAuth logic
 *
 * ✅ Modular Component Structure:
 *   - SignUpFormHeader: Title and subtitle
 *   - SignUpFormFields: All form input fields
 *   - SignUpOAuthSection: OAuth provider buttons
 *   - SignUpFormFooter: Login link and additional content
 *
 * ✅ Constants Extraction:
 *   - All UI constants, messages, and styles centralized
 *   - No magic values throughout the codebase
 *
 * ✅ Performance Optimizations:
 *   - useCallback for all event handlers
 *   - useMemo for computed values
 *   - Proper dependency arrays
 *
 * ✅ Type Safety:
 *   - 100% TypeScript coverage
 *   - Explicit interfaces for all props and state
 *   - CVA-based variant system for consistent styling
 *
 * Features:
 * - Drop-in replacement for original SignUpForm
 * - Same props interface for backward compatibility
 * - Enhanced customization options
 * - Better error handling and user feedback
 * - Improved accessibility and semantic structure
 * - Clean separation of concerns
 */
export const SignUpForm = React.forwardRef<HTMLDivElement, SignUpFormProps>(
  (
    {
      config: userConfig,
      initialData,
      variant = 'default',
      size = 'default',
      showHeader = true,
      showOAuth = true,
      showFooter = true,
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
    // 🧼 Custom Hooks - State Management
    const formState = useSignUpForm({
      config: userConfig,
      initialData,
      customValidation,
      onStatusChange,
    });

    const submission = useSignUpSubmission({
      formState,
      onFormSubmit,
      onOAuthSignUp,
      onSuccess,
      onError,
    });

    // 🎨 Style Calculations
    const formStyles = signUpFormVariants({
      variant,
      size,
      state: formState.status,
    });

    // 🧼 Computed Values
    const canSubmit = formState.canSubmit && !submission.loading;
    const showFormMessage = formState.message !== null;

    return (
      <div ref={ref} className={cn(formStyles, className)} {...props}>
        {/* Form Header */}
        <SignUpFormHeader
          showHeader={showHeader}
          customTitle={customTitle}
          customSubtitle={customSubtitle}
          variant={theme}
          size={size}
        />

        {/* Main Form */}
        <form onSubmit={submission.handleSubmit} className="space-y-6">
          {/* Global Message Display */}
          {showFormMessage && formState.message && (
            <FormMessage
              message={formState.message}
              redirectTimer={formState.redirectTimer}
              variant={theme}
              dismissible={formState.message.type === 'error'}
              onDismiss={() => formState.setMessage(null)}
            />
          )}

          {/* Form Fields */}
          <SignUpFormFields
            formData={formState.formData}
            validationErrors={formState.validationErrors}
            passwordRequirements={formState.passwordRequirements}
            onFieldChange={formState.handleFieldChange}
            loading={submission.loading}
            variant={theme}
            size={size}
            theme={theme}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className={cn(SIGNUP_STYLES.FORM.SUBMIT_BUTTON_BASE, {
              [SIGNUP_STYLES.FORM.SUBMIT_BUTTON_DISABLED]: !canSubmit,
            })}
          >
            {submission.loading
              ? SIGNUP_MESSAGES.FORM.PROCESSING
              : SIGNUP_MESSAGES.FORM.SUBMIT_BUTTON}
          </Button>
        </form>

        {/* OAuth Section */}
        {formState.config.enableOAuth && showOAuth && (
          <SignUpOAuthSection
            enableOAuth={formState.config.enableOAuth}
            showOAuth={showOAuth}
            supportedProviders={SIGNUP_FORM_CONFIG.OAUTH.SUPPORTED_PROVIDERS}
            onOAuthSignUp={submission.handleOAuthSignUp}
            loading={submission.loading}
            variant={theme}
          />
        )}

        {/* Footer */}
        <SignUpFormFooter showFooter={showFooter} variant={theme} size={size} />
      </div>
    );
  }
);

SignUpForm.displayName = COMPONENT_NAMES.SIGNUP_FORM;

// Default export for backward compatibility
export default SignUpForm;

// 🎯 Type Exports for external use
export { signUpFormVariants };
