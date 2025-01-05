import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import { setAuthUser, clearUser, setLoading, setError, setUserdata } from '../slices/authSlice'
import { serverLog } from '@/lib/logger'

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  error?: Error;
  needsVerification?: boolean;
}

interface UpdateUserDataParams {
  username?: string
  full_name?: string
  bio?: string
  land?: string
  region?: string
  city?: string
}

interface PasswordChecks {
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
}

class AuthService {
  private supabase = supabase

  constructor() {
    // Verify Supabase initialization
    if (!this.supabase.auth) {
      console.error('Supabase client not properly initialized')
    }
  }

  async initializeApp() {
    try {
      store.dispatch(setLoading(true))
      
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      // If no user or error, just clear the store and return
      if (!user || authError) {
        store.dispatch(clearUser())
        return
      }
        // Only fetch user data if we have an authenticated user
        const { data: userData, error: dbError } = await this.supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single()

        if (dbError) throw dbError

        // Update Redux store with user data
        store.dispatch(setAuthUser({
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          auth_username: user.user_metadata?.username ?? null,
          provider: user.app_metadata?.provider ?? null,
          userRole: (userData?.role as 'user' | 'admin' | 'moderator' | 'premium') ?? 'user'
        }))

        // Update Userdata
        store.dispatch(setUserdata({
          id: userData.id,
          username: userData.username,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          role: userData.role,
          experience_points: userData.experience_points,
          land: userData.land,
          region: userData.region,
          city: userData.city,
          bio: userData.bio,
          last_login_at: userData.last_login_at,
          created_at: userData.created_at
        }))

    } catch (error) {
      console.error('Auth initialization error:', error)
      store.dispatch(clearUser())
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  setupAuthListener() {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.initializeApp()
      }
      
      if (event === 'SIGNED_OUT') {
        store.dispatch(clearUser())
        // No need to redirect here as signOut() handles it
      }
    })
  }

  async signIn({ email, password }: SignInCredentials): Promise<AuthResponse> {
    try {
      store.dispatch(setLoading(true))
      
      await serverLog('Login attempt', { 
        email: email,
        hasPassword: password
      })

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      })

      if (error) {
        await serverLog('Login failed', {
          error: {
            message: error.message,
            status: error.status,
            name: error.name,
            details: error
          }
        })
        return { 
          error: new Error(error.message)
        }
      }

      if (!data?.user) {
        await serverLog('No user data received')
        return { error: new Error('No user data received') }
      }

      await serverLog('Login successful', { userId: data.user.id })
      await this.initializeApp()
      
      return {}
    } catch (error) {
      await serverLog('Unexpected login error', { error })
      return { error: error as Error }
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async signInWithOAuth(provider: 'google'): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/oauth-success`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  async signUp({ email, password, username }: { 
    email: string; 
    password: string; 
    username: string; 
  }): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
          emailRedirectTo: `${window.location.origin}/auth/oauth-success`
        }
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      if (data?.user?.identities?.length === 0) {
        return { error: new Error('Account with this email already exists') }
      }

      if (!data.user?.confirmed_at) {
        return { needsVerification: true }
      }

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  async resetPasswordForEmail(email: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  async signOut(): Promise<AuthResponse> {
    try {
      store.dispatch(setLoading(true))
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        return { error: new Error(error.message) }
      }

      // Clear the user data from Redux store
      store.dispatch(clearUser())

      // Let the router handle navigation
      window.location.href = '/'

      return {}
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as Error }
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async refreshUserData() {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (!user || authError) {
        throw new Error(authError?.message || 'No user found')
      }

      const { data: userData, error: dbError } = await this.supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (dbError) throw dbError

      // Update Redux store with user data
      store.dispatch(setUserdata({
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        role: userData.role,
        experience_points: userData.experience_points,
        land: userData.land,
        region: userData.region,
        city: userData.city,
        bio: userData.bio,
        last_login_at: userData.last_login_at,
        created_at: userData.created_at
      }))

      return userData
    } catch (error) {
      console.error('Error refreshing user data:', error)
      throw error
    }
  }

  async updateUserData(userId: string, updates: UpdateUserDataParams) {
    try {
      // Update in Supabase
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Update Redux store with the returned data
      store.dispatch(setUserdata({
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        role: data.role,
        experience_points: data.experience_points,
        land: data.land,
        region: data.region,
        city: data.city,
        bio: data.bio,
        last_login_at: data.last_login_at,
        created_at: data.created_at
      }))

      return data
    } catch (error) {
      console.error('Error updating user data:', error)
      throw error
    }
  }

  async updateEmail(newEmail: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        email: newEmail
      })

      if (error) throw error
    } catch (error) {
      console.error('Error updating email:', error)
      throw error
    }
  }

  async updatePassword(password: string): Promise<AuthResponse> {
    try {
      // First check if password meets requirements
      const checks = this.checkPasswordRequirements(password)
      if (!Object.values(checks).every(Boolean)) {
        return { 
          error: new Error('Password does not meet all requirements') 
        }
      }

      const { error } = await this.supabase.auth.updateUser({ password })

      if (error) {
        // Verbesserte Fehlermeldungen
        switch (error.message) {
          case 'New password should be different from the old password':
            return { error: new Error('Your new password must be different from your current password') }
          case 'Auth session missing!':
            return { error: new Error('Your session has expired. Please log in again') }
          default:
            return { error: new Error(error.message || 'Failed to update password') }
        }
      }

      return {}
    } catch (error) {
      console.error('Password update error:', error)
      return { 
        error: error instanceof Error 
          ? error 
          : new Error('An unexpected error occurred while updating your password') 
      }
    }
  }

  checkPasswordRequirements(password: string): PasswordChecks {
    return {
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      length: password.length >= 8,
    }
  }
}

export const authService = new AuthService() 