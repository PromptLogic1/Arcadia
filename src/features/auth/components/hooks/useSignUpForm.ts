'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import type {
  FormData,
  SignUpStatus,
  SignUpMessage,
  ValidationErrors,
  PasswordRequirements,
  FormConfig,
  ValidationScheme,
} from '../../types/signup-form.types';
import {
  validateForm,
  checkPasswordRequirements,
  isFormValid as validateFormComplete,
} from '../../utils/validation.utils';
import { createFormPersistence } from '../../utils/persistence.utils';
import {
  SIGNUP_FORM_CONFIG,
  SIGNUP_MESSAGES as _SIGNUP_MESSAGES,
  LOG_MESSAGES,
} from '../constants';

// 🧱 Hook Props Interface
export interface UseSignUpFormProps {
  config?: Partial<FormConfig>;
  initialData?: Partial<FormData>;
  customValidation?: Partial<ValidationScheme>;
  onStatusChange?: (status: SignUpStatus) => void;
}

// 🧱 Hook Return Type
export interface UseSignUpFormReturn {
  // Form Data State
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  // Status and Messages
  status: SignUpStatus;
  setStatus: React.Dispatch<React.SetStateAction<SignUpStatus>>;
  message: SignUpMessage | null;
  setMessage: React.Dispatch<React.SetStateAction<SignUpMessage | null>>;
  redirectTimer: number | null;
  setRedirectTimer: React.Dispatch<React.SetStateAction<number | null>>;

  // Validation State
  validationErrors: ValidationErrors;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  passwordRequirements: PasswordRequirements;

  // Computed Values
  isFormCompletelyValid: boolean;
  canSubmit: boolean;
  config: FormConfig;
  persistence: ReturnType<typeof createFormPersistence> | null;

  // Event Handlers
  handleFieldChange: (field: string, value: string) => void;
  validateFormData: () => boolean;
  startRedirectTimer: (delay?: number) => void;
  clearFormData: () => void;
  resetFormState: () => void;
}

/**
 * useSignUpForm Hook
 *
 * Manages all form state for the SignUpForm component including:
 * - Form data and validation state
 * - Status management (idle, loading, success, error, verification_pending)
 * - Password requirements tracking
 * - Form persistence to localStorage
 * - Computed validation states
 * - Event handlers for form interactions
 *
 * Features:
 * ✅ Type-safe form state management
 * ✅ Centralized validation logic
 * ✅ Automatic password requirements checking
 * ✅ localStorage persistence for non-sensitive data
 * ✅ Performance optimized with useCallback/useMemo
 * ✅ Comprehensive error handling
 * ✅ Redirect timer management for success states
 */
