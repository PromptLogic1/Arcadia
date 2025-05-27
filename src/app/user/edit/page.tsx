'use client'
import dynamic from 'next/dynamic'

// Dynamically import the UserPageEdit component with SSR disabled.
// This prevents module-level location references from running on the server.
const UserPageEdit = dynamic(() => import('@/src/features/user/components/user-page-edit'), { ssr: false })

export default function EditProfilePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <UserPageEdit />
    </div>
  )
} 