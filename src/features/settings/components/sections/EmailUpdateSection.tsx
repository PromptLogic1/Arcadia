import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { X, Info } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { SETTINGS_CONSTANTS } from '../constants';
import { useSettings } from '../../hooks/useSettings';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import { log } from '@/lib/logger';

// Zod schema for email update validation
const emailUpdateSchema = z
  .object({
    newEmail: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format'),
    confirmEmail: z
      .string()
      .min(1, 'Email confirmation is required')
      .email('Invalid email format'),
  })
  .refine(data => data.newEmail === data.confirmEmail, {
    message: SETTINGS_CONSTANTS.ERRORS.EMAIL_MISMATCH,
    path: ['confirmEmail'],
  });

type EmailUpdateFormData = z.infer<typeof emailUpdateSchema>;

interface EmailUpdateSectionProps {
  currentEmail: string;
}

export function EmailUpdateSection({ currentEmail }: EmailUpdateSectionProps) {
  // Modern settings hook
  const settings = useSettings();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmailUpdateFormData>({
    resolver: zodResolver(emailUpdateSchema),
    defaultValues: {
      newEmail: '',
      confirmEmail: '',
    },
  });

  const onSubmit = async (data: EmailUpdateFormData) => {
    try {
      await settings.handleEmailUpdate(data);
      reset(); // Reset form after successful submission
    } catch (error) {
      // Error handling is done by the modern hook
      log.error('Email update failed', error, {
        metadata: {
          component: 'EmailUpdateSection',
          method: 'onSubmit',
        },
      });
    }
  };

  const handleCancel = () => {
    reset();
    settings.resetEmailForm();
  };

  const isLoading = isSubmitting || settings.isUpdatingEmail;

  return (
    <BaseErrorBoundary level="component">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>{SETTINGS_CONSTANTS.LABELS.EMAIL_ADDRESS}</Label>
            <p className="mt-1 text-sm text-gray-400">{currentEmail}</p>
          </div>
          {!settings.isChangingEmail && (
            <Button
              onClick={() => settings.setIsChangingEmail(true)}
              variant="secondary"
              className={SETTINGS_CONSTANTS.STYLES.BUTTON_OUTLINE}
            >
              {SETTINGS_CONSTANTS.BUTTONS.CHANGE_EMAIL}
            </Button>
          )}
        </div>

        {settings.isChangingEmail && (
          <div className={SETTINGS_CONSTANTS.STYLES.SECTION_CONTAINER}>
            <button
              onClick={handleCancel}
              className={SETTINGS_CONSTANTS.STYLES.CLOSE_BUTTON}
              disabled={isLoading}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>

            {/* Important Information Banner */}
            <div className="flex items-start rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div className="space-y-1">
                  <h4 className="font-medium text-yellow-500">
                    {SETTINGS_CONSTANTS.MESSAGES.IMPORTANT_INFO_TITLE}
                  </h4>
                  <p className="text-sm text-yellow-200/80">
                    {SETTINGS_CONSTANTS.MESSAGES.EMAIL_CONFIRMATION_INFO}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={SETTINGS_CONSTANTS.FIELDS.NEW_EMAIL}>
                  {SETTINGS_CONSTANTS.LABELS.NEW_EMAIL}
                </Label>
                <Input
                  id={SETTINGS_CONSTANTS.FIELDS.NEW_EMAIL}
                  type="email"
                  {...register('newEmail')}
                  className={cn(
                    SETTINGS_CONSTANTS.STYLES.INPUT_STYLE,
                    errors.newEmail &&
                      'border-red-500/50 focus:border-red-500/70'
                  )}
                  placeholder={SETTINGS_CONSTANTS.PLACEHOLDERS.NEW_EMAIL}
                  disabled={isLoading}
                />
                {errors.newEmail && (
                  <p className="text-xs text-red-400">
                    {errors.newEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={SETTINGS_CONSTANTS.FIELDS.CONFIRM_EMAIL}>
                  {SETTINGS_CONSTANTS.LABELS.CONFIRM_EMAIL}
                </Label>
                <Input
                  id={SETTINGS_CONSTANTS.FIELDS.CONFIRM_EMAIL}
                  type="email"
                  {...register('confirmEmail')}
                  className={cn(
                    SETTINGS_CONSTANTS.STYLES.INPUT_STYLE,
                    errors.confirmEmail &&
                      'border-red-500/50 focus:border-red-500/70'
                  )}
                  placeholder={SETTINGS_CONSTANTS.PLACEHOLDERS.CONFIRM_EMAIL}
                  disabled={isLoading}
                />
                {errors.confirmEmail && (
                  <p className="text-xs text-red-400">
                    {errors.confirmEmail.message}
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
                    : SETTINGS_CONSTANTS.BUTTONS.UPDATE_EMAIL}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </BaseErrorBoundary>
  );
}
