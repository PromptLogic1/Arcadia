import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { store } from '@/src/store'
import { 
  setProfile, 
  updateProfile, 
  setLoading, 
  setError,
  clearUnsavedChanges 
} from '../slices/userSlice'
import type { Database } from '@/types/database.types'
import type { Tables } from '@/types/database.types'

class UserService {
  private supabase = createClientComponentClient<Database>()

  async fetchUserProfile(userId: string) {
    try {
      store.dispatch(setLoading(true))
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      store.dispatch(setProfile(data))
    } catch (error) {
      store.dispatch(setError((error as Error).message))
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async updateUserProfile(userId: string, updates: Partial<Tables['users']['Row']>) {
    try {
      store.dispatch(setLoading(true))
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      store.dispatch(setProfile(data))
      store.dispatch(clearUnsavedChanges())
      return { success: true }
    } catch (error) {
      store.dispatch(setError((error as Error).message))
      return { success: false, error }
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async updateVisibility(
    userId: string, 
    type: 'profile' | 'achievements' | 'submissions',
    visibility: 'public' | 'private'
  ) {
    return this.updateUserProfile(userId, {
      [`${type}_visibility`]: visibility
    })
  }
}

export const userService = new UserService() 