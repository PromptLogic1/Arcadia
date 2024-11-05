import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function für typsichere Datenbankabfragen
export const createServerSupabaseClient = async () => {
  const { cookies } = await import('next/headers')
  const { createServerComponentClient } = await import('@supabase/auth-helpers-nextjs')
  
  return createServerComponentClient<Database>({
    cookies
  })
}

// Helper für Fehlerbehandlung
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Typsichere Hilfsfunktionen für häufige Datenbankoperationen
export const db = {
  // Benutzer
  users: {
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('id', id)
        .single()
      
      if (error) throw new DatabaseError('Failed to fetch user', error.code, error)
      return data
    },
    
    updateProfile: async (id: string, profile: Partial<Database['public']['Tables']['users']['Update']>) => {
      const { data, error } = await supabase
        .from('users')
        .update(profile)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw new DatabaseError('Failed to update profile', error.code, error)
      return data
    }
  },

  // Challenges
  challenges: {
    getAll: async (options?: { 
      status?: Database['public']['Tables']['challenges']['Row']['status'],
      difficulty?: Database['public']['Tables']['challenges']['Row']['difficulty'],
      category_id?: string,
      limit?: number
    }) => {
      let query = supabase.from('challenges').select(`
        *,
        category:categories(name),
        created_by:users!inner(username)
      `)

      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.difficulty) {
        query = query.eq('difficulty', options.difficulty)
      }
      if (options?.category_id) {
        query = query.eq('category_id', options.category_id)
      }
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw new DatabaseError('Failed to fetch challenges', error.code, error)
      return data
    },

    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          category:categories(name),
          created_by:users!inner(username),
          tags:challenge_tags(tag:tags(*))
        `)
        .eq('id', id)
        .single()

      if (error) throw new DatabaseError('Failed to fetch challenge', error.code, error)
      return data
    },

    create: async (challenge: Database['public']['Tables']['challenges']['Insert']) => {
      const { data, error } = await supabase
        .from('challenges')
        .insert(challenge)
        .select()
        .single()

      if (error) throw new DatabaseError('Failed to create challenge', error.code, error)
      return data
    }
  },

  // Submissions
  submissions: {
    create: async (submission: Database['public']['Tables']['submissions']['Insert']) => {
      const { data, error } = await supabase
        .from('submissions')
        .insert(submission)
        .select()
        .single()

      if (error) throw new DatabaseError('Failed to create submission', error.code, error)
      return data
    },

    getUserSubmissions: async (user_id: string) => {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          challenge:challenges(title, difficulty)
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (error) throw new DatabaseError('Failed to fetch submissions', error.code, error)
      return data
    }
  }
} 