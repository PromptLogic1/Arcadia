/**
 * Forgot Password Submission Hook
 *
 * Custom hook for handling forgot password form submission.
 * Integrates with TanStack Query mutation and manages submission state.
 */

import { useState, useCallback } from 'react';
import { useResetPasswordMutation } from '@/hooks/queries/useAuthQueries';
import type { ForgotPasswordFormData } from './useForgotPasswordForm';

export interface UseForgotPasswordSubmissionReturn {
  // Submission state
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;

  // Actions
  submitForgotPassword: (data: ForgotPasswordFormData) => Promise<void>;
  resetSubmissionState: () => void;
}

/**
 * Custom hook for forgot password submission logic
 */
export function useForgotPasswordSubmission(): UseForgotPasswordSubmissionReturn {
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPasswordMutation = useResetPasswordMutation();

  const submitForgotPassword = useCallback(
    async (data: ForgotPasswordFormData) => {
      setError(null);
      setIsSuccess(false);

      try {
        const result = await resetPasswordMutation.mutateAsync(data.email);

        if (result.error) {
          setError(result.error);
          return;
        }

        setIsSuccess(true);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'An error occurred. Please try again.'
        );
      }
    },
    [resetPasswordMutation]
  );

  const resetSubmissionState = useCallback(() => {
    setIsSuccess(false);
    setError(null);
  }, []);

  return {
    isSubmitting: resetPasswordMutation.isPending,
    isSuccess,
    error,
    submitForgotPassword,
    resetSubmissionState,
  };
}
