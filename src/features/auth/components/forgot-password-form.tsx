'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Mail, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useForgotPasswordForm } from './hooks/useForgotPasswordForm';
import { useForgotPasswordSubmission } from './hooks/useForgotPasswordSubmission';
import { BaseErrorBoundary } from '@/components/error-boundaries';

/**
 * Forgot Password Form Component
 *
 * Modern implementation using:
 * - React Hook Form + Zod validation
 * - TanStack Query mutations
 * - Custom hooks for clean separation of concerns
 */
export function ForgotPasswordForm() {
  const { form, isValid, handleSubmit } = useForgotPasswordForm();
  const { isSubmitting, isSuccess, error, submitForgotPassword } =
    useForgotPasswordSubmission();

  const {
    register,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async data => {
    await submitForgotPassword(data);
  });

  return (
    <BaseErrorBoundary level="component">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mb-8 text-center">
          <h2 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6">
            <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
              <div className="text-left">
                <p className="text-sm text-green-400">
                  If an account exists with that email, we&apos;ve sent you
                  instructions to reset your password.
                </p>
                <p className="mt-2 text-sm text-green-400">
                  Please check your email inbox and spam folder.
                </p>
              </div>
            </div>
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border-red-500/20 bg-red-500/10 p-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={cn(
                  'border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500',
                  (errors.email || error) &&
                    'border-red-500/50 focus:border-red-500'
                )}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-left text-sm text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={cn(
                'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500',
                'rounded-full py-2 font-medium text-white',
                'transition-all duration-200 hover:opacity-90',
                'shadow-lg shadow-cyan-500/25',
                (isSubmitting || !isValid) && 'cursor-not-allowed opacity-50'
              )}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </form>
        )}
      </div>
    </BaseErrorBoundary>
  );
}
