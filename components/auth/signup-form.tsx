'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Github, Mail, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { supabaseAuth, AuthError } from '@/lib/supabase_lib/supabase-auth'

type SignUpStatus = 'idle' | 'loading' | 'success' | 'error' | 'verification_pending'

interface SignUpMessage {
  text: string
  type: 'success' | 'error' | 'info'
}

// Add validation types
interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [passwordChecks, setPasswordChecks] = useState({
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    length: false,
  })
  const [status, setStatus] = useState<SignUpStatus>('idle')
  const [message, setMessage] = useState<SignUpMessage | null>(null)
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null)

  // Add validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const router = useRouter()

  // Load saved form data on component mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('signupForm')
    if (savedFormData) {
      try {
        const { email, username } = JSON.parse(savedFormData)
        setEmail(email || '')
        setUsername(username || '')
      } catch (e) {
        console.error('Error loading saved form data:', e)
        localStorage.removeItem('signupForm')
      }
    }
  }, [])

  // Add field validation functions
  const validateUsername = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Username is required'
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters long'
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  }

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return 'Password is required'
    }
    if (!Object.values(passwordChecks).every(check => check)) {
      return 'Password does not meet all requirements'
    }
  }

  const validateConfirmPassword = (value: string): string | undefined => {
    if (!value) {
      return 'Please confirm your password'
    }
    if (value !== password) {
      return 'Passwords do not match'
    }
  }

  // Update handleInputChange to include validation
  const handleInputChange = (
    setter: (value: string) => void,
    value: string,
    field: 'email' | 'username' | 'password' | 'confirmPassword'
  ) => {
    setError(null)
    setter(value)
    setValidationErrors(prev => ({ ...prev, [field]: undefined }))

    // Only save non-sensitive data to localStorage
    if (field === 'email' || field === 'username') {
      try {
        const currentData = localStorage.getItem('signupForm')
        const existingData = currentData ? JSON.parse(currentData) : {}
        localStorage.setItem('signupForm', JSON.stringify({
          ...existingData,
          [field]: value
        }))
      } catch (e) {
        console.error('Error saving form data:', e)
      }
    }

    // Update password checks if password field changes
    if (field === 'password') {
      setPasswordChecks(supabaseAuth.checkPasswordRequirements(value))
    }
  }

  // Update validateForm to use new validation functions
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword)
    }

    setValidationErrors(errors)
    return !Object.values(errors).some(error => error !== undefined)
  }

  // Handle redirect countdown
  useEffect(() => {
    if (status === 'success' && redirectTimer !== null) {
      const timer = setTimeout(() => {
        if (redirectTimer > 1) {
          setRedirectTimer(redirectTimer - 1)
        } else {
          router.push('/user/user-page')
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [redirectTimer, status, router])

  // Update handleSubmit to use new validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    
    // Validate form before proceeding
    if (!validateForm()) {
      return
    }

    setStatus('loading')

    try {
      const result = await supabaseAuth.signUp({
        email,
        password,
        username
      })

      if (result) {
        setStatus('success')
        setMessage({
          text: 'Account already exists! Logging you in...',
          type: 'success'
        })
        setRedirectTimer(3)
        return
      }

      // If we get here, user needs to verify email
      setStatus('verification_pending')
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)

    } catch (error) {
      console.error('Signup error:', error)
      
      if (error instanceof AuthError) {
        switch (error.code) {
          case 'VERIFICATION_PENDING':
            setStatus('verification_pending')
            router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
            return
            
          case 'USER_EXISTS':
            setValidationErrors(prev => ({
              ...prev,
              email: 'An account with this email already exists'
            }))
            break
            
          default:
            setValidationErrors(prev => ({
              ...prev,
              general: error.message
            }))
        }
      } else {
        setValidationErrors(prev => ({
          ...prev,
          general: 'An unexpected error occurred. Please try again.'
        }))
      }
      setStatus('idle')
    }
  }

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setError(null)
    setLoading(true)

    try {
      await supabaseAuth.signInWithOAuth(provider)
    } catch (error) {
      console.error('OAuth error:', error)
      setError('Failed to login with provider. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Join our community and start your journey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {validationErrors.general && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{validationErrors.general}</p>
          </div>
        )}

        {/* Username field */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => handleInputChange(setUsername, e.target.value, 'username')}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              validationErrors.username && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Choose a username"
            disabled={loading}
          />
          {validationErrors.username && (
            <p className="text-sm text-red-400 mt-1">{validationErrors.username}</p>
          )}
        </div>

        {/* Email field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleInputChange(setEmail, e.target.value, 'email')}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              validationErrors.email && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Enter your email"
            disabled={loading}
          />
          {validationErrors.email && (
            <p className="text-sm text-red-400 mt-1">{validationErrors.email}</p>
          )}
        </div>

        {/* Password fields with requirements box */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="space-y-4">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handleInputChange(setPassword, e.target.value, 'password')}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                validationErrors.password && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Create a password"
              disabled={loading}
            />
            
            <div className="w-full bg-gray-800/95 border border-cyan-500/20 rounded-lg p-4 space-y-2">
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
                  {check ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {label}
                </div>
              ))}
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-400 mt-1">{validationErrors.password}</p>
            )}
          </div>
        </div>

        {/* Confirm Password field */}
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => handleInputChange(setConfirmPassword, e.target.value, 'confirmPassword')}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              validationErrors.confirmPassword && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Confirm your password"
            disabled={loading}
          />
          {validationErrors.confirmPassword && (
            <p className="text-sm text-red-400 mt-1">{validationErrors.confirmPassword}</p>
          )}
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-lg flex items-start gap-2",
            {
              'bg-green-500/10 border border-green-500/20 text-green-400': message.type === 'success',
              'bg-red-500/10 border border-red-500/20 text-red-400': message.type === 'error',
              'bg-blue-500/10 border border-blue-500/20 text-blue-400': message.type === 'info'
            }
          )}>
            {message.type === 'success' && <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm">{message.text}</p>
              {redirectTimer !== null && (
                <p className="text-sm mt-1">Redirecting in {redirectTimer} seconds...</p>
              )}
              {message.type === 'error' && message.text.includes('password') && (
                <Link 
                  href="/auth/reset-password" 
                  className="text-sm text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200 mt-2 block"
                >
                  Reset Password
                </Link>
              )}
            </div>
          </div>
        )}

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
          {status === 'loading' ? 'Processing...' : 'Sign Up'}
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
          onClick={() => handleOAuthLogin('github')}
          className="w-full flex items-center justify-center gap-2"
        >
          <Github className="w-5 h-5" />
          Continue with GitHub
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleOAuthLogin('google')}
          className="w-full flex items-center justify-center gap-2"
        >
          <Mail className="w-5 h-5" />
          Continue with Google
        </Button>
      </div>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link 
          href="/auth/login" 
          className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}