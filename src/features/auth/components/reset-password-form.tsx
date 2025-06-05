'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResetPasswordForm } from './hooks/useResetPasswordForm';
import { useResetPasswordSubmission } from './hooks/useResetPasswordSubmission';
import { usePasswordRequirements } from './hooks/usePasswordRequirements';

/**
 * Reset Password Form Component
 *
 * Modern implementation using:
 * - React Hook Form + Zod validation
 * - TanStack Query mutations
 * - Custom hooks for clean separation of concerns
 */
export function ResetPasswordForm() {
  const { form, isValid, password, handleSubmit } = useResetPasswordForm();
  const { isSubmitting, isSuccess, error, submitResetPassword } =
    useResetPasswordSubmission();
  const { requirements, allMet } = usePasswordRequirements(password);

  const {
    register,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async data => {
    await submitResetPassword(data);
  });

  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mb-8 text-center">
          <h2 className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Password Reset Successful
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Your password has been updated successfully. Redirecting you now...
          </p>
        </div>
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-400 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="mb-8 text-center">
        <h2 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Set new password
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Choose a strong password for your account
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border-red-500/20 bg-red-500/10 p-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            className={cn(
              'border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500',
              (errors.password || error) &&
                'border-red-500/50 focus:border-red-500'
            )}
            placeholder="Enter new password"
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="text-left text-sm text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className={cn(
              'border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500',
              (errors.confirmPassword || error) &&
                'border-red-500/50 focus:border-red-500'
            )}
            placeholder="Confirm new password"
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p className="text-left text-sm text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {password && (
          <div className="space-y-3 rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
            <h4 className="text-sm font-medium text-gray-300">
              Password Requirements
            </h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <RequirementItem
                met={requirements.length}
                label="At least 8 characters"
              />
              <RequirementItem
                met={requirements.uppercase}
                label="One uppercase letter"
              />
              <RequirementItem
                met={requirements.lowercase}
                label="One lowercase letter"
              />
              <RequirementItem met={requirements.number} label="One number" />
              <RequirementItem
                met={requirements.special}
                label="One special character"
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !isValid || !allMet}
          className={cn(
            'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500',
            'rounded-full py-2 font-medium text-white',
            'transition-all duration-200 hover:opacity-90',
            'shadow-lg shadow-cyan-500/25',
            (isSubmitting || !isValid || !allMet) &&
              'cursor-not-allowed opacity-50'
          )}
        >
          {isSubmitting ? 'Updating Password...' : 'Update Password'}
        </Button>
      </form>
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  label: string;
}

function RequirementItem({ met, label }: RequirementItemProps) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <X className="h-4 w-4 text-red-400" />
      )}
      <span className={met ? 'text-green-400' : 'text-gray-400'}>{label}</span>
    </div>
  );
}
