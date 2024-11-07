'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Github, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Database } from '@/types/database.types'

export function LogInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('loginEmail')
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  // Save email when it changes
  const handleEmailChange = (value: string) => {
    setError(null)
    setEmail(value)
    localStorage.setItem('loginEmail', value)
  }

  // Clear saved data on successful login or unmount
  const clearSavedData = () => {
    localStorage.removeItem('loginEmail')
  }

  useEffect(() => {
    return () => {
      // Optional: clear data when component unmounts
      clearSavedData()
    }
  }, [])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        if (!data.user.email_confirmed_at) {
          throw new Error('Please verify your email before signing in')
        }
        
        // Clear saved data on successful login
        clearSavedData()
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'read:user user:email'
      }
    })
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
          {error && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-cyan-500/20 flex items-start gap-2">
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">
                {error}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                error?.toLowerCase().includes('email') && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                error?.toLowerCase().includes('password') && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !!error}
            className={cn(
              "w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500",
              "text-white font-medium py-2 rounded-full",
              "hover:opacity-90 transition-all duration-200",
              "shadow-lg shadow-cyan-500/25",
              (loading || !!error) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
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
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-2"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </Button>
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