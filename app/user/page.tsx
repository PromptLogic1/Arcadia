import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserProfile from './_components/user'

export default async function UserProfilePage() {
  const supabase = createServerComponentClient({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session?.user?.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  return <UserProfile userData={userData} />
} 