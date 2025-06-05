import { useState, useRef, useEffect } from 'react';
import { useAuth, useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { SETTINGS_CONSTANTS } from '../constants';
import type { FormState, PasswordCheck } from '../constants';

interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UsePasswordUpdateReturn {
  formState: FormState;
  isChangingPassword: boolean;
  setIsChangingPassword: (value: boolean) => void;
  handlePasswordUpdate: (data: PasswordUpdateData) => Promise<void>;
  resetPasswordForm: () => void;
  checkPasswordRequirements: (password: string) => PasswordCheck;
}

export function usePasswordUpdate(): UsePasswordUpdateReturn {
  const { userData, authUser } = useAuth();
  const { updatePassword, signIn, checkPasswordRequirements } =
    useAuthActions();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    message: null,
  });

  // Mount tracking and timeout ref for cleanup
  const isMountedRef = useRef(true);
  const tipTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const currentEmail = authUser?.email || '';

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
      }
    };
  }, []);

  const resetPasswordForm = () => {
    setIsChangingPassword(false);
    setFormState({
      isSubmitting: false,
      message: null,
    });
  };

  const handlePasswordUpdate = async (data: PasswordUpdateData) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    setFormState(prev => ({ ...prev, message: null }));

    try {
      // Validation
      if (newPassword !== confirmPassword) {
        throw new Error(SETTINGS_CONSTANTS.ERRORS.PASSWORD_MISMATCH);
      }

      setFormState(prev => ({ ...prev, isSubmitting: true }));

      // Verify current password
      const verifyResult = await signIn({
        email: currentEmail,
        password: currentPassword,
      });

      if (verifyResult.error) {
        throw new Error(SETTINGS_CONSTANTS.ERRORS.CURRENT_PASSWORD_INCORRECT);
      }

      const updateResult = await updatePassword(newPassword);

      if (updateResult.error) throw updateResult.error;

      // Only update state if still mounted
      if (!isMountedRef.current) return;

      setFormState({
        isSubmitting: false,
        message: {
          text: SETTINGS_CONSTANTS.MESSAGES.PASSWORD_UPDATE_SUCCESS,
          type: 'success',
        },
      });

      // Show additional tip after delay with cleanup
      tipTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setFormState(prev => ({
            ...prev,
            message: {
              text: SETTINGS_CONSTANTS.MESSAGES.PASSWORD_TIP,
              type: 'info',
            },
          }));
        }
      }, SETTINGS_CONSTANTS.TIMING.TIP_DELAY);

      resetPasswordForm();
    } catch (error) {
      logger.error('Password update failed', error as Error, {
        component: 'usePasswordUpdate',
        metadata: { userId: userData?.id },
      });

      // Only update state if still mounted
      if (!isMountedRef.current) return;

      const errorMessage =
        error instanceof Error
          ? error.message
          : SETTINGS_CONSTANTS.ERRORS.PASSWORD_UPDATE_FAILED;

      setFormState({
        isSubmitting: false,
        message: {
          text: errorMessage,
          type: 'error',
        },
      });

      notifications.error('Failed to update password', {
        description:
          error instanceof Error
            ? error.message
            : SETTINGS_CONSTANTS.ERRORS.GENERIC_FALLBACK,
      });
    }
  };

  return {
    formState,
    isChangingPassword,
    setIsChangingPassword,
    handlePasswordUpdate,
    resetPasswordForm,
    checkPasswordRequirements,
  };
}
