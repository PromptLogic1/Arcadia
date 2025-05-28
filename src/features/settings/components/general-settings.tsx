'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useAuthActions } from '@/lib/stores';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

export function GeneralSettings() {
  const { userData, authUser, isAuthenticated } = useAuth();
  const { updateEmail, signIn, updatePassword, checkPasswordRequirements } =
    useAuthActions();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Email states
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [currentEmail] = useState(authUser?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  // Password states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Use Zustand auth store for password checks
  const passwordChecks = checkPasswordRequirements(newPassword);

  // Redirect if not authenticated
  if (!isAuthenticated || !userData) {
    router.push('/login');
    return null;
  }

  // Form reset functions
  const resetEmailForm = () => {
    setIsChangingEmail(false);
    setNewEmail('');
    setConfirmEmail('');
    setMessage(null);
  };

  const resetPasswordForm = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
  };

  // Handle form submissions
  const handleEmailUpdate = async () => {
    setMessage(null);

    try {
      if (newEmail !== confirmEmail) {
        throw new Error('New email addresses do not match');
      }

      if (newEmail === currentEmail) {
        throw new Error('New email must be different from current email');
      }

      setIsSaving(true);

      await updateEmail(newEmail);

      setMessage({
        text: 'Email update initiated! Please check both your current and new email addresses for confirmation links. You need to confirm the change in both emails to complete the update.',
        type: 'success',
      });

      // Show additional info after 3 seconds
      setTimeout(() => {
        notifications.info(
          "Tip: If you don't see the confirmation emails, please check your spam folder."
        );
      }, 3000);

      resetEmailForm();
    } catch (error) {
      logger.error('Email update failed', error as Error, {
        component: 'GeneralSettings',
        metadata: { userId: userData.id, newEmail },
      });
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : 'An error occurred while updating email',
        type: 'error',
      });
      notifications.error('Failed to update email', {
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or contact support.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setMessage(null);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      setIsSaving(true);

      // Verify current password
      const verifyResult = await signIn({
        email: currentEmail,
        password: currentPassword,
      });

      if (verifyResult.error) {
        throw new Error('Current password is incorrect');
      }

      const updateResult = await updatePassword(newPassword);

      if (updateResult.error) throw updateResult.error;

      setMessage({
        text: 'Password updated successfully! Your account is now more secure.',
        type: 'success',
      });

      // Show additional info after 3 seconds
      setTimeout(() => {
        setMessage({
          text: 'Remember to use a strong password and update it regularly.',
          type: 'info', // Optional: You can keep this for additional info
        });
      }, 3000);

      resetPasswordForm();
    } catch (error) {
      logger.error('Password update failed', error as Error, {
        component: 'GeneralSettings',
        metadata: { userId: userData.id },
      });
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : 'An error occurred while updating password',
        type: 'error',
      });
      notifications.error('Failed to update password', {
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or contact support.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={cn('flex items-start gap-2 rounded-lg p-4', {
            'border-green-500/20 bg-green-500/10': message.type === 'success',
            'border-red-500/20 bg-red-500/10': message.type === 'error',
            'border-blue-500/20 bg-blue-500/10': message.type === 'info',
          })}
        >
          <Info
            className={cn('mt-0.5 h-5 w-5 flex-shrink-0', {
              'text-green-400': message.type === 'success',
              'text-red-400': message.type === 'error',
              'text-blue-400': message.type === 'info',
            })}
          />
          <p
            className={cn('text-sm', {
              'text-green-400': message.type === 'success',
              'text-red-400': message.type === 'error',
              'text-blue-400': message.type === 'info',
            })}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Display Name Section (Read-only) */}
      <div className="space-y-2">
        <Label>Account Username</Label>
        <p className="mt-1 text-sm text-gray-400">{userData.username}</p>
      </div>

      {/* Email Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Email Address</Label>
            <p className="mt-1 text-sm text-gray-400">{currentEmail}</p>
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
          <div className="relative space-y-4 rounded-lg bg-gray-800/30 p-4">
            <button
              onClick={resetEmailForm}
              className="absolute right-2 top-2 rounded-full p-1 hover:bg-gray-700/50"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>

            <div className="flex items-start rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div className="space-y-1">
                  <h4 className="font-medium text-yellow-500">
                    Important Information
                  </h4>
                  <p className="text-sm text-yellow-200/80">
                    You will need to confirm this change in both your current
                    and new email addresses. Please check both inboxes for
                    confirmation links to complete the update.
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
                onChange={e => setNewEmail(e.target.value)}
                className="border-cyan-500/20 bg-gray-700/50"
                placeholder="Enter new email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirm New Email Address</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
                className="border-cyan-500/20 bg-gray-700/50"
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
      <div className="flex items-center justify-between">
        <div>
          <Label>Password</Label>
          <p className="mt-1 text-sm text-gray-400">
            Update your account password
          </p>
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
        <div className="relative space-y-4 rounded-lg bg-gray-800/30 p-4">
          <button
            onClick={resetPasswordForm}
            className="absolute right-2 top-2 rounded-full p-1 hover:bg-gray-700/50"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>

          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="border-cyan-500/20 bg-gray-700/50"
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
                onChange={e => setNewPassword(e.target.value)}
                className="border-cyan-500/20 bg-gray-700/50"
                placeholder="Enter new password"
              />

              <div className="w-full space-y-2 rounded-lg border border-cyan-500/20 bg-gray-800/95 p-4">
                <p className="mb-3 text-sm font-medium text-gray-300">
                  Password Requirements:
                </p>
                {[
                  {
                    label: 'Uppercase letter',
                    check: passwordChecks.uppercase,
                  },
                  {
                    label: 'Lowercase letter',
                    check: passwordChecks.lowercase,
                  },
                  { label: 'Number', check: passwordChecks.number },
                  { label: 'Special character', check: passwordChecks.special },
                  {
                    label: '8 characters or more',
                    check: passwordChecks.length,
                  },
                ].map(({ label, check }) => (
                  <div
                    key={label}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      check ? 'text-green-400' : 'text-gray-400'
                    )}
                  >
                    {check ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
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
              onChange={e => setConfirmPassword(e.target.value)}
              className="border-cyan-500/20 bg-gray-700/50"
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
              disabled={
                isSaving || !currentPassword || !newPassword || !confirmPassword
              }
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
            >
              {isSaving ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
