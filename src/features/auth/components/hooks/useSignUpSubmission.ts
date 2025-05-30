'use client';

import React from 'react';
import { useAuth, useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import type {
  FormData,
  OAuthProvider,
  SignUpStatus as _SignUpStatus,
  SignUpMessage as _SignUpMessage,
} from '../../types/signup-form.types';
import type { UseSignUpFormReturn } from './useSignUpForm';
import { SIGNUP_MESSAGES, ERROR_MESSAGES, LOG_MESSAGES } from '../constants';

// 🧱 Hook Props Interface
export interface UseSignUpSubmissionProps {
  formState: UseSignUpFormReturn;
  onFormSubmit?: (data: FormData) => Promise<void>;
  onOAuthSignUp?: (provider: OAuthProvider) => Promise<void>;
  onSuccess?: (data: FormData) => void;
  onError?: (error: Error, context?: string) => void;
}

// 🧱 Hook Return Type
export interface UseSignUpSubmissionReturn {
  // Form Submission
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;

  // OAuth Submission
  handleOAuthSignUp: (provider: OAuthProvider) => Promise<void>;
  isOAuthLoading: boolean;

  // Combined loading state
  loading: boolean;
}

/**
 * useSignUpSubmission Hook
 *
 * Handles all submission logic for the SignUpForm component including:
 * - Regular form submission with email/password
 * - OAuth provider authentication (Google, GitHub, etc.)
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
export function useSignUpSubmission({
  formState,
  onFormSubmit,
  onOAuthSignUp,
  onSuccess,
  onError,
}: UseSignUpSubmissionProps): UseSignUpSubmissionReturn {
  const { loading: authLoading } = useAuth();
  const { setLoading, signUp, signInWithOAuth } = useAuthActions();

  // Local loading states for specific operations
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);

  // 🧼 Form Submit Handler
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Reset any existing messages
      formState.setMessage(null);

      // Validate form before submission
      if (!formState.validateFormData()) {
        formState.setMessage({
          text: SIGNUP_MESSAGES.FORM.VALIDATION_ERROR,
          type: 'error',
        });
        return;
      }

      // Set loading states
      setIsSubmitting(true);
      formState.setStatus('loading');
      setLoading(true);

      try {
        logger.debug(LOG_MESSAGES.FORM.SIGNUP_START, {
          component: 'useSignUpSubmission',
          metadata: {
            email: formState.formData.email,
            username: formState.formData.username,
          },
        });

        if (onFormSubmit) {
          // Use custom form submission handler
          await onFormSubmit(formState.formData);
        } else {
          // Use the default auth store signup method
          const result = await signUp({
            email: formState.formData.email.trim(),
            password: formState.formData.password,
            username: formState.formData.username.trim(),
          });

          if (result.error) {
            throw result.error;
          }

          // Handle email verification requirement
          if (result.needsVerification) {
            formState.setStatus('verification_pending');
            formState.setMessage({
              text: SIGNUP_MESSAGES.FORM.EMAIL_VERIFICATION,
              type: 'info',
            });
            return;
          }
        }

        // Success handling
        formState.setStatus('success');
        formState.setMessage({
          text: SIGNUP_MESSAGES.FORM.SUCCESS,
          type: 'success',
        });

        // Start redirect timer
        formState.startRedirectTimer();

        // Clear persistence on success
        formState.persistence?.clear();

        // Call success callback
        onSuccess?.(formState.formData);

        logger.info(LOG_MESSAGES.FORM.SIGNUP_SUCCESS, {
          component: 'useSignUpSubmission',
          metadata: {
            email: formState.formData.email,
            username: formState.formData.username,
          },
        });
      } catch (error) {
        const errorObj = error as Error;

        formState.setStatus('error');
        formState.setMessage({
          text: errorObj.message || ERROR_MESSAGES.FORM.GENERAL,
          type: 'error',
          actionLabel: 'Try Again',
        });

        onError?.(errorObj, 'form_submit');

        logger.error(LOG_MESSAGES.FORM.SIGNUP_FAILED, errorObj, {
          component: 'useSignUpSubmission',
          metadata: {
            email: formState.formData.email,
            username: formState.formData.username,
          },
        });
      } finally {
        setIsSubmitting(false);
        setLoading(false);
      }
    },
    [formState, onFormSubmit, onSuccess, onError, setLoading, signUp]
  );

  // 🧼 OAuth Handler
  const handleOAuthSignUp = React.useCallback(
    async (provider: OAuthProvider) => {
      setIsOAuthLoading(true);
      setLoading(true);
      formState.setMessage(null);

      try {
        logger.debug(LOG_MESSAGES.OAUTH.START, {
          component: 'useSignUpSubmission',
          metadata: { provider },
        });

        if (onOAuthSignUp) {
          // Use custom OAuth handler
          await onOAuthSignUp(provider);
        } else {
          // Validate provider support
          if (provider !== 'google') {
            throw new Error(SIGNUP_MESSAGES.OAUTH.UNSUPPORTED(provider));
          }

          // Use the default auth store OAuth method
          const result = await signInWithOAuth(provider);

          if (result.error) {
            throw result.error;
          }

          formState.setMessage({
            text: SIGNUP_MESSAGES.OAUTH.REDIRECTING(provider),
            type: 'info',
          });

          // Note: OAuth will redirect away from page, so we don't need success handling here
        }

        logger.info(LOG_MESSAGES.OAUTH.SUCCESS, {
          component: 'useSignUpSubmission',
          metadata: { provider },
        });
      } catch (error) {
        const errorObj = error as Error;

        formState.setMessage({
          text: SIGNUP_MESSAGES.OAUTH.ERROR(provider) + '. ' + errorObj.message,
          type: 'error',
        });

        onError?.(errorObj, `oauth_${provider}`);

        notifications.error(ERROR_MESSAGES.OAUTH.FAILED, {
          description: ERROR_MESSAGES.OAUTH.DESCRIPTION,
        });

        logger.error(LOG_MESSAGES.OAUTH.FAILED, errorObj, {
          component: 'useSignUpSubmission',
          metadata: { provider },
        });
      } finally {
        setIsOAuthLoading(false);
        setLoading(false);
      }
    },
    [onOAuthSignUp, onError, formState, setLoading, signInWithOAuth]
  );

  // Combined loading state
  const loading = authLoading || isSubmitting || isOAuthLoading;

  return {
    // Form Submission
    handleSubmit,
    isSubmitting,

    // OAuth Submission
    handleOAuthSignUp,
    isOAuthLoading,

    // Combined loading state
    loading,
  };
}
