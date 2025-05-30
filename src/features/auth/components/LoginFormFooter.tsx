'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LOGIN_STYLES,
  LOGIN_MESSAGES,
  LOGIN_FORM_CONFIG,
  COMPONENT_NAMES,
} from './constants';

// 🧼 Types
export interface LoginFormFooterProps {
  showFooter?: boolean;
  showSignUpLink?: boolean;
  showForgotPasswordLink?: boolean;
  variant?: 'default' | 'gaming' | 'neon' | 'cyber';
  size?: 'sm' | 'default' | 'lg';
  forgotPasswordPath?: string;
  signupPath?: string;
  className?: string;
}

/**
 * LoginFormFooter Component
 *
 * A focused footer component for the LoginForm that displays:
 * - Forgot password link
 * - Sign up prompt and link for new users
 * - Customizable paths and styling
 * - Conditional rendering based on props
 *
 * Features:
 * ✅ Clean separation of footer concerns
 * ✅ Consistent styling with LOGIN_STYLES constants
 * ✅ Accessible link structure with proper navigation
 * ✅ Forward ref support for external control
 * ✅ Type-safe props with explicit interfaces
 * ✅ Configurable paths for different routing setups
 */
export const LoginFormFooter = React.forwardRef<
  HTMLDivElement,
  LoginFormFooterProps
>(
  (
    {
      showFooter = true,
      showSignUpLink = true,
      showForgotPasswordLink = true,
      variant = 'default',
      size = 'default',
      forgotPasswordPath = LOGIN_FORM_CONFIG.REDIRECTS.FORGOT_PASSWORD_PATH,
      signupPath = LOGIN_FORM_CONFIG.REDIRECTS.SIGNUP_PATH,
      className,
      ...props
    },
    ref
  ) => {
    // Early return if footer should not be shown
    if (!showFooter) {
      return null;
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {/* Forgot Password Link */}
        {showForgotPasswordLink && (
          <div className={LOGIN_STYLES.FORM.FORGOT_PASSWORD_CONTAINER}>
            <Link
              href={forgotPasswordPath}
              className={cn(LOGIN_STYLES.FORM.FORGOT_PASSWORD_LINK, {
                'text-xs': size === 'sm',
                'text-base': size === 'lg',
              })}
            >
              {LOGIN_MESSAGES.FORM.FORGOT_PASSWORD}
            </Link>
          </div>
        )}

        {/* Sign Up Link */}
        {showSignUpLink && (
          <p
            className={cn(LOGIN_STYLES.FOOTER.CONTAINER, {
              'text-xs': size === 'sm',
              'text-base': size === 'lg',
            })}
          >
            {LOGIN_MESSAGES.FORM.SIGNUP_PROMPT}{' '}
            <Link
              href={signupPath}
              className={cn(LOGIN_STYLES.FOOTER.SIGNUP_LINK, {
                // Add variant-specific styling if needed
                'text-cyan-300 hover:text-fuchsia-300': variant === 'neon',
              })}
            >
              {LOGIN_MESSAGES.FORM.SIGNUP_LINK}
            </Link>
          </p>
        )}
      </div>
    );
  }
);

LoginFormFooter.displayName = COMPONENT_NAMES.LOGIN_FORM_FOOTER;
