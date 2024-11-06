'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabaseAuth } from '@/lib/auth/supabase-auth'
import { useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const handleResendEmail = async () => {
    if (!email) return
    
    try {
      setResendStatus('sending')
      await supabaseAuth.resendVerificationEmail(email)
      setResendStatus('sent')
    } catch (error) {
      console.error('Failed to resend verification email:', error)
      setResendStatus('idle')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-900">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-gray-800/50 p-3 ring-1 ring-cyan-500/20">
              <Mail className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
              Check your inbox
            </h1>
            <p className="text-gray-400">
              We sent a verification link to{' '}
              <span className="text-cyan-400 font-medium">{email}</span>
            </p>
          </div>

          {/* Instructions Card */}
          <div className="bg-gray-800/50 rounded-lg p-6 ring-1 ring-cyan-500/20">
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Click the link in the email to verify your account. If you don&apos;t see the email, check your spam folder.
              </p>
              <Button
                onClick={handleResendEmail}
                disabled={resendStatus !== 'idle'}
                variant="outline"
                className="w-full bg-gray-800/50 border-cyan-500/50 hover:bg-gray-700/50 text-gray-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
                {resendStatus === 'sending' ? 'Sending...' : 
                 resendStatus === 'sent' ? 'Email sent!' : 
                 'Resend verification email'}
              </Button>
            </div>
          </div>

          {/* Back to Login Link */}
          <p className="text-sm text-gray-400">
            Back to{' '}
            <Link 
              href="/login" 
              className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 