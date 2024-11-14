'use client'

import { useState } from 'react'
import type { Tables } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, X } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils'

interface GeneralSettingsProps {
  userId: string
  userData: Tables['users']['Row']
  onSettingsUpdate?: () => void
}

export function GeneralSettings({ userId, userData, onSettingsUpdate }: GeneralSettingsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // Email states
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [currentEmail, setCurrentEmail] = useState(userData.email)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  
  // Username state
  const [username, setUsername] = useState(userData.username)
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const supabase = createClientComponentClient()

  const resetEmailForm = () => {
    setIsChangingEmail(false)
    setNewEmail('')
    setConfirmEmail('')
    setMessage(null)
  }

  const handleEmailUpdate = async () => {
    setMessage(null)
    
    try {
      // Validate inputs
      if (newEmail !== confirmEmail) {
        throw new Error('New email addresses do not match')
      }

      if (newEmail === currentEmail) {
        throw new Error('New email must be different from current email')
      }

      setIsSaving(true)

      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (updateError) throw updateError

      setMessage({
        text: 'Verification email sent! Please check your inbox to confirm your new email address.',
        type: 'success'
      })

      // Reset form but keep message visible
      setNewEmail('')
      setConfirmEmail('')
      setIsChangingEmail(false)
      
      onSettingsUpdate?.()
    } catch (error) {
      console.error('Email update error:', error)
      setMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating email',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUsernameUpdate = async () => {
    setMessage(null)
    
    try {
      if (username === userData.username) {
        throw new Error('New username must be different from current username')
      }

      setIsSaving(true)

      const { error: profileError } = await supabase
        .from('users')
        .update({ username })
        .eq('id', userId)

      if (profileError) throw profileError

      setMessage({
        text: 'Username updated successfully!',
        type: 'success'
      })
      
      onSettingsUpdate?.()
    } catch (error) {
      console.error('Username update error:', error)
      setMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating username',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    setMessage(null)
    
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match')
      }

      setIsSaving(true)

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: currentPassword,
      })

      if (verifyError) {
        throw new Error('Current password is incorrect')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setMessage({
        text: 'Password updated successfully!',
        type: 'success'
      })

      // Clear password fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      onSettingsUpdate?.()
    } catch (error) {
      console.error('Password update error:', error)
      setMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating password',
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

      {/* Email Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Label>Current Email Address</Label>
            <p className="text-gray-400 text-sm mt-1">{currentEmail}</p>
          </div>
          {!isChangingEmail && (
            <Button
              onClick={() => setIsChangingEmail(true)}
              variant="outline"
              className="border-cyan-500/20 hover:bg-cyan-500/10"
            >
              Change Email
            </Button>
          )}
        </div>

        {isChangingEmail && (
          <div className="space-y-4 bg-gray-800/30 p-4 rounded-lg relative">
            <button
              onClick={resetEmailForm}
              className="absolute top-2 right-2 p-1 hover:bg-gray-700/50 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="space-y-2">
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-gray-700/50 border-cyan-500/20"
                placeholder="Enter new email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirm New Email Address</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="bg-gray-700/50 border-cyan-500/20"
                placeholder="Confirm new email address"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={resetEmailForm}
                variant="outline"
                className="border-cyan-500/20"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEmailUpdate}
                disabled={isSaving || !newEmail || !confirmEmail}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
              >
                {isSaving ? 'Saving...' : 'Update Email'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Username Section */}
      <div className="space-y-2 pt-6 border-t border-gray-700/50">
        <Label htmlFor="username">Username</Label>
        <div className="flex gap-2">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-gray-700/50 border-cyan-500/20"
          />
          <Button
            onClick={handleUsernameUpdate}
            disabled={isSaving || username === userData.username}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white whitespace-nowrap"
          >
            {isSaving ? 'Saving...' : 'Update Username'}
          </Button>
        </div>
      </div>

      {/* Password Section */}
      <div className="border-t border-gray-700/50 pt-6">
        <h3 className="text-lg font-medium mb-4">Change Password</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-gray-700/50 border-cyan-500/20"
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-gray-700/50 border-cyan-500/20"
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-700/50 border-cyan-500/20"
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handlePasswordUpdate}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
            >
              {isSaving ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 