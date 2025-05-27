import { SignUpForm } from '../../../features/auth/components/signup-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | Arcadia',
  description: 'Create your Arcadia account and start your gaming journey.',
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Join Arcadia
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Create your account and start your gaming adventure
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
} 