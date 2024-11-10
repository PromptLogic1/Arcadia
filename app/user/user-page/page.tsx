import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserProfile from '@/components/user-profile'
import type { Database } from '@/types/database.types'
import type { User } from '@supabase/auth-helpers-nextjs'

export default async function UserPage() {
  // Use cookies() as a function to get read-only cookie store
  const cookieStore = await cookies()
  const supabase = createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  })
  
  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // At this point, we know user exists and has an id
  const authenticatedUser = user as User

  // Fetch user data
  const { data: userData, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authenticatedUser.id)
    .single()

  if (dbError) {
    console.error('Error fetching user data:', dbError)
    return <div>Error loading user profile</div>
  }

  return <UserProfile userData={userData} />
} 