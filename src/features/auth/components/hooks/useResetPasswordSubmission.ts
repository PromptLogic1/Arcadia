/**
 * Reset Password Submission Hook
 *
 * Custom hook for handling reset password form submission.
 * Integrates with TanStack Query mutation and manages submission state.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUpdatePasswordMutation } from '@/hooks/queries/useAuthQueries';
import { notifications } from '@/lib/notifications';
import type { ResetPasswordFormData } from './useResetPasswordForm';

export interface UseResetPasswordSubmissionReturn {
  // Submission state
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;

  // Actions
  submitResetPassword: (data: ResetPasswordFormData) => Promise<void>;
  resetSubmissionState: () => void;
}

/**
 * Custom hook for reset password submission logic
 */
export function useResetPasswordSubmission(): UseResetPasswordSubmissionReturn {
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const updatePasswordMutation = useAuthUpdatePasswordMutation();

  const submitResetPassword = useCallback(
    async (data: ResetPasswordFormData) => {
      setError(null);
      setIsSuccess(false);

      try {
        const result = await updatePasswordMutation.mutateAsync(data.password);

        if (result.error) {
          setError(result.error);
          return;
        }

        setIsSuccess(true);
        notifications.success('Password reset successfully!');

        // Redirect to home page after successful password reset
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2000);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'An error occurred. Please try again.'
        );
      }
    },
    [updatePasswordMutation, router]
  );

  const resetSubmissionState = useCallback(() => {
    setIsSuccess(false);
    setError(null);
  }, []);

  return {
    isSubmitting: updatePasswordMutation.isPending,
    isSuccess,
    error,
    submitResetPassword,
    resetSubmissionState,
  };
}
