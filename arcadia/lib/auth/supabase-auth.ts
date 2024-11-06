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

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

class SupabaseAuth {
  private supabase = createClientComponentClient<Database>()

  private handleSignUpError(error: SupabaseAuthError): never {
    console.error('Auth signup error:', error)
    switch (error.message) {
      case 'User already registered':
        throw new AuthError('An account with this email already exists')
      case 'Password should be at least 6 characters':
        throw new AuthError('Password must be at least 6 characters')
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
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      throw new AuthError(error.message)
    }
  }

  public async signUp(credentials: SignUpCredentials): Promise<string> {
    try {
      const { data, error: signUpError } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: { 
            username: credentials.username,
            full_name: credentials.username,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(credentials.username)}`,
            pendingProfile: true
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (signUpError) {
        this.handleSignUpError(signUpError)
      }

      if (!data?.user) {
        throw new AuthError('Failed to create user - No user data returned')
      }

      return credentials.email
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      console.error('Signup error:', error)
      throw new AuthError('Failed to complete signup process')
    }
  }

  public async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      throw new AuthError(error.message)
    }
  }
}

// Export a singleton instance
export const supabaseAuth = new SupabaseAuth()