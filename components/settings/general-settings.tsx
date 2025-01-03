'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { userService } from '@/src/store/services/user-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Tables } from '@/types/database.types'
import { RootState } from '@/src/store'

interface GeneralSettingsProps {
  userId: string
  userData: Tables['users']['Row']
  onSettingsUpdate: () => void
}

export function GeneralSettings({ userId, userData, onSettingsUpdate }: GeneralSettingsProps) {
  const profile = useSelector((state: RootState) => state.user.profile)
  const loading = useSelector((state: RootState) => state.user.loading)
  const [formData, setFormData] = useState({
    username: userData.username || '',
    full_name: userData.full_name || '',
    // Add more fields as needed
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await userService.updateUserProfile(userId, formData)
    if (result.success) {
      onSettingsUpdate()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
          className="bg-gray-700/50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full Name
        </label>
        <Input
          id="fullName"
          value={formData.full_name}
          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
          className="bg-gray-700/50"
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
} 
