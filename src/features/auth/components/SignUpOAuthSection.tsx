'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OAuthProvider } from '../types/signup-form.types';
import { SIGNUP_MESSAGES, SIGNUP_STYLES, COMPONENT_NAMES } from './constants';
import { logger } from '@/lib/logger';

// 🎨 CVA Variant System - OAuth Section Container
const oauthSectionVariants = cva('space-y-4', {
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
});

// 🧱 Props Interface
export interface SignUpOAuthSectionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof oauthSectionVariants> {
  // OAuth Configuration
  enableOAuth?: boolean;
  showOAuth?: boolean;
  supportedProviders?: readonly OAuthProvider[];

  // Event Handlers
  onOAuthSignUp: (provider: OAuthProvider) => Promise<void>;

  // UI State
  loading?: boolean;
  disabled?: boolean;
  variant?: VariantProps<typeof oauthSectionVariants>['variant'];

  // Customization
  dividerText?: string;
  hideIfNoProviders?: boolean;
}

/**
 * SignUpOAuthSection Component
 *
 * A focused component that renders OAuth authentication options:
 * - Stylized divider with "Or continue with" text
 * - OAuth provider buttons (Google, GitHub, etc.)
 * - Loading states and disabled states
 * - Conditional rendering based on OAuth availability
 *
 * Features:
 * ✅ Clean separation of OAuth concerns
 * ✅ Support for multiple OAuth providers
 * ✅ Consistent styling with form theme
 * ✅ Accessible button structure with proper ARIA
 * ✅ Loading state management for async operations
 * ✅ Responsive layout and spacing
 * ✅ Performance optimized with memoized handlers
 */
export const SignUpOAuthSection = React.forwardRef<
  HTMLDivElement,
  SignUpOAuthSectionProps
>(
  (
    {
      enableOAuth = true,
      showOAuth = true,
      supportedProviders = ['google'],
      onOAuthSignUp,
      loading = false,
      disabled = false,
      variant = 'default',
      dividerText,
      hideIfNoProviders = true,
      className,
      ...props
    },
    ref
  ) => {
    // 🧼 Memoized OAuth handlers - must be called before any early returns
    const handleGoogleSignUp = React.useCallback(
      () => onOAuthSignUp('google'),
      [onOAuthSignUp]
    );

    const handleGitHubSignUp = React.useCallback(
      () => onOAuthSignUp('github'),
      [onOAuthSignUp]
    );

    const handleDiscordSignUp = React.useCallback(
      () => onOAuthSignUp('discord'),
      [onOAuthSignUp]
    );

    // Determine if we should show the OAuth section
    const shouldShow =
      enableOAuth && showOAuth && supportedProviders.length > 0;

    // Early return if we shouldn't show OAuth section
    if (!shouldShow && hideIfNoProviders) {
      return null;
    }

    // Style calculations
    const sectionStyles = oauthSectionVariants({ variant, show: shouldShow });

    // Determine if buttons should be disabled
    const buttonsDisabled = loading || disabled;

    // Provider button configurations
    const providerConfigs = {
      google: {
        handler: handleGoogleSignUp,
        icon: Mail,
        label: SIGNUP_MESSAGES.OAUTH.GOOGLE_BUTTON,
      },
      github: {
        handler: handleGitHubSignUp,
        icon: Mail, // You might want to use a GitHub icon here
        label: 'Continue with GitHub',
      },
      discord: {
        handler: handleDiscordSignUp,
        icon: Mail, // You might want to use a Discord icon here
        label: 'Continue with Discord',
      },
    } as const;

    return (
      <>
        {/* Divider */}
        <div className={SIGNUP_STYLES.OAUTH.DIVIDER.CONTAINER}>
          <div className={SIGNUP_STYLES.OAUTH.DIVIDER.LINE}>
            <div className={SIGNUP_STYLES.OAUTH.DIVIDER.LINE_BORDER}></div>
          </div>
          <div className={SIGNUP_STYLES.OAUTH.DIVIDER.TEXT_CONTAINER}>
            <span className={SIGNUP_STYLES.OAUTH.DIVIDER.TEXT}>
              {dividerText || SIGNUP_MESSAGES.OAUTH.CONTINUE_WITH}
            </span>
          </div>
        </div>

        {/* OAuth Buttons Section */}
        <div ref={ref} className={cn(sectionStyles, className)} {...props}>
          {supportedProviders.map(provider => {
            const config = providerConfigs[provider];
            if (!config) {
              logger.error(
                'OAuth provider not configured',
                new Error(`Provider ${provider} is not configured`),
                {
                  metadata: { provider },
                }
              );
              return null;
            }

            const IconComponent = config.icon;

            return (
              <Button
                key={provider}
                variant="outline"
                onClick={config.handler}
                disabled={buttonsDisabled}
                className={SIGNUP_STYLES.OAUTH.BUTTON}
                aria-label={`Sign up with ${provider}`}
              >
                <IconComponent className="h-5 w-5" />
                {config.label}
              </Button>
            );
          })}
        </div>
      </>
    );
  }
);

SignUpOAuthSection.displayName = COMPONENT_NAMES.SIGNUP_OAUTH_SECTION;
