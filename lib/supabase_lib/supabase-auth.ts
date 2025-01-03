import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { store } from '@/src/store'
import { setAuthUser, clearUser, setLoading, setError } from '@/src/store/slices/authSlice'
import type { Database } from '@/types/database.types'

class AuthService {
  private supabase = createClientComponentClient<Database>()

  async initializeAuth() {
    try {
      store.dispatch(setLoading(true))
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) throw error

      if (user) {
        // Set auth user data
        store.dispatch(setAuthUser({
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          display_name: user.user_metadata?.display_name ?? undefined,
          provider: user.app_metadata?.provider ?? undefined,
          role: (user.role as 'user' | 'admin' | 'moderator' | 'premium') ?? 'user'
        }))

      }
    } catch (error) {
      store.dispatch(setError((error as Error).message))
      store.dispatch(clearUser())
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async signOut() {
    try {
      await this.supabase.auth.signOut()
      store.dispatch(clearUser())
    } catch (error) {
      store.dispatch(setError((error as Error).message))
    }
  }

  setupAuthListener() {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.initializeAuth() // Reuse initialization logic
      }
      
      if (event === 'SIGNED_OUT') {
        store.dispatch(clearUser())
      }
    })
  }
}

export const authService = new AuthService()