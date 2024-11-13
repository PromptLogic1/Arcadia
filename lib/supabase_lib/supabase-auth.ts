import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

export interface SignUpCredentials {
  email: string
  password: string
  username: string
}

export interface PasswordRequirements {
  uppercase: boolean
  lowercase: boolean
  number: boolean
  special: boolean
  length: boolean
}

export type AuthErrorCode = 
  | 'VERIFICATION_PENDING'
  | 'WRONG_PASSWORD'
  | 'USER_EXISTS'
  | 'NETWORK_ERROR'
  | 'INVALID_USERNAME'
  | 'TOO_MANY_ATTEMPTS'
  | 'INVALID_EMAIL_DOMAIN'

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code?: AuthErrorCode
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

type NetworkOperation<T> = () => Promise<T>

class SupabaseAuth {
  private supabase = createClientComponentClient<Database>()
  private failedAttempts = new Map<string, { count: number, lastAttempt: number }>()
  private readonly MAX_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

  private async handleNetworkError<T>(
    operation: NetworkOperation<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('fetch') || error.message.includes('network')) &&
          attempt < maxRetries
        ) {
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }
        throw error
      }
    }
    // This should never be reached due to the throw in the catch block,
    // but TypeScript needs it for type safety
    throw new Error('Failed to complete operation after all retries')
  }

  private handleSignUpError(error: SupabaseAuthError): never {
    console.error('Auth signup error:', error)
    switch (error.message) {
      case 'User already registered':
        throw new AuthError('An account with this email already exists', 'USER_EXISTS')
      case 'Password should be at least 6 characters':
        throw new AuthError('Password must be at least 6 characters', 'WRONG_PASSWORD')
      default:
        throw new AuthError(error.message || 'An error occurred during signup')
    }
  }

  public checkPasswordRequirements(password: string): PasswordRequirements {
    return {
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      length: password.length >= 8,
    }
  }

  public async signInWithOAuth(provider: 'github' | 'google'): Promise<void> {
    return this.handleNetworkError<void>(async () => {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/verify-email/callback`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined
        }
      })

      if (error) {
        throw new AuthError(error.message)
      }
    })
  }

  private validateUsername(username: string): void {
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!validUsernameRegex.test(username)) {
      throw new AuthError(
        'Username can only contain letters, numbers, underscores, and hyphens.',
        'INVALID_USERNAME'
      )
    }
  }

  public async signUp(credentials: SignUpCredentials): Promise<{ isExisting?: boolean }> {
    return this.handleNetworkError<{ isExisting?: boolean }>(async () => {
      try {
        this.validateUsername(credentials.username)
        // First check if email exists
        const { data: { user: existingEmailUser } } = await this.supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (existingEmailUser) {
          // Email exists, check if username matches
          const { data: userData } = await this.supabase
            .from('users')
            .select('username')
            .eq('auth_id', existingEmailUser.id)
            .single()

          if (userData?.username !== credentials.username) {
            throw new AuthError(
              'This email is already registered with a different username.',
              'USER_EXISTS'
            )
          }
          
          return { isExisting: true }
        }

        // First check if username exists
        const { data: existingUserData } = await this.supabase
          .from('users')
          .select('auth_id')
          .eq('username', credentials.username)
          .single()

        if (existingUserData?.auth_id) {
          // Try to sign in with provided credentials to check if password matches
          const { error: signInError } = await this.supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (signInError) {
            // Password doesn't match the existing username
            throw new AuthError(
              'This username already exists. If this is your account, please use the correct password.',
              'USER_EXISTS'
            )
          }

          // If no error, password matches
          return { isExisting: true }
        }

        // If username doesn't exist, proceed with normal signup flow
        const { error: signUpError } = await this.supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              username: credentials.username,
              full_name: credentials.username,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(credentials.username)}`,
              pendingProfile: true
            },
            emailRedirectTo: `${window.location.origin}/auth/verify-email/callback`
          }
        })

        if (signUpError) {
          this.handleSignUpError(signUpError)
        }

        // If we get here, user needs to verify email
        throw new AuthError('Please verify your email address', 'VERIFICATION_PENDING')

      } catch (error) {
        if (error instanceof AuthError) {
          throw error
        }
        console.error('Signup error:', error)
        throw new AuthError('Failed to complete signup process', 'NETWORK_ERROR')
      }
    })
  }

  public async resendVerificationEmail(email: string): Promise<void> {
    return this.handleNetworkError<void>(async () => {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        throw new AuthError(error.message)
      }
    })
  }

  public async signOut(): Promise<void> {
    return this.handleNetworkError<void>(async () => {
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        throw new AuthError(error.message)
      }

      // Clear all auth-related data from localStorage
      const keysToRemove = [
        'loginEmail',
        'signupForm',
        'supabase.auth.token',
        'supabase.auth.refreshToken',
        // Add any other auth-related keys you might have
      ]

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.warn(`Failed to remove ${key} from localStorage:`, e)
        }
      })

      // Clear any auth-related cookies
      document.cookie.split(';').forEach(cookieString => {
        if (cookieString) {
          const [rawName] = cookieString.split('=')
          if (rawName) {
            const name = rawName.trim()
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          }
        }
      })

      // Optional: Clear sessionStorage if you use it
      try {
        sessionStorage.clear()
      } catch (e) {
        console.warn('Failed to clear sessionStorage:', e)
      }
    })
  }

  public async deleteAccount(): Promise<void> {
    return this.handleNetworkError<void>(async () => {
      // First get the current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      
      if (userError || !user) {
        throw new AuthError('Failed to get current user')
      }

      // Delete the user's profile data first (if you have a users table)
      const { error: profileError } = await this.supabase
        .from('users')
        .delete()
        .eq('auth_id', user.id)

      if (profileError) {
        throw new AuthError('Failed to delete user profile')
      }

      // Delete the user's auth account
      const { error: deleteError } = await this.supabase.auth.admin.deleteUser(
        user.id
      )

      if (deleteError) {
        throw new AuthError('Failed to delete user account')
      }

      // Clear all auth data
      await this.signOut()
    })
  }

  private checkFailedAttempts(identifier: string): void {
    const attempts = this.failedAttempts.get(identifier)
    if (attempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION && attempts.count >= this.MAX_ATTEMPTS) {
        const remainingLockout = Math.ceil((this.LOCKOUT_DURATION - timeSinceLastAttempt) / 60000)
        throw new AuthError(
          `Too many failed attempts. Please try again in ${remainingLockout} minutes.`,
          'TOO_MANY_ATTEMPTS'
        )
      }
      if (timeSinceLastAttempt >= this.LOCKOUT_DURATION) {
        this.failedAttempts.delete(identifier)
      }
    }
  }

  private recordFailedAttempt(identifier: string): void {
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 }
    this.failedAttempts.set(identifier, {
      count: attempts.count + 1,
      lastAttempt: Date.now()
    })
  }
}

// Export a singleton instance
export const supabaseAuth = new SupabaseAuth()