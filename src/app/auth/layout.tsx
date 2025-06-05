import { BaseErrorBoundary } from '@/components/error-boundaries';

export const metadata = {
  title: 'Authentication - Arcadia',
  description: 'Sign in or create an account for Arcadia Gaming Platform',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <BaseErrorBoundary level="layout">{children}</BaseErrorBoundary>
      </div>
    </div>
  );
}
