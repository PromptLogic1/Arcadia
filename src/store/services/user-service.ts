import { setuserdata, clearuserdata, setuserdataLoading, setuserdataError } from '../slices/userDataSlice';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { store } from '@/src/store'
import type { Database } from '@/types/database.types'


class UserDataService {
    private supabase = createClientComponentClient<Database>()
  
    async initializeApp() {
      try {
        store.dispatch(setuserdataLoading(true))
        
        const { data: { user }, error: authError } = await this.supabase.auth.getUser()
        
        if (authError) throw authError
        
        if (user) {
          const { data: userData, error: dbError } = await this.supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single();
  
          if (dbError) throw dbError
  
          store.dispatch(setuserdata({
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
        
        } else {
          store.dispatch(clearuserdata())
        }
      } catch (error) {
        console.error('Initialization error:', error)
        store.dispatch(setuserdataError((error as Error).message))
        store.dispatch(clearuserdata())
      } finally {
        store.dispatch(setuserdataLoading(false))
      }
    }
  
    setupUserDataListener() {
      return this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.initializeApp()
        }

        
        if (event === 'SIGNED_OUT') {
          store.dispatch(clearuserdata())
        }
      })
    }
  }
  
  export const userDataService = new UserDataService() 