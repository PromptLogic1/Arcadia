'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const router = useRouter();
  const { setLoading, resetPassword, checkPasswordRequirements } =
    useAuthActions();

  // Use Zustand auth store for password checks
  const passwordChecks = checkPasswordRequirements(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('loading');
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!Object.values(passwordChecks).every(Boolean)) {
        throw new Error('Password does not meet all requirements');
      }

      const result = await resetPassword(password);

      if (result.error) {
        throw result.error;
      }

      setStatus('success');
      // Redirect to home page after successful password reset
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
      notifications.success('Password reset successfully!');
      logger.info('Password reset successfully', {
        component: 'ResetPasswordForm',
      });
    } catch (error) {
      logger.error('Password reset failed', error as Error, {
        component: 'ResetPasswordForm',
      });
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to reset password. Please try again.'
      );
      notifications.error('Failed to reset password', {
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or contact support.',
      });
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="mb-8 text-center">
        <h2 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Please enter your new password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border-red-500/20 bg-red-500/10 p-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-start gap-2 rounded-lg border-green-500/20 bg-green-500/10 p-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
            <p className="text-sm text-green-400">
              Password successfully reset. Redirecting to home page...
            </p>
          </div>
        )}

        <div className="relative space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            className="border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500"
            disabled={status === 'loading'}
            required
          />

          {isPasswordFocused && (
            <div className="absolute top-0 left-full ml-4 w-72 space-y-2 rounded-lg border border-cyan-500/20 bg-gray-800/95 p-4 backdrop-blur-sm">
              <p className="mb-3 text-sm font-medium text-gray-300">
                Password Requirements:
              </p>
              {[
                { label: 'Uppercase letter', check: passwordChecks.uppercase },
                { label: 'Lowercase letter', check: passwordChecks.lowercase },
                { label: 'Number', check: passwordChecks.number },
                { label: 'Special character', check: passwordChecks.special },
                { label: '8 characters or more', check: passwordChecks.length },
              ].map(({ label, check }) => (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    check ? 'text-green-400' : 'text-gray-400'
                  )}
                >
                  {check ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500"
            disabled={status === 'loading'}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500',
            'rounded-full py-2 font-medium text-white',
            'transition-all duration-200 hover:opacity-90',
            'shadow-lg shadow-cyan-500/25',
            status === 'loading' && 'cursor-not-allowed opacity-50'
          )}
        >
          {status === 'loading' ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  );
}
