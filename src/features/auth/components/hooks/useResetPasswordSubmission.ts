/**
 * Reset Password Submission Hook
 *
 * Custom hook for handling reset password form submission.
 * Integrates with TanStack Query mutation and manages submission state.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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

  // Mount tracking to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Ref to track timeout for cleanup
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePasswordMutation = useAuthUpdatePasswordMutation();

  // Cleanup timeout on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  const submitResetPassword = useCallback(
    async (data: ResetPasswordFormData) => {
      setError(null);
      setIsSuccess(false);

      // Clear any existing timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }

      try {
        const result = await updatePasswordMutation.mutateAsync(data.password);

        // Only update state if still mounted
        if (!isMountedRef.current) return;

        if (result.error) {
          setError(result.error);
          return;
        }

        setIsSuccess(true);
        notifications.success('Password reset successfully!');

        // Redirect to home page after successful password reset with cleanup
        redirectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            router.push('/');
            router.refresh();
          }
          redirectTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        // Only update state if still mounted
        if (!isMountedRef.current) return;

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
