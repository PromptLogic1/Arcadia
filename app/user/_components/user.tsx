'use client'

import React from 'react'
import type { Tables } from '@/types/database.types'
import { UserPage } from '@/components/user/user-page'

interface UserProfileProps {
  userData?: Tables['users']['Row']
}

export default function UserProfile({ userData }: UserProfileProps) {
  if (!userData) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading user data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <UserPage userData={userData} />
    </div>
  )
}
