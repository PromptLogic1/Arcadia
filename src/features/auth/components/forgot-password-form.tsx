'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Mail, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { setLoading, resetPasswordForEmail } = useAuthActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('loading');
    setLoading(true);

    try {
      const result = await resetPasswordForEmail(email);

      if (result.error) {
        throw result.error;
      }

      setStatus('success');
      // Note: The notification is already handled by the auth store
      logger.info('Password reset email sent successfully', {
        component: 'ForgotPasswordForm',
        metadata: { email },
      });
    } catch (error) {
      logger.error('Password reset request failed', error as Error, {
        component: 'ForgotPasswordForm',
        metadata: { email },
      });
      setError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred. Please try again.'
      );
      // Note: The notification is already handled by the auth store
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
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </p>
      </div>

      {status === 'success' ? (
        <div className="space-y-6">
          <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
            <div className="text-left">
              <p className="text-sm text-green-400">
                If an account exists with {email}, we&apos;ve sent you
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
        <form onSubmit={handleSubmit} className="space-y-6">
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
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={cn(
                'border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500',
                error && 'border-red-500/50 focus:border-red-500'
              )}
              placeholder="Enter your email"
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
            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
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
  );
}
