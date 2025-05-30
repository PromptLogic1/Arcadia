'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LOGIN_STYLES, LOGIN_MESSAGES, COMPONENT_NAMES } from './constants';

// 🧼 Types
export interface LoginFormHeaderProps {
  customTitle?: string;
  customSubtitle?: string;
  showHeader?: boolean;
  variant?: 'default' | 'gaming' | 'neon' | 'cyber';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

/**
 * LoginFormHeader Component
 *
 * A focused header component for the LoginForm that displays:
 * - Customizable title with gradient styling
 * - Optional subtitle with responsive sizing
 * - Size and variant support for different themes
 * - Conditional rendering based on showHeader prop
 *
 * Features:
 * ✅ Clean separation of header concerns
 * ✅ Consistent styling with LOGIN_STYLES constants
 * ✅ Responsive typography with size variants
 * ✅ Accessible heading structure
 * ✅ Forward ref support for external control
 * ✅ Type-safe props with explicit interfaces
 */
export const LoginFormHeader = React.forwardRef<
  HTMLDivElement,
  LoginFormHeaderProps
>(
  (
    {
      customTitle,
      customSubtitle,
      showHeader = true,
      variant: _variant = 'default',
      size = 'default',
      className,
      ...props
    },
    ref
  ) => {
    // Early return if header should not be shown
    if (!showHeader) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(LOGIN_STYLES.HEADER.CONTAINER, className)}
        {...props}
      >
        {/* Main Title */}
        <h2
          className={cn(
            LOGIN_STYLES.HEADER.TITLE_BASE,
            // Size variants can be added here if needed
            {
              'text-2xl': size === 'sm',
              'text-4xl': size === 'lg',
            }
          )}
        >
          {customTitle || LOGIN_MESSAGES.HEADERS.TITLE}
        </h2>

        {/* Subtitle */}
        <p
          className={cn(LOGIN_STYLES.HEADER.SUBTITLE_BASE, {
            'text-xs': size === 'sm',
            'text-base': size === 'lg',
          })}
        >
          {customSubtitle || LOGIN_MESSAGES.HEADERS.SUBTITLE}
        </p>
      </div>
    );
  }
);

LoginFormHeader.displayName = COMPONENT_NAMES.LOGIN_FORM_HEADER;
