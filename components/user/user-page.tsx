'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/src/store'
import { withAuth } from '@/lib/auth/withAuth'

function UserPage() {
  const profile = useSelector((state: RootState) => state.user.profile)
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="grid gap-4">
        <div>
          <h2 className="font-semibold">Username</h2>
          <p>{profile?.username}</p>
        </div>
        <div>
          <h2 className="font-semibold">Full Name</h2>
          <p>{profile?.full_name}</p>
        </div>
      </div>
    </div>
  )
}

export default withAuth(UserPage)
