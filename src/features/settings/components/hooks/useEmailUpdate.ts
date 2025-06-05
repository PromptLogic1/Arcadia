import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { SETTINGS_CONSTANTS } from '../constants';
import type { FormState } from '../constants';

interface EmailUpdateData {
  newEmail: string;
  confirmEmail: string;
}

interface UseEmailUpdateReturn {
  formState: FormState;
  isChangingEmail: boolean;
  setIsChangingEmail: (value: boolean) => void;
  handleEmailUpdate: (data: EmailUpdateData) => Promise<void>;
  resetEmailForm: () => void;
}

export function useEmailUpdate(): UseEmailUpdateReturn {
  const { userData, authUser } = useAuth();
  const { updateEmail } = useAuthActions();
  const _router = useRouter();

  // Mount tracking to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const tipTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    message: null,
  });

  const currentEmail = authUser?.email || '';

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clear any pending timeout
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
      }
    };
  }, []);

  const resetEmailForm = () => {
    setIsChangingEmail(false);
    setFormState({
      isSubmitting: false,
      message: null,
    });
  };

  const handleEmailUpdate = async (data: EmailUpdateData) => {
    const { newEmail, confirmEmail } = data;

    setFormState(prev => ({ ...prev, message: null }));

    try {
      // Validation
      if (newEmail !== confirmEmail) {
        throw new Error(SETTINGS_CONSTANTS.ERRORS.EMAIL_MISMATCH);
      }

      if (newEmail === currentEmail) {
        throw new Error(SETTINGS_CONSTANTS.ERRORS.EMAIL_SAME);
      }

      setFormState(prev => ({ ...prev, isSubmitting: true }));

      await updateEmail(newEmail);

      if (!isMountedRef.current) return;

      setFormState({
        isSubmitting: false,
        message: {
          text: SETTINGS_CONSTANTS.MESSAGES.EMAIL_UPDATE_SUCCESS,
          type: 'success',
        },
      });

      // Show additional tip after delay with cleanup
      tipTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          notifications.info(SETTINGS_CONSTANTS.MESSAGES.EMAIL_TIP);
        }
      }, SETTINGS_CONSTANTS.TIMING.TIP_DELAY);

      resetEmailForm();
    } catch (error) {
      logger.error('Email update failed', error as Error, {
        component: 'useEmailUpdate',
        metadata: { userId: userData?.id, newEmail },
      });

      if (!isMountedRef.current) return;

      const errorMessage =
        error instanceof Error
          ? error.message
          : SETTINGS_CONSTANTS.ERRORS.EMAIL_UPDATE_FAILED;

      setFormState({
        isSubmitting: false,
        message: {
          text: errorMessage,
          type: 'error',
        },
      });

      notifications.error('Failed to update email', {
        description:
          error instanceof Error
            ? error.message
            : SETTINGS_CONSTANTS.ERRORS.GENERIC_FALLBACK,
      });
    }
  };

  return {
    formState,
    isChangingEmail,
    setIsChangingEmail,
    handleEmailUpdate,
    resetEmailForm,
  };
}