export function useSignUpForm({
  config: userConfig,
  initialData,
  customValidation,
  onStatusChange,
}: UseSignUpFormProps = {}): UseSignUpFormReturn {
  const router = useRouter();

  // 🧼 Configuration Merging
  const config = React.useMemo(
    () => ({
      enableLocalStorage: SIGNUP_FORM_CONFIG.PERSISTENCE.ENABLED,
      enableOAuth: SIGNUP_FORM_CONFIG.OAUTH.ENABLED,
      redirectPath: SIGNUP_FORM_CONFIG.DEFAULT_REDIRECT_PATH,
      redirectDelay: SIGNUP_FORM_CONFIG.DEFAULT_REDIRECT_DELAY,
      passwordRequirements: {
        minLength: SIGNUP_FORM_CONFIG.PASSWORD_REQUIREMENTS.MIN_LENGTH,
        requireUppercase:
          SIGNUP_FORM_CONFIG.PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE,
        requireLowercase:
          SIGNUP_FORM_CONFIG.PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE,
        requireNumber: SIGNUP_FORM_CONFIG.PASSWORD_REQUIREMENTS.REQUIRE_NUMBER,
        requireSpecial:
          SIGNUP_FORM_CONFIG.PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL,
      },
      ...userConfig,
    }),
    [userConfig]
  );

  // 🧼 Form State Management
  const [formData, setFormData] = React.useState<FormData>({
    username: initialData?.username || '',
    email: initialData?.email || '',
    password: initialData?.password || '',
    confirmPassword: initialData?.confirmPassword || '',
  });

  const [status, setStatus] = React.useState<SignUpStatus>('idle');
  const [message, setMessage] = React.useState<SignUpMessage | null>(null);
  const [redirectTimer, setRedirectTimer] = React.useState<number | null>(null);
  const [validationErrors, setValidationErrors] =
    React.useState<ValidationErrors>({});
  const [passwordRequirements, setPasswordRequirements] = React.useState(
    checkPasswordRequirements('', config.passwordRequirements)
  );

  // 🧼 Persistence Setup
  const persistence = React.useMemo(
    () => (config.enableLocalStorage ? createFormPersistence() : null),
    [config.enableLocalStorage]
  );

  // 🧼 Load Saved Data Effect
  React.useEffect(() => {
    if (!persistence) return;

    const savedData = persistence.load();
    if (savedData) {
      setFormData(prev => ({
        ...prev,
        username: savedData.username || prev.username,
        email: savedData.email || prev.email,
      }));

      logger.debug(LOG_MESSAGES.PERSISTENCE.LOADED, {
        component: 'useSignUpForm',
        metadata: { fields: Object.keys(savedData) },
      });
    }
  }, [persistence]);

  // 🧼 Password Requirements Effect
  React.useEffect(() => {
    setPasswordRequirements(
      checkPasswordRequirements(formData.password, config.passwordRequirements)
    );
  }, [formData.password, config.passwordRequirements]);

  // 🧼 Status Change Effect
  React.useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // 🧼 Redirect Timer Effect
  React.useEffect(() => {
    if (status === 'success' && redirectTimer !== null) {
      const timer = setTimeout(() => {
        if (redirectTimer > 1) {
          setRedirectTimer(redirectTimer - 1);
        } else {
          router.push(config.redirectPath);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [redirectTimer, status, router, config.redirectPath]);

  // 🧼 Event Handlers
  const handleFieldChange = React.useCallback(
    (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));

      // Clear field-specific validation error
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));

      // Save to persistence if enabled and field is persistable
      if (persistence && (field === 'username' || field === 'email')) {
        persistence.save({ [field]: value });
      }

      logger.debug(LOG_MESSAGES.FORM.FIELD_CHANGED, {
        component: 'useSignUpForm',
        metadata: { field, hasValue: !!value },
      });
    },
    [persistence]
  );

  const validateFormData = React.useCallback((): boolean => {
    const errors = validateForm(formData, customValidation);
    setValidationErrors(errors);
    return !Object.keys(errors).length;
  }, [formData, customValidation]);

  const startRedirectTimer = React.useCallback(
    (delay?: number) => {
      setRedirectTimer(delay ?? config.redirectDelay);
    },
    [config.redirectDelay]
  );

  const clearFormData = React.useCallback(() => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    persistence?.clear();
  }, [persistence]);

  const resetFormState = React.useCallback(() => {
    setStatus('idle');
    setMessage(null);
    setRedirectTimer(null);
    setValidationErrors({});
    clearFormData();
  }, [clearFormData]);

  // 🧼 Computed Values
  const isFormCompletelyValid = React.useMemo(
    (): boolean => validateFormComplete(formData, customValidation),
    [formData, customValidation]
  );

  const canSubmit = React.useMemo(
    () => status !== 'loading' && isFormCompletelyValid,
    [status, isFormCompletelyValid]
  );

  return {
    // Form Data State
    formData,
    setFormData,

    // Status and Messages
    status,
    setStatus,
    message,
    setMessage,
    redirectTimer,
    setRedirectTimer,

    // Validation State
    validationErrors,
    setValidationErrors,
    passwordRequirements,

    // Computed Values
    isFormCompletelyValid,
    canSubmit,
    config,
    persistence,

    // Event Handlers
    handleFieldChange,
    validateFormData,
    startRedirectTimer,
    clearFormData,
    resetFormState,
  };
}
