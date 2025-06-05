/**
 * Forgot Password Form Hook
 *
 * Custom hook for forgot password form state management.
 * Follows the modern architecture pattern with React Hook Form + Zod validation.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export interface UseForgotPasswordFormReturn {
  // Form state
  form: ReturnType<typeof useForm<ForgotPasswordFormData>>;

  // Form validation
  isValid: boolean;

  // Convenience getters
  email: string;

  // Form handlers
  handleSubmit: (
    callback: (data: ForgotPasswordFormData) => void | Promise<void>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
}

/**
 * Custom hook for forgot password form management
 */
export function useForgotPasswordForm(): UseForgotPasswordFormReturn {
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  });

  const { watch, handleSubmit, formState } = form;
  const { isValid } = formState;

  // Watch form values
  const email = watch('email');

  return {
    form,
    isValid,
    email,
    handleSubmit,
  };
}
