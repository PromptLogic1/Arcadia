'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './form-field';
import { LOGIN_MESSAGES, COMPONENT_NAMES } from './constants';
import type { LoginFormData } from '../types/auth-schemas';

// 🧼 Types
export interface LoginFormFieldsProps {
  formData: LoginFormData;
  validationErrors: Record<string, string | undefined>;
  onFieldChange: {
    email: (value: string) => void;
    password: (value: string) => void;
  };
  onFieldBlur?: {
    email?: () => void;
    password?: () => void;
  };
  loading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'gaming' | 'neon' | 'cyber';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

/**
 * LoginFormFields Component
 *
 * A focused component that renders all form input fields for login:
 * - Email field with validation
 * - Password field with validation
 *
 * Features:
 * ✅ Centralized form field rendering
 * ✅ Integrated validation error display
 * ✅ Consistent styling and theming across all fields
 * ✅ Performance optimized with memoized field handlers
 * ✅ Accessible form structure with proper labeling
 * ✅ Loading state support for all fields
 * ✅ Reuses existing FormField component for consistency
 */
export const LoginFormFields = React.forwardRef<
  HTMLDivElement,
  LoginFormFieldsProps
>(
  (
    {
      formData,
      validationErrors,
      onFieldChange,
      onFieldBlur,
      loading = false,
      disabled = false,
      variant = 'cyber',
      size = 'default',
      className,
      ...props
    },
    ref
  ) => {
    // Determine if fields should be disabled
    const fieldsDisabled = loading || disabled;

    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        {/* Email Field */}
        <FormField
          label={LOGIN_MESSAGES.FORM.EMAIL_LABEL}
          type="email"
          value={formData.email}
          onChange={onFieldChange.email}
          onBlur={onFieldBlur?.email}
          error={validationErrors.email}
          placeholder={LOGIN_MESSAGES.FORM.EMAIL_PLACEHOLDER}
          disabled={fieldsDisabled}
          required
          variant={variant}
          size={size}
          data-testid="auth-email-input"
        />

        {/* Password Field */}
        <FormField
          label={LOGIN_MESSAGES.FORM.PASSWORD_LABEL}
          type="password"
          value={formData.password}
          onChange={onFieldChange.password}
          onBlur={onFieldBlur?.password}
          error={validationErrors.password}
          placeholder={LOGIN_MESSAGES.FORM.PASSWORD_PLACEHOLDER}
          disabled={fieldsDisabled}
          required
          variant={variant}
          size={size}
          data-testid="auth-password-input"
        />
      </div>
    );
  }
);

LoginFormFields.displayName = COMPONENT_NAMES.LOGIN_FORM_FIELDS;
