'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authService } from '@/src/store/services/auth-service'
import { useDispatch } from 'react-redux'
import { setLoading } from '@/src/store/slices/authSlice'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [passwordChecks, setPasswordChecks] = useState({
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    length: false,
  })
  const router = useRouter()
  const dispatch = useDispatch()

  useEffect(() => {
    // Update password checks when password changes
    setPasswordChecks({
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      length: password.length >= 8,
    })
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('loading')
    dispatch(setLoading(true))

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setStatus('idle')
      return
    }

    if (!Object.values(passwordChecks).every(Boolean)) {
      setError('Password does not meet all requirements')
      setStatus('idle')
      return
    }

    try {
      const result = await authService.updatePassword(password)

      if (result.error) {
        throw result.error
      }

      setStatus('success')
      // Redirect to home page after successful password reset
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    } catch (error) {
      console.error('Reset password error:', error)
      setError('Failed to reset password. Please try again.')
      setStatus('idle')
    } finally {
      dispatch(setLoading(false))
    }
  }

  return (
    <div className="max-w-md w-full text-center space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Please enter your new password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border-red-500/20 flex items-start gap-2">
            <Info className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-3 rounded-lg bg-green-500/10 border-green-500/20 flex items-start gap-2">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-400">
              Password successfully reset. Redirecting to home page...
            </p>
          </div>
        )}

        <div className="space-y-2 relative">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            className="bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500"
            disabled={status === 'loading'}
            required
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

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500"
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
          {status === 'loading' ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  )
} 