'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LOGIN_STYLES,
  LOGIN_MESSAGES,
  LOGIN_FORM_CONFIG,
  COMPONENT_NAMES,
} from './constants';

// 🧼 Types
export interface LoginOAuthSectionProps {
  enableOAuth?: boolean;
  showOAuth?: boolean;
  supportedProviders?: readonly string[];
  onOAuthLogin: (provider: string) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'gaming' | 'neon' | 'cyber';
  dividerText?: string;
  hideIfNoProviders?: boolean;
  className?: string;
}

/**
 * LoginOAuthSection Component
 *
 * A focused component that renders OAuth authentication options:
 * - Stylized divider with "Or continue with" text
 * - OAuth provider buttons (Google, etc.)
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
export const LoginOAuthSection = React.forwardRef<
  HTMLDivElement,
  LoginOAuthSectionProps
>(
  (
    {
      enableOAuth = true,
      showOAuth = true,
      supportedProviders = LOGIN_FORM_CONFIG.OAUTH.SUPPORTED_PROVIDERS,
      onOAuthLogin,
      loading = false,
      disabled = false,
      variant: _variant = 'default',
      dividerText,
      hideIfNoProviders = true,
      className,
      ...props
    },
    ref
  ) => {
    // 🧼 Memoized OAuth handlers - must be called before any early returns
    const handleGoogleLogin = React.useCallback(
      () => onOAuthLogin('google'),
      [onOAuthLogin]
    );

    // Determine if we should show the OAuth section
    const shouldShow =
      enableOAuth && showOAuth && supportedProviders.length > 0;

    // Early return if we shouldn't show OAuth section
    if (!shouldShow && hideIfNoProviders) {
      return null;
    }

    // Determine if buttons should be disabled
    const buttonsDisabled = loading || disabled;

    // Provider button configurations
    const providerConfigs = {
      google: {
        handler: handleGoogleLogin,
        icon: Mail,
        label: LOGIN_MESSAGES.OAUTH.GOOGLE_BUTTON,
      },
    } as const;

    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        {/* Divider */}
        <div className={LOGIN_STYLES.OAUTH.DIVIDER.CONTAINER}>
          <div className={LOGIN_STYLES.OAUTH.DIVIDER.LINE}>
            <div className={LOGIN_STYLES.OAUTH.DIVIDER.LINE_BORDER}></div>
          </div>
          <div className={LOGIN_STYLES.OAUTH.DIVIDER.TEXT_CONTAINER}>
            <span className={LOGIN_STYLES.OAUTH.DIVIDER.TEXT}>
              {dividerText || LOGIN_MESSAGES.OAUTH.CONTINUE_WITH}
            </span>
          </div>
        </div>

        {/* OAuth Buttons Section */}
        <div className={LOGIN_STYLES.OAUTH.BUTTONS_CONTAINER}>
          {supportedProviders.map((provider: string) => {
            const config =
              providerConfigs[provider as keyof typeof providerConfigs];
            if (!config) {
              console.warn(`OAuth provider "${provider}" is not configured`);
              return null;
            }

            const IconComponent = config.icon;

            return (
              <Button
                key={provider}
                type="button"
                variant="outline"
                onClick={config.handler}
                disabled={buttonsDisabled}
                className={LOGIN_STYLES.OAUTH.BUTTON}
                aria-label={`Sign in with ${provider}`}
              >
                <IconComponent className="h-5 w-5" />
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }
);

LoginOAuthSection.displayName = COMPONENT_NAMES.LOGIN_OAUTH_SECTION;
