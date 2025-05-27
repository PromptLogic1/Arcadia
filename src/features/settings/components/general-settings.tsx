'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth, useAuthActions } from '@/src/lib/stores'
import { useRouter } from 'next/navigation'

export function GeneralSettings() {
  const { userData, authUser, isAuthenticated } = useAuth()
  const { updateEmail, signIn, updatePassword, checkPasswordRequirements } = useAuthActions()
  const router = useRouter()

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Email states
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [currentEmail, _setCurrentEmail] = useState(authUser?.email || '')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  
  // Password states
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Use Zustand auth store for password checks
  const passwordChecks = checkPasswordRequirements(newPassword)

  // Redirect if not authenticated
  if (!isAuthenticated || !userData) {
    router.push('/login')
    return null
  }
  
  // Form reset functions
  const resetEmailForm = () => {
    setIsChangingEmail(false)
    setNewEmail('')
    setConfirmEmail('')
    setMessage(null)
  }

  const resetPasswordForm = () => {
    setIsChangingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  // Handle form submissions
  const handleEmailUpdate = async () => {
    setMessage(null)
    
    try {
      if (newEmail !== confirmEmail) {
        throw new Error('New email addresses do not match')
      }

      if (newEmail === currentEmail) {
        throw new Error('New email must be different from current email')
      }

      setIsSaving(true)

      await updateEmail(newEmail)

      setMessage({
        text: 'Email update initiated! Please check both your current and new email addresses for confirmation links. You need to confirm the change in both emails to complete the update.',
        type: 'success'
      })

      // Show additional info after 3 seconds
      setTimeout(() => {
        setMessage({
          text: 'Tip: If you don\'t see the confirmation emails, please check your spam folder.',
          type: 'info'
        })
      }, 3000)

      resetEmailForm()
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

  const handlePasswordUpdate = async () => {
    setMessage(null)
    
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match')
      }

      setIsSaving(true)

      // Verify current password
      const verifyResult = await signIn({
        email: currentEmail,
        password: currentPassword,
      })

      if (verifyResult.error) {
        throw new Error('Current password is incorrect')
      }

      const updateResult = await updatePassword(newPassword)

      if (updateResult.error) throw updateResult.error

      setMessage({
        text: 'Password updated successfully! Your account is now more secure.',
        type: 'success'
      })

      // Show additional info after 3 seconds
      setTimeout(() => {
        setMessage({
          text: 'Remember to use a strong password and update it regularly.',
          type: 'info' // Optional: You can keep this for additional info
        });
      }, 3000);

      resetPasswordForm()
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

      {/* Display Name Section (Read-only) */}
      <div className="space-y-2">
        <Label>Account Username</Label>
        <p className="text-gray-400 text-sm mt-1">
          {authUser?.auth_username}
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

            <div className="flex items-start p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-yellow-500">
                    Important Information
                  </h4>
                  <p className="text-sm text-yellow-200/80">
                    You will need to confirm this change in both your current and new email addresses. 
                    Please check both inboxes for confirmation links to complete the update.
                  </p>
                </div>
              </div>
            </div>

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
