'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Github, Mail, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { supabaseAuth, AuthError } from '@/lib/superbase_lib/supabase-auth'

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

  const router = useRouter()

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

    // Update password checks if password field changes
    if (field === 'password') {
      setPasswordChecks(supabaseAuth.checkPasswordRequirements(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const signUpEmail = await supabaseAuth.signUp(
        {
          email,
          password,
          username
        })
      
      localStorage.removeItem('signupForm') // Clear saved data on success
      router.push(`/auth/verify-email?email=${encodeURIComponent(signUpEmail)}`)
    } catch (error) {
      if (error instanceof AuthError) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred')
        console.error(error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      await supabaseAuth.signInWithOAuth(provider)
    } catch (error) {
      setError(error instanceof AuthError ? error.message : 'Failed to login with provider')
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
        {error && (
          <div className="p-3 rounded-lg bg-gray-800/50 border border-cyan-500/20 flex items-start gap-2">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">{error}</p>
          </div>
        )}

        {/* Form fields remain the same... */}
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
              error?.toLowerCase().includes('username') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Choose a username"
            disabled={loading}
          />
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
              error?.toLowerCase().includes('email') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Enter your email"
            disabled={loading}
          />
        </div>

        {/* Password field with requirements checklist */}
        <div className="space-y-2 relative">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => handleInputChange(setPassword, e.target.value, 'password')}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            className={cn(
              "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
              error?.toLowerCase().includes('password') && "border-red-500/50 focus:border-red-500"
            )}
            placeholder="Create a password"
            disabled={loading}
          />
          
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
                  {check ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {label}
                </div>
              ))}
            </div>
          )}
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