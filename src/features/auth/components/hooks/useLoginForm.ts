'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { loginFormSchema, type LoginFormData } from '../../types/auth-schemas';
import { LOGIN_FORM_CONFIG } from '../constants';

// 🧼 Types
export interface UseLoginFormProps {
  initialData?: Partial<LoginFormData>;
  enablePersistence?: boolean;
  onStatusChange?: (status: LoginFormStatus) => void;
}

export type LoginFormStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'verification_needed';

export interface LoginFormMessage {
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
  details?: string;
}

export interface UseLoginFormReturn {
  // Form state
  formData: LoginFormData;
  status: LoginFormStatus;
  message: LoginFormMessage | null;

  // Form methods
  form: ReturnType<typeof useForm<LoginFormData>>;

  // Field handlers
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;

  // Utility
  setMessage: (message: LoginFormMessage | null) => void;
  setStatus: (status: LoginFormStatus) => void;
  clearForm: () => void;

  // Computed state
  canSubmit: boolean;
  isLoading: boolean;
}

/**
 * useLoginForm Hook
 *
 * Manages login form state, validation, and persistence following
 * the same patterns as useSignUpForm:
 *
 * ✅ React Hook Form integration with Zod validation
 * ✅ Email persistence in localStorage
 * ✅ Status and message management
 * ✅ Performance optimized with useCallback
 * ✅ Type-safe implementation
 * ✅ Consistent error handling
 */
export function useLoginForm({
  initialData,
  enablePersistence = true,
  onStatusChange,
}: UseLoginFormProps = {}): UseLoginFormReturn {
  const _router = useRouter();

  // 🧼 Form setup with React Hook Form + Zod
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    defaultValues: {
      email: initialData?.email || '',
      password: initialData?.password || '',
      ...initialData,
    },
  });

  // 🧼 Local state
  const [status, setStatus] = React.useState<LoginFormStatus>('idle');
  const [message, setMessage] = React.useState<LoginFormMessage | null>(null);

  // 🧼 Watch form data for reactive updates
  const formData = form.watch();

  // 🧼 Load saved email on mount
  React.useEffect(() => {
    if (!enablePersistence) return;

    const savedEmail = localStorage.getItem(
      LOGIN_FORM_CONFIG.PERSISTENCE.EMAIL_KEY
    );
    if (savedEmail) {
      form.setValue('email', savedEmail);
      logger.debug('Loaded saved email from localStorage', {
        component: 'useLoginForm',
      });
    }
  }, [form, enablePersistence]);

  // 🧼 Status change effect
  React.useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // 🧼 Memoized field handlers for performance
  const handleEmailChange = React.useCallback(
    (value: string) => {
      form.setValue('email', value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // Save to localStorage if persistence enabled
      if (enablePersistence) {
        localStorage.setItem(LOGIN_FORM_CONFIG.PERSISTENCE.EMAIL_KEY, value);
      }

      // Clear any existing error messages
      if (message?.type === 'error') {
        setMessage(null);
      }
    },
    [form, enablePersistence, message?.type]
  );

  const handlePasswordChange = React.useCallback(
    (value: string) => {
      form.setValue('password', value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // Clear any existing error messages
      if (message?.type === 'error') {
        setMessage(null);
      }
    },
    [form, message?.type]
  );

  // 🧼 Clear form utility
  const clearForm = React.useCallback(() => {
    form.reset();
    setMessage(null);
    setStatus('idle');

    if (enablePersistence) {
      localStorage.removeItem(LOGIN_FORM_CONFIG.PERSISTENCE.EMAIL_KEY);
    }

    logger.debug('Login form cleared', {
      component: 'useLoginForm',
    });
  }, [form, enablePersistence]);

  // 🧼 Computed state
  const { isDirty, isValid, isSubmitting } = form.formState;
  const canSubmit = isDirty && isValid && !isSubmitting && status !== 'loading';
  const isLoading = isSubmitting || status === 'loading';

  return {
    // Form state
    formData,
    status,
    message,

    // Form methods
    form,

    // Field handlers
    handleEmailChange,
    handlePasswordChange,

    // Utility
    setMessage,
    setStatus,
    clearForm,

    // Computed state
    canSubmit,
    isLoading,
  };
}
