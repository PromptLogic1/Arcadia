'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Mail, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Database } from '@/types/database.types'

export function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const emailFromUrl = searchParams.get('email')
    if (emailFromUrl) {
      setEmail(emailFromUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('loading')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setStatus('success')
    } catch (error) {
      console.error('Reset password error:', error)
      setError('An error occurred. Please try again.')
      setStatus('idle')
    }
  }

  return (
    <div className="max-w-md w-full text-center space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {status === 'success' ? (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
            <Mail className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm text-green-400">
                If an account exists with {email}, we've sent you instructions to reset your password.
              </p>
              <p className="text-sm text-green-400 mt-2">
                Please check your email inbox.
              </p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border-red-500/20 flex items-start gap-2">
              <Info className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                error && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter your email"
              disabled={status === 'loading'}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={status === 'loading'}
            className={cn(
              "w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500",
              "text-white font-medium py-2 rounded-full",
              "hover:opacity-90 transition-all duration-200",
              "shadow-lg shadow-cyan-500/25",
              status === 'loading' && "opacity-50 cursor-not-allowed"
            )}
          >
            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </form>
      )}
    </div>
  )
}
