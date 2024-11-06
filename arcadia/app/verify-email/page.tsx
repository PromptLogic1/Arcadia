'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const supabase = createClientComponentClient()

  const handleResendEmail = async () => {
    setResendStatus('sending')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email!,
      })
      if (error) throw error
      setResendStatus('sent')
    } catch (error) {
      console.error('Error resending email:', error)
      setResendStatus('idle')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-900">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Check your email
          </h1>
          <p className="text-gray-400">
            We've sent a verification link to{' '}
            <span className="text-cyan-400 font-medium">{email}</span>
          </p>
        </div>

        <div className="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-6 space-y-4">
          <p className="text-sm text-gray-300">
            Please check your email and click the verification link to complete your registration.
          </p>
          <p className="text-xs text-gray-500">
            If you don't see the email, check your spam folder.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Didn't receive the email?
          </p>
          <Button
            onClick={handleResendEmail}
            disabled={resendStatus === 'sending' || resendStatus === 'sent'}
            variant="outline"
            className="text-cyan-400 hover:text-fuchsia-400"
          >
            {resendStatus === 'sending' ? 'Sending...' : 
             resendStatus === 'sent' ? 'Email sent!' : 
             'Resend verification email'}
          </Button>
        </div>
      </div>
    </div>
  )
} 