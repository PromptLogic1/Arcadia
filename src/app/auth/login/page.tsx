import { LoginForm } from '@/features/auth/components/LoginForm';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Arcadia',
  description: 'Sign in to your Arcadia account to access all gaming features.',
};

export default function LoginPage() {
  return (
    <RouteErrorBoundary routeName="Login">
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 backdrop-blur-sm">
            <LoginForm variant="neon" />
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
