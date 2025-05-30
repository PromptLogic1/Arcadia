'use client';

import React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { SIGNUP_MESSAGES, SIGNUP_STYLES, COMPONENT_NAMES } from './constants';

// 🎨 CVA Variant System - Footer Container
const footerVariants = cva(SIGNUP_STYLES.FOOTER.CONTAINER, {
  variants: {
    variant: {
      default: '',
      gaming: '',
      neon: '',
      cyber: '',
    },
    size: {
      sm: 'text-xs',
      default: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

// 🧱 Props Interface
export interface SignUpFormFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof footerVariants> {
  // Content Customization
  haveAccountText?: string;
  signInLinkText?: string;
  signInHref?: string;

  // Display Control
  showFooter?: boolean;
  variant?: VariantProps<typeof footerVariants>['variant'];
  size?: VariantProps<typeof footerVariants>['size'];

  // Additional Content
  children?: React.ReactNode;
}

/**
 * SignUpFormFooter Component
 *
 * A focused footer component for the SignUpForm that displays:
 * - "Already have an account?" text
 * - "Sign in" link to login page
 * - Optional additional footer content via children
 * - Consistent styling with theme variants
 *
 * Features:
 * ✅ Clean separation of footer concerns
 * ✅ Customizable text and link destinations
 * ✅ Consistent styling with form theme
 * ✅ Support for additional footer content
 * ✅ Accessible link structure
 * ✅ Responsive typography with size variants
 * ✅ Conditional rendering support
 */
export const SignUpFormFooter = React.forwardRef<
  HTMLDivElement,
  SignUpFormFooterProps
>(
  (
    {
      haveAccountText,
      signInLinkText,
      signInHref = '/auth/login',
      showFooter = true,
      variant = 'default',
      size = 'default',
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Early return if footer should not be shown
    if (!showFooter) {
      return null;
    }

    // Style calculations
    const footerStyles = footerVariants({ variant, size });

    return (
      <div ref={ref} className={cn(footerStyles, className)} {...props}>
        {/* Main Footer Content - Login Link */}
        <p>
          {haveAccountText || SIGNUP_MESSAGES.FOOTER.HAVE_ACCOUNT}{' '}
          <Link href={signInHref} className={SIGNUP_STYLES.FOOTER.LINK}>
            {signInLinkText || SIGNUP_MESSAGES.FOOTER.SIGN_IN_LINK}
          </Link>
        </p>

        {/* Additional Footer Content */}
        {children && <div className="mt-2">{children}</div>}
      </div>
    );
  }
);

SignUpFormFooter.displayName = COMPONENT_NAMES.SIGNUP_FORM_FOOTER;
