import { SignUpForm } from '@/features/auth/components/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Arcadia',
  description: 'Create your Arcadia account and start your gaming journey.',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-extrabold text-transparent">
            Join Arcadia
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Create your account and start your gaming adventure
          </p>
        </div>
        <SignUpForm variant="gaming" size="default" />
      </div>
    </div>
  );
}
