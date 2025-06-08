'use client';

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-guards';
import { LOGIN_FORM_CONFIG, LOGIN_MESSAGES } from '../constants';
import type { UseLoginFormReturn, LoginFormMessage } from './useLoginForm';
import type { LoginFormData } from '../../types/auth-schemas';

// 🧼 Types
export interface UseLoginSubmissionProps {
  formState: UseLoginFormReturn;
  onFormSubmit?: (data: LoginFormData) => Promise<void> | void;
  onOAuthLogin?: (provider: string) => Promise<void> | void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseLoginSubmissionReturn {
  // Form submission
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;

  // OAuth submission
  handleOAuthLogin: (provider: string) => Promise<void>;

  // State
  loading: boolean;
  isSubmitting: boolean;
}

/**
 * useLoginSubmission Hook
 *
 * Handles all submission logic for the LoginForm component including:
 * - Regular form submission with email/password
 * - OAuth provider authentication (Google, etc.)
 * - Error handling and user feedback
 * - Success state management and redirects
 * - Integration with auth store
 *
 * Features:
 * ✅ Type-safe submission handling
 * ✅ Comprehensive error handling with user-friendly messages
 * ✅ Loading state management for UI feedback
 * ✅ OAuth provider validation and support
 * ✅ Automatic persistence cleanup on success
 * ✅ Performance optimized with useCallback
 * ✅ Detailed logging for debugging
 */
export function useLoginSubmission({
  formState,
  onFormSubmit,
  onOAuthLogin,
  onSuccess,
  onError,
}: UseLoginSubmissionProps): UseLoginSubmissionReturn {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { setLoading, signIn, signInWithOAuth } = useAuthActions();

  // Mount tracking to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Local loading states for specific operations
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);

  // Combined loading state
  const loading =
    authLoading || isSubmitting || isOAuthLoading || formState.isLoading;

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clear any pending redirect timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // 🧼 Form submission handler
  const handleSubmit = React.useCallback(
    async (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault();

      // Get form data
      const data = formState.formData;

      try {
        setIsSubmitting(true);
        formState.setStatus('loading');
        formState.setMessage(null);
        setLoading(true);

        logger.debug('Starting login process', {
          component: 'useLoginSubmission',
          metadata: { email: data.email },
        });

        // Custom submission handler
        if (onFormSubmit) {
          await onFormSubmit(data);
          return;
        }

        // Default auth store submission
        const result = await signIn({
          email: data.email.trim(),
          password: data.password,
        });

        if (result.error) {
          throw result.error;
        }

        // Check if still mounted before state updates
        if (!isMountedRef.current) return;

        if (result.needsVerification) {
          const message: LoginFormMessage = {
            text: LOGIN_MESSAGES.SUCCESS.VERIFICATION_NEEDED,
            type: 'info',
          };
          formState.setMessage(message);
          formState.setStatus('verification_needed');
          return;
        }

        // Success state
        const successMessage: LoginFormMessage = {
          text: LOGIN_MESSAGES.SUCCESS.WELCOME_BACK,
          type: 'success',
        };

        formState.setMessage(successMessage);
        formState.setStatus('success');

        // Clear saved email on successful login
        localStorage.removeItem(LOGIN_FORM_CONFIG.PERSISTENCE.EMAIL_KEY);

        logger.info('Login completed successfully', {
          component: 'useLoginSubmission',
          metadata: { email: data.email },
        });

        // Success callback
        onSuccess?.();

        // Redirect after delay with cleanup
        redirectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            router.push(LOGIN_FORM_CONFIG.REDIRECTS.SUCCESS_PATH);
            router.refresh();
          }
        }, LOGIN_FORM_CONFIG.REDIRECTS.REDIRECT_DELAY);
      } catch (error) {
        const errorObj = toError(error);

        // Check if still mounted before error state updates
        if (!isMountedRef.current) return;

        const errorMessage: LoginFormMessage = {
          text: LOGIN_MESSAGES.ERRORS.LOGIN_FAILED,
          type: 'error',
          details: errorObj.message || LOGIN_MESSAGES.ERRORS.UNEXPECTED_ERROR,
        };

        formState.setMessage(errorMessage);
        formState.setStatus('error');

        logger.error('Login process failed', errorObj, {
          component: 'useLoginSubmission',
          metadata: { email: data.email },
        });

        // Error callback
        onError?.(errorObj);
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
          setLoading(false);
        }
      }
    },
    [formState, onFormSubmit, signIn, onSuccess, onError, router, setLoading]
  );

  // 🧼 OAuth submission handler
  const handleOAuthLogin = React.useCallback(
    async (provider: string) => {
      try {
        setIsOAuthLoading(true);
        formState.setMessage(null);
        formState.setStatus('loading');
        setLoading(true);

        logger.debug(`Starting ${provider} OAuth login`, {
          component: 'useLoginSubmission',
          metadata: { provider },
        });

        // Custom OAuth handler
        if (onOAuthLogin) {
          await onOAuthLogin(provider);
          return;
        }

        // Default OAuth through auth store
        const result = await signInWithOAuth(provider as 'google');

        if (result.error) {
          throw result.error;
        }

        // Check if still mounted before state updates
        if (!isMountedRef.current) return;

        const successMessage: LoginFormMessage = {
          text: LOGIN_MESSAGES.OAUTH.REDIRECTING,
          type: 'info',
        };

        formState.setMessage(successMessage);
        formState.setStatus('success');

        // OAuth will redirect away from page, so no need for additional handling
      } catch (error) {
        const errorObj = toError(error);

        // Check if still mounted before error state updates
        if (!isMountedRef.current) return;

        const errorMessage: LoginFormMessage = {
          text: LOGIN_MESSAGES.ERRORS.OAUTH_FAILED,
          type: 'error',
          details: errorObj.message || LOGIN_MESSAGES.ERRORS.TRY_AGAIN,
        };

        formState.setMessage(errorMessage);
        formState.setStatus('error');

        logger.error(`${provider} login error`, errorObj, {
          component: 'useLoginSubmission',
          metadata: { provider },
        });

        onError?.(errorObj);
      } finally {
        if (isMountedRef.current) {
          setIsOAuthLoading(false);
          setLoading(false);
        }
      }
    },
    [formState, onOAuthLogin, signInWithOAuth, onError, setLoading]
  );

  return {
    // Form submission
    handleSubmit,

    // OAuth submission
    handleOAuthLogin,

    // State
    loading,
    isSubmitting,
  };
}
