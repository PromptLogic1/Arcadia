'use client'

import { useState } from 'react'
import type { Tables } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Info } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils'

interface ProfileSettingsProps {
  userId: string
  userData: Tables['users']['Row']
  onSettingsUpdate?: () => void
}

export function ProfileSettings({ userId, userData, onSettingsUpdate }: ProfileSettingsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [fullName, setFullName] = useState(userData.full_name || '')
  const [bio, setBio] = useState(userData.bio || '')

  const supabase = createClientComponentClient()

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          bio
        })
        .eq('id', userId)

      if (error) throw error

      setMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      })
      
      onSettingsUpdate?.()
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating profile',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={cn(
          "p-4 rounded-lg flex items-start gap-2",
          {
            'bg-green-500/10 border-green-500/20': message.type === 'success',
            'bg-red-500/10 border-red-500/20': message.type === 'error',
            'bg-blue-500/10 border-blue-500/20': message.type === 'info'
          }
        )}>
          <Info className={cn(
            "w-5 h-5 flex-shrink-0 mt-0.5",
            {
              'text-green-400': message.type === 'success',
              'text-red-400': message.type === 'error',
              'text-blue-400': message.type === 'info'
            }
          )} />
          <p className={cn(
            "text-sm",
            {
              'text-green-400': message.type === 'success',
              'text-red-400': message.type === 'error',
              'text-blue-400': message.type === 'info'
            }
          )}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="bg-gray-700/50 border-cyan-500/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="bg-gray-700/50 border-cyan-500/20 min-h-[100px]"
        />
      </div>

      <div className="pt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
} 