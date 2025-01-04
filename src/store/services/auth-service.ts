import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { store } from '@/src/store'
import { setAuthUser, clearUser, setLoading, setError } from '../slices/authSlice'
import type { Database } from '@/types/database.types'

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  error?: Error;
  needsVerification?: boolean;
}

class AuthService {
  private supabase = createClientComponentClient<Database>()

  async initializeApp() {
    try {
      store.dispatch(setLoading(true))
      
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError) throw authError
      
      if (user) {
        const { data: userData, error: dbError } = await this.supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

        if (dbError) throw dbError

        store.dispatch(setAuthUser({
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          display_name: user.user_metadata?.display_name,
          provider: user.app_metadata?.provider,
          userRole: (userData.role as 'user' | 'admin' | 'moderator' | 'premium') ?? 'user'
        }))
      
      } else {
        store.dispatch(clearUser())
      }
    } catch (error) {
      console.error('Initialization error:', error)
      store.dispatch(setError((error as Error).message))
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
      }
    })
  }

  async signIn({ email, password }: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      if (data?.user) {
        await this.initializeApp() // Lade Benutzerdaten nach erfolgreichem Login
        return {}
      }

      return { error: new Error('Login failed') }
    } catch (error) {
      return { error: error as Error }
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
}

export const authService = new AuthService() 