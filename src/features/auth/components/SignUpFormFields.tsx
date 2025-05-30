'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type {
  FormData,
  ValidationErrors,
  PasswordRequirements,
} from '../types/signup-form.types';
import { FormField } from './form-field';
import { PasswordRequirements as PasswordRequirementsComponent } from './password-requirements';
import { SIGNUP_MESSAGES, SIGNUP_STYLES, COMPONENT_NAMES } from './constants';

// 🎨 CVA Variant System - Form Fields Container
const formFieldsVariants = cva(SIGNUP_STYLES.FORM.CONTAINER, {
  variants: {
    variant: {
      default: '',
      gaming: 'relative',
      neon: 'relative',
      cyber: 'relative group',
    },
    size: {
      sm: 'space-y-4',
      default: 'space-y-6',
      lg: 'space-y-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

// 🧱 Props Interface
export interface SignUpFormFieldsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldsVariants> {
  // Form State
  formData: FormData;
  validationErrors: ValidationErrors;
  passwordRequirements: PasswordRequirements;

  // Event Handlers
  onFieldChange: (field: keyof FormData, value: string) => void;

  // UI State
  loading?: boolean;
  disabled?: boolean;
  variant?: VariantProps<typeof formFieldsVariants>['variant'];
  size?: VariantProps<typeof formFieldsVariants>['size'];
  theme?: 'default' | 'gaming' | 'neon' | 'cyber';

  // Customization
  showPasswordRequirements?: boolean;
  hidePasswordProgress?: boolean;
}

/**
 * SignUpFormFields Component
 *
 * A focused component that renders all form input fields for signup:
 * - Username field with validation
 * - Email field with validation
 * - Password field with requirements display
 * - Confirm password field with matching validation
 *
 * Features:
 * ✅ Centralized form field rendering
 * ✅ Integrated validation error display
 * ✅ Password requirements tracking and display
 * ✅ Consistent styling and theming across all fields
 * ✅ Performance optimized with memoized field handlers
 * ✅ Accessible form structure with proper labeling
 * ✅ Loading state support for all fields
 */
export const SignUpFormFields = React.forwardRef<
  HTMLDivElement,
  SignUpFormFieldsProps
>(
  (
    {
      formData,
      validationErrors,
      passwordRequirements,
      onFieldChange,
      loading = false,
      disabled = false,
      variant = 'default',
      size = 'default',
      theme = 'default',
      showPasswordRequirements = true,
      hidePasswordProgress = false,
      className,
      ...props
    },
    ref
  ) => {
    // Style calculations
    const containerStyles = formFieldsVariants({ variant, size });

    // Determine if fields should be disabled
    const fieldsDisabled = loading || disabled;

    // Memoized field change handlers to prevent recreation
    const handleUsernameChange = React.useCallback(
      (value: string) => onFieldChange('username', value),
      [onFieldChange]
    );

    const handleEmailChange = React.useCallback(
      (value: string) => onFieldChange('email', value),
      [onFieldChange]
    );

    const handlePasswordChange = React.useCallback(
      (value: string) => onFieldChange('password', value),
      [onFieldChange]
    );

    const handleConfirmPasswordChange = React.useCallback(
      (value: string) => onFieldChange('confirmPassword', value),
      [onFieldChange]
    );

    return (
      <div ref={ref} className={cn(containerStyles, className)} {...props}>
        {/* Username Field */}
        <FormField
          label={SIGNUP_MESSAGES.FIELD_LABELS.USERNAME}
          type="text"
          value={formData.username}
          onChange={handleUsernameChange}
          error={validationErrors.username}
          placeholder={SIGNUP_MESSAGES.FIELD_LABELS.USERNAME_PLACEHOLDER}
          disabled={fieldsDisabled}
          required
          variant={theme}
          helpText={SIGNUP_MESSAGES.FIELD_LABELS.USERNAME_HELP}
        />

        {/* Email Field */}
        <FormField
          label={SIGNUP_MESSAGES.FIELD_LABELS.EMAIL}
          type="email"
          value={formData.email}
          onChange={handleEmailChange}
          error={validationErrors.email}
          placeholder={SIGNUP_MESSAGES.FIELD_LABELS.EMAIL_PLACEHOLDER}
          disabled={fieldsDisabled}
          required
          variant={theme}
        />

        {/* Password Field */}
        <FormField
          label={SIGNUP_MESSAGES.FIELD_LABELS.PASSWORD}
          type="password"
          value={formData.password}
          onChange={handlePasswordChange}
          error={
            typeof validationErrors.password === 'string'
              ? validationErrors.password
              : undefined
          }
          placeholder={SIGNUP_MESSAGES.FIELD_LABELS.PASSWORD_PLACEHOLDER}
          disabled={fieldsDisabled}
          required
          variant={theme}
        />

        {/* Password Requirements */}
        {showPasswordRequirements && (
          <PasswordRequirementsComponent
            requirements={passwordRequirements}
            variant={theme}
            showProgress={
              !hidePasswordProgress && (theme === 'neon' || theme === 'cyber')
            }
            hideCompleted={false}
          />
        )}

        {/* Confirm Password Field */}
        <FormField
          label={SIGNUP_MESSAGES.FIELD_LABELS.CONFIRM_PASSWORD}
          type="password"
          value={formData.confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={validationErrors.confirmPassword}
          placeholder={
            SIGNUP_MESSAGES.FIELD_LABELS.CONFIRM_PASSWORD_PLACEHOLDER
          }
          disabled={fieldsDisabled}
          required
          variant={theme}
        />
      </div>
    );
  }
);

SignUpFormFields.displayName = COMPONENT_NAMES.SIGNUP_FORM_FIELDS;
