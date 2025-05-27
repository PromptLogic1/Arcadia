import { LogInForm } from '../../../features/auth/components/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Arcadia',
  description: 'Sign in to your Arcadia account to access all gaming features.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Welcome back to Arcadia
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to continue your gaming journey
          </p>
        </div>
        <LogInForm />
      </div>
    </div>
  )
} 