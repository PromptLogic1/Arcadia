'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'
import { notifications } from '@/src/lib/notifications'

// Force the page to be dynamic so it isn't statically prerendered.
export const dynamic = 'force-dynamic'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-900">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-cyan-500/10 p-3">
            <Mail className="w-12 h-12 text-cyan-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Check your email
        </h1>
        
        <p className="text-gray-400">
          We sent a verification link to{' '}
          <span className="text-white font-medium">
            {email || 'your email address'}
          </span>
        </p>
        
        <div className="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-4 text-sm text-gray-300">
          <p>
            Please check your email and click the verification link to complete your registration.
            The link will expire in 24 hours.
          </p>
        </div>
        
        <p className="text-sm text-gray-400">
          Didn&apos;t receive an email?{' '}
          <button 
            className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
            onClick={() => {
              // TODO: Implement resend verification email
              notifications.info('Resend functionality will be implemented soon')
            }}
          >
            Click to resend
          </button>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
} 