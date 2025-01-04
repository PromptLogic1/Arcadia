import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import { setAuthUser, clearUser, setLoading, setError, setUserdata } from '../slices/authSlice'
import type { Database } from '@/types/database.types'
import { serverLog } from '@/lib/logger'

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  error?: Error;
  needsVerification?: boolean;
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
      if (!user) {
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
          display_name: user.user_metadata?.display_name,
          provider: user.app_metadata?.provider,
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

  async updatePassword(password: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.updateUser({ password })

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
}

export const authService = new AuthService() 