/**
 * User Profile Edit Hook
 *
 * Hook that combines all layers of the user profile edit architecture:
 * - Service Layer (userService)
 * - TanStack Query (server state)
 * - Zustand Store (UI state)
 * - React Hook Form (form state)
 *
 * Provides a clean, unified interface for user profile editing.
 */

import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useUserProfileData,
  useUpdateUserProfileMutation,
} from '@/hooks/queries/useUserProfileQueries';
import { useUserProfileEditState } from '@/lib/stores/user-profile-store';
import { notifications } from '@/lib/notifications';
import type { Database } from '@/types/database-generated';

type UserProfile = Database['public']['Tables']['users']['Row'];

// Form validation schema
const userProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'
    ),
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(50, 'Full name must be at most 50 characters')
    .optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  city: z.string().max(100, 'City must be at most 100 characters').optional(),
  region: z
    .string()
    .max(100, 'Region must be at most 100 characters')
    .optional(),
  land: z
    .string()
    .max(100, 'Country must be at most 100 characters')
    .optional(),
  avatar_url: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  profile_visibility: z.enum(['public', 'friends', 'private']).optional(),
  achievements_visibility: z.enum(['public', 'friends', 'private']).optional(),
  submissions_visibility: z.enum(['public', 'friends', 'private']).optional(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

export interface UseUserProfileEditProps {
  userId: string;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export interface UseUserProfileEditReturn {
  // Profile data
  profile: UserProfile | null | undefined;
  isLoading: boolean;
  error: string | undefined;

  // Form state
  form: ReturnType<typeof useForm<UserProfileFormData>>;
  isValid: boolean;
  isDirty: boolean;

  // Edit state
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  showCancelDialog: boolean;

  // Submission state
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  submitError: string | undefined;

  // Actions
  enterEditMode: () => void;
  exitEditMode: () => void;
  saveChanges: (data: UserProfileFormData) => Promise<void>;
  cancelEdit: () => void;
  confirmCancel: () => void;
  resetForm: () => void;

  // Form handlers
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

/**
 * User profile edit hook
 */
export function useUserProfileEdit({
  userId,
  onSaveSuccess,
  onCancel,
}: UseUserProfileEditProps): UseUserProfileEditReturn {
  // Server state
  const { profile, isLoading, error, refetchProfile } =
    useUserProfileData(userId);

  // UI state
  const {
    editForm,
    enterEditMode,
    exitEditMode,
    setHasUnsavedChanges,
    setShowCancelDialog,
  } = useUserProfileEditState();

  // Mutations
  const updateProfileMutation = useUpdateUserProfileMutation();

  // Form setup
  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      username: '',
      full_name: '',
      bio: '',
      city: '',
      region: '',
      land: '',
      avatar_url: '',
      profile_visibility: 'public',
      achievements_visibility: 'public',
      submissions_visibility: 'public',
    },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = form;

  // Watch for form changes to update unsaved changes state
  useEffect(() => {
    if (editForm.isEditing) {
      setHasUnsavedChanges(isDirty);
    }
  }, [isDirty, editForm.isEditing, setHasUnsavedChanges]);

  // Initialize form with profile data
  useEffect(() => {
    if (profile && !editForm.isEditing) {
      reset({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        region: profile.region || '',
        land: profile.land || '',
        avatar_url: profile.avatar_url || '',
        profile_visibility: profile.profile_visibility || 'public',
        achievements_visibility: profile.achievements_visibility || 'public',
        submissions_visibility: profile.submissions_visibility || 'public',
      });
    }
  }, [profile, reset, editForm.isEditing]);

  // Enter edit mode
  const handleEnterEditMode = useCallback(() => {
    if (profile) {
      reset({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        region: profile.region || '',
        land: profile.land || '',
        avatar_url: profile.avatar_url || '',
        profile_visibility: profile.profile_visibility || 'public',
        achievements_visibility: profile.achievements_visibility || 'public',
        submissions_visibility: profile.submissions_visibility || 'public',
      });
      enterEditMode();
    }
  }, [profile, reset, enterEditMode]);

  // Save changes
  const saveChanges = useCallback(
    async (data: UserProfileFormData) => {
      try {
        const result = await updateProfileMutation.mutateAsync({
          userId,
          updates: {
            username: data.username,
            full_name: data.full_name || null,
            bio: data.bio || null,
            city: data.city || null,
            region: data.region || null,
            land: data.land || null,
            avatar_url: data.avatar_url || null,
            profile_visibility: data.profile_visibility || null,
            achievements_visibility: data.achievements_visibility || null,
            submissions_visibility: data.submissions_visibility || null,
          },
        });

        if (
          result &&
          typeof result === 'object' &&
          'error' in result &&
          result.error
        ) {
          throw new Error(result.error as string);
        }

        // Success
        notifications.success('Profile updated successfully!');
        exitEditMode();
        setHasUnsavedChanges(false);
        await refetchProfile();
        onSaveSuccess?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update profile';
        notifications.error(errorMessage);
        throw error;
      }
    },
    [
      userId,
      updateProfileMutation,
      exitEditMode,
      setHasUnsavedChanges,
      refetchProfile,
      onSaveSuccess,
    ]
  );

  // Cancel edit
  const cancelEdit = useCallback(() => {
    if (editForm.hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      exitEditMode();
      if (profile) {
        reset({
          username: profile.username || '',
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          city: profile.city || '',
          region: profile.region || '',
          land: profile.land || '',
          avatar_url: profile.avatar_url || '',
          profile_visibility: profile.profile_visibility || 'public',
          achievements_visibility: profile.achievements_visibility || 'public',
          submissions_visibility: profile.submissions_visibility || 'public',
        });
      }
      onCancel?.();
    }
  }, [
    editForm.hasUnsavedChanges,
    setShowCancelDialog,
    exitEditMode,
    profile,
    reset,
    onCancel,
  ]);

  // Confirm cancel
  const confirmCancel = useCallback(() => {
    setShowCancelDialog(false);
    exitEditMode();
    setHasUnsavedChanges(false);
    if (profile) {
      reset({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        region: profile.region || '',
        land: profile.land || '',
        avatar_url: profile.avatar_url || '',
        profile_visibility: profile.profile_visibility || 'public',
        achievements_visibility: profile.achievements_visibility || 'public',
        submissions_visibility: profile.submissions_visibility || 'public',
      });
    }
    onCancel?.();
  }, [
    setShowCancelDialog,
    exitEditMode,
    setHasUnsavedChanges,
    profile,
    reset,
    onCancel,
  ]);

  // Reset form
  const resetForm = useCallback(() => {
    if (profile) {
      reset({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        region: profile.region || '',
        land: profile.land || '',
        avatar_url: profile.avatar_url || '',
        profile_visibility: profile.profile_visibility || 'public',
        achievements_visibility: profile.achievements_visibility || 'public',
        submissions_visibility: profile.submissions_visibility || 'public',
      });
    }
    setHasUnsavedChanges(false);
  }, [profile, reset, setHasUnsavedChanges]);

  // Form submit handler
  const onSubmit = handleSubmit(async data => {
    await saveChanges(data);
  });

  return {
    // Profile data
    profile,
    isLoading,
    error,

    // Form state
    form,
    isValid,
    isDirty,

    // Edit state
    isEditing: editForm.isEditing,
    hasUnsavedChanges: editForm.hasUnsavedChanges,
    showCancelDialog: editForm.showCancelDialog,

    // Submission state
    isSubmitting: updateProfileMutation.isPending,
    isSubmitSuccess: updateProfileMutation.isSuccess,
    submitError: updateProfileMutation.error?.message,

    // Actions
    enterEditMode: handleEnterEditMode,
    exitEditMode,
    saveChanges,
    cancelEdit,
    confirmCancel,
    resetForm,

    // Form handlers
    handleSubmit: onSubmit,
  };
}
