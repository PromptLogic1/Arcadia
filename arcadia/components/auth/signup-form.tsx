'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Github, Mail } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database.types'
import { Check, X } from 'lucide-react'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [passwordChecks, setPasswordChecks] = useState({
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    length: false,
  })

  // Load saved form data on component mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('signupForm')
    if (savedFormData) {
      const { email, username } = JSON.parse(savedFormData)
      setEmail(email || '')
      setUsername(username || '')
    }
  }, [])

  // Save form data when it changes
  const handleInputChange = (
    setter: (value: string) => void,
    value: string,
    field: 'email' | 'username' | 'password' | 'confirmPassword'
  ) => {
    setError(null)
    setter(value)

    // Only save non-sensitive data to localStorage
    if (field === 'email' || field === 'username') {
      const currentData = localStorage.getItem('signupForm')
      const existingData = currentData ? JSON.parse(currentData) : {}
      localStorage.setItem('signupForm', JSON.stringify({
        ...existingData,
        [field]: value
      }))
    }
  }

  // Clear saved data on successful signup or unmount
  const clearSavedData = () => {
    localStorage.removeItem('signupForm')
  }

  useEffect(() => {
    return () => {
      // Optional: clear data when component unmounts
      // Remove this if you want to persist across navigation
      clearSavedData()
    }
  }, [])

  const checkPasswordRequirements = (password: string) => {
    setPasswordChecks({
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      length: password.length >= 8,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Input validation with specific messages
      if (!username) {
        throw new Error('Username is required')
      }
      
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long')
      }

      if (!email) {
        throw new Error('Email address is required')
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      if (!password) {
        throw new Error('Password is required')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      if (!passwordChecks.uppercase || !passwordChecks.lowercase || 
          !passwordChecks.number || !passwordChecks.special) {
        throw new Error(
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
      }

      if (!confirmPassword) {
        throw new Error('Please confirm your password')
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      // Username format validation
      const usernameRegex = /^[a-zA-Z0-9_-]+$/
      if (!usernameRegex.test(username)) {
        throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
      }

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        // Enhanced Supabase error handling
        switch (signUpError.message) {
          case 'User already registered':
            throw new Error('An account with this email already exists. Please try signing in instead.')
          case 'Password should be at least 6 characters':
            throw new Error('Password must be at least 6 characters long')
          case 'Unable to validate email address: invalid format':
            throw new Error('Please enter a valid email address')
          case 'Email rate limit exceeded':
            throw new Error('Too many signup attempts. Please try again later.')
          default:
            // Log unexpected errors for debugging
            console.error('Signup error:', signUpError)
            throw new Error(signUpError.message || 'An error occurred during sign up')
        }
      }

      if (signUpData.user) {
        try {
          // Check if username is already taken
          const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single()

          if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 means no rows returned
            throw new Error('Error checking username availability')
          }

          if (existingUser) {
            // Cleanup and throw error
            await supabase.auth.admin.deleteUser(signUpData.user.id)
            throw new Error('This username is already taken. Please choose another one.')
          }

          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: signUpData.user.id,
                username: username,
                email: email,
              },
            ])

          if (profileError) {
            // Handle database errors
            switch (profileError.code) {
              case '23505': // unique_violation
                throw new Error('This username is already taken. Please choose another one.')
              case '23503': // foreign_key_violation
                throw new Error('Unable to create user profile. Please try again.')
              default:
                console.error('Profile creation error:', profileError)
                throw new Error('Failed to create user profile')
            }
          }

          // Success - redirect to verification page with email
          clearSavedData()
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        } catch (err) {
          // If profile creation fails, clean up the auth user
          if (signUpData.user?.id) {
            await supabase.auth.admin.deleteUser(signUpData.user.id)
          }
          throw err
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
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
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Join our community and start your journey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-gray-800/50 border border-cyan-500/20 flex items-start gap-2">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => handleInputChange(setUsername, e.target.value, 'username')}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              error?.toLowerCase().includes('username') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Choose a username"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleInputChange(setEmail, e.target.value, 'email')}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              error?.toLowerCase().includes('email') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Enter your email"
            disabled={loading}
          />
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              handleInputChange(setPassword, e.target.value, 'password')
              checkPasswordRequirements(e.target.value)
            }}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              error?.toLowerCase().includes('password') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Create a password"
            disabled={loading}
          />
          
          {/* Password Requirements Checklist */}
          {isPasswordFocused && (
            <div className="absolute left-full top-0 ml-4 w-72 bg-gray-800/95 border border-cyan-500/20 rounded-lg p-4 space-y-2 backdrop-blur-sm">
              <p className="text-sm font-medium text-gray-300 mb-3">
                Password Requirements:
              </p>
              {[
                { label: 'Uppercase letter', check: passwordChecks.uppercase },
                { label: 'Lowercase letter', check: passwordChecks.lowercase },
                { label: 'Number', check: passwordChecks.number },
                { label: 'Special character', check: passwordChecks.special },
                { label: '8 characters or more', check: passwordChecks.length },
              ].map(({ label, check }) => (
                <div 
                  key={label} 
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    check ? "text-green-400" : "text-gray-400"
                  )}
                >
                  {check ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => handleInputChange(setConfirmPassword, e.target.value, 'confirmPassword')}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              error?.includes('match') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Confirm your password"
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500",
            "text-white font-medium py-2 rounded-full",
            "hover:opacity-90 transition-all duration-200",
            "shadow-lg shadow-cyan-500/25",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
        </div>
      </div>

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

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link 
          href="/login" 
          className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
} 