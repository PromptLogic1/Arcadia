'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail } from '@/components/ui/Icons';
import { notifications } from '@/src/lib/notifications';
import { RouteErrorBoundary } from '@/components/error-boundaries';

// Force the page to be dynamic so it isn't statically prerendered.
export const dynamic = 'force-dynamic';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-cyan-500/10 p-3">
            <Mail className="h-12 w-12 text-cyan-200" />
          </div>
        </div>

        <h1 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Check your email
        </h1>

        <p className="text-gray-400">
          We sent a verification link to{' '}
          <span className="font-medium text-white">
            {email || 'your email address'}
          </span>
        </p>

        <div className="rounded-lg border border-cyan-500/20 bg-gray-800/50 p-4 text-sm text-gray-300">
          <p>
            Please check your email and click the verification link to complete
            your registration. The link will expire in 24 hours.
          </p>
        </div>

        <p className="text-sm text-gray-400">
          Didn&apos;t receive an email?{' '}
          <button
            className="text-cyan-200 transition-colors duration-200 hover:text-fuchsia-200"
            onClick={() => {
              // TODO: Implement resend verification email
              notifications.info(
                'Resend functionality will be implemented soon'
              );
            }}
          >
            Click to resend
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <RouteErrorBoundary routeName="VerifyEmail">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </RouteErrorBoundary>
  );
}
