import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { store } from '@/src/store'
import { setUser, clearUser, setLoading, setError } from '@/src/store/slices/authSlice'
import { clearProfile } from '@/src/store/slices/userSlice'

class AuthService {
  private supabase = createClientComponentClient()

  async initializeAuth() {
    try {
      store.dispatch(setLoading(true))
      
      const { data: { session } } = await this.supabase.auth.getSession()
      
      if (session?.user) {
        const { id, email, user_metadata } = session.user
        store.dispatch(setUser({
          id,
          email: email || '',
          role: user_metadata?.role || 'user',
          username: user_metadata?.username,
          avatar_url: user_metadata?.avatar_url
        }))
      }
    } catch (error) {
      store.dispatch(setError((error as Error).message))
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async signOut() {
    try {
      await this.supabase.auth.signOut()
      store.dispatch(clearUser())
      store.dispatch(clearProfile())
    } catch (error) {
      store.dispatch(setError((error as Error).message))
    }
  }

  setupAuthListener() {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { id, email, user_metadata } = session.user
        store.dispatch(setUser({
          id,
          email: email || '',
          role: user_metadata?.role || 'user',
          username: user_metadata?.username,
          avatar_url: user_metadata?.avatar_url
        }))
      }
      
      if (event === 'SIGNED_OUT') {
        store.dispatch(clearUser())
        store.dispatch(clearProfile())
      }
    })

    return () => subscription.unsubscribe()
  }
}

export const authService = new AuthService()