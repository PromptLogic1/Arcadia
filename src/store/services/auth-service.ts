import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { store } from '@/src/store'
import { setAuthUser, clearUser, setLoading, setError } from '../slices/authSlice'
import type { Database } from '@/types/database.types'

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
          role: (userData.role as 'user' | 'admin' | 'moderator' | 'premium') ?? 'user'
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
}

export const authService = new AuthService() 