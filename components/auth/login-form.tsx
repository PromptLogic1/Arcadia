'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

async function checkEmailExists(email: string, supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single()
  return !!data
}

function getErrorMessage(error: Error, context?: { emailExists?: boolean } ): { 
  message: string; 
  type: 'error' | 'warning' | 'info' 
} {
  const errorMessage = error.message.toLowerCase()
  
  // Invalid login credentials with context
  if (errorMessage.includes('invalid login credentials')) {
    if (context?.emailExists) {
      return {
        message: 'Incorrect password. Please try again.',
        type: 'error'
      }
    } else {
      return {
        message: 'No account found with this email address.',
        type: 'error'
      }
    }
  }
  
  // Other specific errors
  if (errorMessage.includes('email not confirmed')) {
    return {
      message: 'Please verify your email address before signing in.',
      type: 'warning'
    }
  }

  if (errorMessage.includes('invalid email')) {
    return {
      message: 'Please enter a valid email address.',
      type: 'error'
    }
  }

  if (errorMessage.includes('rate limit')) {
    return {
      message: 'Too many login attempts. Please try again later.',
      type: 'warning'
    }
  }

  if (errorMessage.includes('network')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      type: 'warning'
    }
  }

  return {
    message: 'An unexpected error occurred. Please try again.',
    type: 'error'
  }
}

export function LogInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [errorInfo, setErrorInfo] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('loginEmail')
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  const handleEmailChange = (value: string) => {
    setErrorInfo(null)
    setEmail(value)
    localStorage.setItem('loginEmail', value)
  }

  const clearSavedData = () => {
    localStorage.removeItem('loginEmail')
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorInfo(null)

    // Validate required fields
    if (!email.trim()) {
      setErrorInfo({
        message: 'Please enter your email address',
        type: 'error'
      })
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErrorInfo({
        message: 'Please enter a valid email address',
        type: 'error'
      })
      return
    }

    if (!password.trim()) {
      setErrorInfo({
        message: 'Please enter your password',
        type: 'error'
      })
      return
    }

    setStatus('loading')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Handle specific error cases
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorInfo({
            message: 'Incorrect email or password',
            type: 'error'
          })
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorInfo({
            message: 'Please verify your email before signing in',
            type: 'warning'
          })
        } else {
          setErrorInfo({
            message: error.message,
            type: 'error'
          })
        }
        setStatus('idle')
        return
      }

      if (data.user) {
        clearSavedData()
        setStatus('success')
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrorInfo({
        message: 'An unexpected error occurred. Please try again.',
        type: 'error'
      })
      setStatus('idle')
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  }

  return (
    <div className="max-w-md w-full text-center space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Sign in to your account
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-6">
          {errorInfo && (
            <div className={cn(
              "p-3 rounded-lg flex items-start gap-2",
              {
                'bg-red-500/10 border-red-500/20': errorInfo.type === 'error',
                'bg-yellow-500/10 border-yellow-500/20': errorInfo.type === 'warning',
                'bg-blue-500/10 border-blue-500/20': errorInfo.type === 'info'
              }
            )}>
              <Info className={cn(
                "w-5 h-5 flex-shrink-0 mt-0.5",
                {
                  'text-red-400': errorInfo.type === 'error',
                  'text-yellow-400': errorInfo.type === 'warning',
                  'text-blue-400': errorInfo.type === 'info'
                }
              )} />
              <div className="space-y-2 text-left">
                <p className={cn(
                  "text-sm",
                  {
                    'text-red-400': errorInfo.type === 'error',
                    'text-yellow-400': errorInfo.type === 'warning',
                    'text-blue-400': errorInfo.type === 'info'
                  }
                )}>
                  {errorInfo.message}
                </p>
                {errorInfo.type === 'warning' && errorInfo.message.includes('verify') && (
                  <button
                    type="button"
                    onClick={() => {/* Add resend verification email logic */}}
                    className="text-sm text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
                  >
                    Resend verification email
                  </button>
                )}
                {errorInfo.type === 'error' && errorInfo.message.includes('password') && (
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-start">
              <Label htmlFor="email">Email address</Label>
            </div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                errorInfo?.message?.toLowerCase().includes('email') && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter your email"
              disabled={status === 'loading'}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-start">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                errorInfo?.message?.toLowerCase().includes('password') && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter your password"
              disabled={status === 'loading'}
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
            {status === 'loading' ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="text-center">
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Continue with Google
          </Button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link 
            href="/auth/signup" 
            className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
} 