/**
 * Reset Password Form Hook
 *
 * Custom hook for reset password form state management.
 * Follows the modern architecture pattern with React Hook Form + Zod validation.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Password validation schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export interface UseResetPasswordFormReturn {
  // Form state
  form: ReturnType<typeof useForm<ResetPasswordFormData>>;

  // Form validation
  isValid: boolean;

  // Convenience getters
  password: string;
  confirmPassword: string;

  // Form handlers
  handleSubmit: (
    callback: (data: ResetPasswordFormData) => void | Promise<void>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
}

/**
 * Custom hook for reset password form management
 */
export function useResetPasswordForm(): UseResetPasswordFormReturn {
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const { watch, handleSubmit, formState } = form;
  const { isValid } = formState;

  // Watch form values
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  return {
    form,
    isValid,
    password,
    confirmPassword,
    handleSubmit,
  };
}
