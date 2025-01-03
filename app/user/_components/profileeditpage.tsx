import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserPageEdit from '@/components/user/user-page-edit'
import type { Database } from '@/types/database.types'

export default async function EditProfilePage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  })
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  const { data: userData, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user ? user.id : '')
    .single()

  if (dbError) {
    console.error('Error fetching user data:', dbError)
    return <div>Error loading user profile</div>
  }

  return <UserPageEdit userId={userData.id} userData={userData} />
} 