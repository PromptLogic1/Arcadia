'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { SIGNUP_MESSAGES, SIGNUP_STYLES, COMPONENT_NAMES } from './constants';

// 🎨 CVA Variant System - Header Container
const headerVariants = cva(SIGNUP_STYLES.HEADER.CONTAINER, {
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
});

// 🧱 Props Interface
export interface SignUpFormHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof headerVariants> {
  customTitle?: string;
  customSubtitle?: string;
  showHeader?: boolean;
  variant?: VariantProps<typeof headerVariants>['variant'];
  size?: VariantProps<typeof headerVariants>['size'];
}

/**
 * SignUpFormHeader Component
 *
 * A focused header component for the SignUpForm that displays:
 * - Customizable title with gradient styling
 * - Optional subtitle with responsive sizing
 * - Size and variant support for different themes
 * - Conditional rendering based on showHeader prop
 *
 * Features:
 * ✅ Clean separation of header concerns
 * ✅ CVA-based variant system for consistency
 * ✅ Responsive typography with size variants
 * ✅ Accessible heading structure
 * ✅ Forward ref support for external control
 * ✅ Type-safe props with explicit interfaces
 */
export const SignUpFormHeader = React.forwardRef<
  HTMLDivElement,
  SignUpFormHeaderProps
>(
  (
    {
      customTitle,
      customSubtitle,
      showHeader = true,
      variant = 'default',
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

    // Style calculations
    const headerStyles = headerVariants({ variant, size });

    return (
      <div ref={ref} className={cn(headerStyles, className)} {...props}>
        {/* Main Title */}
        <h2
          className={cn(SIGNUP_STYLES.HEADER.TITLE_BASE, {
            [SIGNUP_STYLES.SIZE_VARIANTS.SM.TITLE]: size === 'sm',
            [SIGNUP_STYLES.SIZE_VARIANTS.LG.TITLE]: size === 'lg',
          })}
        >
          {customTitle || SIGNUP_MESSAGES.HEADERS.DEFAULT_TITLE}
        </h2>

        {/* Subtitle */}
        <p
          className={cn(SIGNUP_STYLES.HEADER.SUBTITLE_BASE, {
            [SIGNUP_STYLES.SIZE_VARIANTS.SM.SUBTITLE]: size === 'sm',
            [SIGNUP_STYLES.SIZE_VARIANTS.LG.SUBTITLE]: size === 'lg',
          })}
        >
          {customSubtitle || SIGNUP_MESSAGES.HEADERS.DEFAULT_SUBTITLE}
        </p>
      </div>
    );
  }
);

SignUpFormHeader.displayName = COMPONENT_NAMES.SIGNUP_FORM_HEADER;
