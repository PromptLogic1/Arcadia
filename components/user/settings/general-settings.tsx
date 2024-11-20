'use client'

import { useState, useEffect } from 'react'
import type { Tables } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, X, Check } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils'
import { Session } from '@supabase/supabase-js'

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
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  
  // Display name state (read-only)
  const [displayName, setDisplayName] = useState('')
  
  // Password states
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChecks, setPasswordChecks] = useState({
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    length: false,
  })

  // Add username states
  const [isChangingUsername, setIsChangingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const supabase = createClientComponentClient()
  const session = supabase.auth.getSession()

  // Load auth user data on component mount
  useEffect(() => {
    async function loadAuthUserData() {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Error loading auth user:', error)
        return
      }

      if (user) {
        setCurrentEmail(user.email || '')
        // For OAuth users, the display name might be in different places
        setDisplayName(
          user.user_metadata?.full_name || // Google OAuth
          user.user_metadata?.name || // GitHub OAuth
          user.user_metadata?.display_name || // Custom field
          ''
        )
      }
    }

    loadAuthUserData()
  }, [supabase.auth])

  // Add effect to check password requirements
  useEffect(() => {
    setPasswordChecks({
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
      length: newPassword.length >= 8,
    })
  }, [newPassword])

  // Username validation function
  const validateUsername = (username: string): boolean => {
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!validUsernameRegex.test(username)) {
      setUsernameError('Username can only contain letters, numbers, underscores, and hyphens')
      return false
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters long')
      return false
    }
    if (username.length > 20) {
      setUsernameError('Username must be less than 20 characters')
      return false
    }
    setUsernameError(null)
    return true
  }

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
        text: 'Please check both your current email address and your new email address. You need to confirm the change in both emails to complete the update.',
        type: 'info'
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

  const resetPasswordForm = () => {
    setIsChangingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  const handlePasswordUpdate = async () => {
    setMessage(null)
    
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match')
      }

      setIsSaving(true)

      // Get current user's email from auth
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.email) {
        throw new Error('Unable to verify current user')
      }

      // Verify current password using auth email
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
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

      // Reset form but keep message visible
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
      
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

  const resetUsernameForm = () => {
    setIsChangingUsername(false)
    setNewUsername('')
    setUsernameError(null)
    setMessage(null)
  }

  const handleUsernameUpdate = async () => {
    setMessage(null)
    
    try {
      if (!validateUsername(newUsername)) {
        return
      }

      if (newUsername === userData.username) {
        setUsernameError('New username must be different from current username')
        return
      }

      setIsSaving(true)

      // Update username directly using auth_id instead of id
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ 
          username: newUsername,
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', userData.auth_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating username:', updateError)
        if (updateError.code === '23505') {
          setUsernameError('Username is already taken')
          return
        }
        throw updateError
      }

      // Update local state with the new data
      userData.username = data.username
      
      setMessage({
        text: 'Username updated successfully!',
        type: 'success'
      })

      setNewUsername('')
      setIsChangingUsername(false)
      
      // Call the parent's update function if provided
      if (onSettingsUpdate) {
        onSettingsUpdate()
      }
    } catch (error) {
      console.error('Username update error:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred while updating username. Please check if you have permission to update your profile.'
      
      setMessage({
        text: errorMessage,
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

      {/* Display Name Section (Read-only) */}
      <div className="space-y-2">
        <Label>Account Username</Label>
        <p className="text-gray-400 text-sm mt-1">
          {displayName || 'No display name set'}
          {!displayName && ' (Set via OAuth provider)'}
        </p>
      </div>

      {/* Email Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Label>Email Address</Label>
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Label>Username</Label>
            <p className="text-gray-400 text-sm mt-1">{userData.username}</p>
          </div>
          {!isChangingUsername && (
            <Button
              onClick={() => setIsChangingUsername(true)}
              variant="outline"
              className="border-cyan-500/20 hover:bg-cyan-500/10"
            >
              Change Username
            </Button>
          )}
        </div>

        {isChangingUsername && (
          <div className="space-y-4 bg-gray-800/30 p-4 rounded-lg relative">
            <button
              onClick={resetUsernameForm}
              className="absolute top-2 right-2 p-1 hover:bg-gray-700/50 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="space-y-2">
              <Label htmlFor="new-username">New Username</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value)
                  validateUsername(e.target.value)
                }}
                className={cn(
                  "bg-gray-700/50 border-cyan-500/20",
                  usernameError && "border-red-500/50 focus:border-red-500"
                )}
                placeholder="Enter new username"
              />
              {usernameError && (
                <p className="text-sm text-red-400 mt-1">{usernameError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={resetUsernameForm}
                variant="outline"
                className="border-cyan-500/20"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUsernameUpdate}
                disabled={isSaving || !newUsername || !!usernameError}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
              >
                {isSaving ? 'Saving...' : 'Update Username'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Password Section */}
      <div className="flex justify-between items-center">
        <div>
          <Label>Password</Label>
          <p className="text-gray-400 text-sm mt-1">Update your account password</p>
        </div>
        {!isChangingPassword && (
          <Button
            onClick={() => setIsChangingPassword(true)}
            variant="outline"
            className="border-cyan-500/20 hover:bg-cyan-500/10"
          >
            Change Password
          </Button>
        )}
      </div>

      {isChangingPassword && (
        <div className="space-y-4 bg-gray-800/30 p-4 rounded-lg relative">
          <button
            onClick={resetPasswordForm}
            className="absolute top-2 right-2 p-1 hover:bg-gray-700/50 rounded-full"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

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
            <div className="space-y-4">
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-gray-700/50 border-cyan-500/20"
                placeholder="Enter new password"
              />
              
              <div className="w-full bg-gray-800/95 border border-cyan-500/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-300 mb-3">
                  Password Requirements:
                </p>
                {[
                  { label: 'Uppercase letter', check: passwordChecks.uppercase },
                  { label: 'Lowercase letter', check: passwordChecks.lowercase },
                  { label: 'Number', check: passwordChecks.number },
                  { label: 'Special character', check: passwordChecks.special },
                  { label: '8 characters or more', check: passwordChecks.length },
                ].map(({ label, check }) => (
                  <div 
                    key={label} 
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      check ? "text-green-400" : "text-gray-400"
                    )}
                  >
                    {check ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {label}
                  </div>
                ))}
              </div>
            </div>
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

          <div className="flex justify-end gap-2">
            <Button
              onClick={resetPasswordForm}
              variant="outline"
              className="border-cyan-500/20"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordUpdate}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
            >
              {isSaving ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 
