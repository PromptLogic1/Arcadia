import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
}

export const supabase = createClient<Database>(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Verify the client is working
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase Auth State Change:', event, session?.user?.id)
}) 