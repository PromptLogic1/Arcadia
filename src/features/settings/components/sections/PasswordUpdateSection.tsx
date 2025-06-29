import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { X } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { SETTINGS_CONSTANTS, type PasswordCheck } from '../constants';
import { useSettings } from '../../hooks/useSettings';
import { PasswordRequirements } from '../ui/PasswordRequirements';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import { log } from '@/lib/logger';

// Zod schema for password update validation
const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: SETTINGS_CONSTANTS.ERRORS.PASSWORD_MISMATCH,
    path: ['confirmPassword'],
  });

type PasswordUpdateFormData = z.infer<typeof passwordUpdateSchema>;

export function PasswordUpdateSection() {
  // Modern settings hook
  const settings = useSettings();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<PasswordUpdateFormData>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword', '');
  const passwordValidation = settings.validatePassword(newPassword);
  const passwordChecks: PasswordCheck = {
    uppercase: passwordValidation.requirements.hasUppercase,
    lowercase: passwordValidation.requirements.hasLowercase,
    number: passwordValidation.requirements.hasNumber,
    special: passwordValidation.requirements.hasSpecialChar,
    length: passwordValidation.requirements.minLength,
  };

  const onSubmit = async (data: PasswordUpdateFormData) => {
    try {
      await settings.handlePasswordUpdate(data);
      reset(); // Reset form after successful submission
    } catch (error) {
      // Error handling is done by the modern hook
      log.error('Password update failed', error, {
        metadata: {
          component: 'PasswordUpdateSection',
          method: 'onSubmit',
        },
      });
    }
  };

  const handleCancel = () => {
    reset();
    settings.resetPasswordForm();
  };

  const isLoading = isSubmitting || settings.isUpdatingPassword;

  return (
    <BaseErrorBoundary level="component">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>{SETTINGS_CONSTANTS.LABELS.PASSWORD}</Label>
            <p className="mt-1 text-sm text-gray-400">
              {SETTINGS_CONSTANTS.MESSAGES.PASSWORD_DESCRIPTION}
            </p>
          </div>
          {!settings.isChangingPassword && (
            <Button
              onClick={() => settings.setIsChangingPassword(true)}
              variant="secondary"
              className={SETTINGS_CONSTANTS.STYLES.BUTTON_OUTLINE}
            >
              {SETTINGS_CONSTANTS.BUTTONS.CHANGE_PASSWORD}
            </Button>
          )}
        </div>

        {settings.isChangingPassword && (
          <div className={SETTINGS_CONSTANTS.STYLES.SECTION_CONTAINER}>
            <button
              onClick={handleCancel}
              className={SETTINGS_CONSTANTS.STYLES.CLOSE_BUTTON}
              disabled={isLoading}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={SETTINGS_CONSTANTS.FIELDS.CURRENT_PASSWORD}>
                  {SETTINGS_CONSTANTS.LABELS.CURRENT_PASSWORD}
                </Label>
                <Input
                  id={SETTINGS_CONSTANTS.FIELDS.CURRENT_PASSWORD}
                  type="password"
                  {...register('currentPassword')}
                  className={cn(
                    SETTINGS_CONSTANTS.STYLES.INPUT_STYLE,
                    errors.currentPassword &&
                      'border-red-500/50 focus:border-red-500/70'
                  )}
                  placeholder={SETTINGS_CONSTANTS.PLACEHOLDERS.CURRENT_PASSWORD}
                  disabled={isLoading}
                />
                {errors.currentPassword && (
                  <p className="text-xs text-red-400">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={SETTINGS_CONSTANTS.FIELDS.NEW_PASSWORD}>
                  {SETTINGS_CONSTANTS.LABELS.NEW_PASSWORD}
                </Label>
                <div className="space-y-4">
                  <Input
                    id={SETTINGS_CONSTANTS.FIELDS.NEW_PASSWORD}
                    type="password"
                    {...register('newPassword')}
                    className={cn(
                      SETTINGS_CONSTANTS.STYLES.INPUT_STYLE,
                      errors.newPassword &&
                        'border-red-500/50 focus:border-red-500/70'
                    )}
                    placeholder={SETTINGS_CONSTANTS.PLACEHOLDERS.NEW_PASSWORD}
                    disabled={isLoading}
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-red-400">
                      {errors.newPassword.message}
                    </p>
                  )}

                  {/* Password Requirements Component */}
                  <PasswordRequirements passwordChecks={passwordChecks} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={SETTINGS_CONSTANTS.FIELDS.CONFIRM_PASSWORD}>
                  {SETTINGS_CONSTANTS.LABELS.CONFIRM_PASSWORD}
                </Label>
                <Input
                  id={SETTINGS_CONSTANTS.FIELDS.CONFIRM_PASSWORD}
                  type="password"
                  {...register('confirmPassword')}
                  className={cn(
                    SETTINGS_CONSTANTS.STYLES.INPUT_STYLE,
                    errors.confirmPassword &&
                      'border-red-500/50 focus:border-red-500/70'
                  )}
                  placeholder={SETTINGS_CONSTANTS.PLACEHOLDERS.CONFIRM_PASSWORD}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="secondary"
                  className={SETTINGS_CONSTANTS.STYLES.BUTTON_OUTLINE}
                  disabled={isLoading}
                >
                  {SETTINGS_CONSTANTS.BUTTONS.CANCEL}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={SETTINGS_CONSTANTS.STYLES.BUTTON_PRIMARY}
                >
                  {isLoading
                    ? SETTINGS_CONSTANTS.BUTTONS.SAVING
                    : SETTINGS_CONSTANTS.BUTTONS.UPDATE_PASSWORD}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </BaseErrorBoundary>
  );
}
