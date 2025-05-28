'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth, useAuthActions } from '@/lib/stores';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

// Import our improved components and types
import { FormField } from './form-field';
import { FormMessage } from './form-message';
import { loginFormSchema, type LoginFormData } from '../types/auth-schemas';

interface LoginFormProps {
  variant?: 'default' | 'gaming' | 'neon' | 'cyber';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LoginForm({ 
  variant = 'default',
  onSuccess,
  onError 
}: LoginFormProps) {
  // 🧼 Form state with React Hook Form + Zod
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 🧼 Component state
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
    details?: string;
  } | null>(null);

  // 🧼 External state
  const router = useRouter();
  const { loading } = useAuth();
  const { setLoading, signIn, signInWithOAuth } = useAuthActions();

  // 🧼 Load saved email on mount
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('loginEmail');
    if (savedEmail) {
      form.setValue('email', savedEmail);
    }
  }, [form]);

  // 🧼 Save email on change
  const handleEmailChange = (value: string) => {
    form.setValue('email', value);
    localStorage.setItem('loginEmail', value);
    // Clear any existing errors
    setMessage(null);
  };

  // 🧼 Form submission handler
  const onSubmit = async (data: LoginFormData) => {
    setMessage(null);
    setLoading(true);

    try {
      logger.debug('Starting login process', {
        component: 'LoginForm',
        metadata: { email: data.email },
      });

      // Use the actual auth store for authentication
      const result = await signIn({
        email: data.email.trim(),
        password: data.password,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.needsVerification) {
        setMessage({
          text: 'Please check your email to verify your account',
          type: 'info',
        });
        return;
      }

      localStorage.removeItem('loginEmail'); // Clear saved email on success
      
      setMessage({
        text: 'Welcome back! Redirecting...',
        type: 'success',
      });

      logger.info('Login completed successfully', {
        component: 'LoginForm',
        metadata: { email: data.email },
      });

      // Success callback
      onSuccess?.();
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);

    } catch (error) {
      const errorObj = error as Error;
      
      setMessage({
        text: 'Login failed',
        type: 'error',
        details: errorObj.message || 'An unexpected error occurred',
      });

      logger.error('Login process failed', errorObj, {
        component: 'LoginForm',
        metadata: { email: data.email },
      });

      // Error callback
      onError?.(errorObj);
    } finally {
      setLoading(false);
    }
  };

  // 🧼 OAuth handler
  const handleGoogleLogin = async () => {
    try {
      setMessage(null);
      setLoading(true);

      logger.debug('Starting Google OAuth login', {
        component: 'LoginForm',
      });

      const result = await signInWithOAuth('google');

      if (result.error) {
        throw result.error;
      }

      setMessage({
        text: 'Redirecting to Google...',
        type: 'info',
      });

      // Note: OAuth will redirect away from page, so no need for additional handling
      
    } catch (error) {
      const errorObj = error as Error;
      
      setMessage({
        text: 'Google login failed',
        type: 'error',
        details: errorObj.message || 'Please try again',
      });

      logger.error('Google login error', errorObj, {
        component: 'LoginForm',
      });

      onError?.(errorObj);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className={cn(
          'text-3xl font-bold tracking-tight',
          'bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent'
        )}>
          Welcome back
        </h2>
        <p className="text-sm text-gray-400">
          Sign in to your account
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General Message */}
        {message && (
          <FormMessage
            message={message}
            variant={variant}
            dismissible={message.type === 'error'}
            onDismiss={() => setMessage(null)}
          />
        )}

        {/* Email Field */}
        <FormField
          label="Email address"
          type="email"
          value={form.watch('email')}
          onChange={handleEmailChange}
          onBlur={() => form.trigger('email')}
          error={form.formState.errors.email?.message}
          placeholder="Enter your email"
          disabled={form.formState.isSubmitting}
          required
          variant={variant}
        />

        {/* Password Field */}
        <FormField
          label="Password"
          type="password"
          value={form.watch('password')}
          onChange={(value) => form.setValue('password', value)}
          onBlur={() => form.trigger('password')}
          error={form.formState.errors.password?.message}
          placeholder="Enter your password"
          disabled={form.formState.isSubmitting}
          required
          variant={variant}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
          className={cn(
            'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500',
            'rounded-full py-2 font-medium text-white',
            'transition-all duration-200 hover:opacity-90',
            'shadow-lg shadow-cyan-500/25',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>

        {/* Forgot Password Link */}
        <div className="text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-900 px-2 text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={form.formState.isSubmitting}
          className="flex w-full items-center justify-center gap-2"
        >
          <Mail className="h-5 w-5" />
          Continue with Google
        </Button>
      </div>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-gray-400">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
} 