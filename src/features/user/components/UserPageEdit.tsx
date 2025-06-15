'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/stores';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Info, AlertTriangle } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import {
  OptimizedAvatar as Avatar,
  OptimizedAvatarImage as AvatarImage,
  OptimizedAvatarFallback as AvatarFallback,
} from '@/components/ui/OptimizedAvatar';
import { useUserProfileEdit } from '../hooks/useUserProfileEdit';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import React from 'react';

/**
 * User Profile Edit Component
 *
 * Modern implementation using:
 * - TanStack Query for server state
 * - Zustand for UI state
 * - React Hook Form + Zod validation
 * - Service layer for API calls
 */
export default function UserPageEdit() {
  const { userData, isAuthenticated } = useAuth();
  const router = useRouter();

  // Modern hook combining all architecture layers
  const {
    profile,
    isLoading,
    error,
    form,
    isValid,
    isEditing,
    hasUnsavedChanges,
    showCancelDialog,
    isSubmitting,
    submitError,
    enterEditMode,
    handleSubmit,
    cancelEdit,
    confirmCancel,
  } = useUserProfileEdit({
    userId: userData?.id || '',
    onSaveSuccess: () => {
      router.push('/user');
    },
    onCancel: () => {
      router.push('/user');
    },
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // Auto-enter edit mode on component mount
  React.useEffect(() => {
    if (!isEditing && profile) {
      enterEditMode();
    }
  }, [isEditing, profile, enterEditMode]);

  // Authentication check
  if (!isAuthenticated || !userData) {
    router.push('/login');
    return null;
  }

  // Watch form values for Select components and avatar preview
  const profileVisibilityValue = watch('profile_visibility');
  const achievementsVisibilityValue = watch('achievements_visibility');
  const submissionsVisibilityValue = watch('submissions_visibility');
  const avatarUrlValue = watch('avatar_url');

  // Generate avatar URL for preview
  const previewAvatarUrl =
    avatarUrlValue ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile?.username || 'User'
    )}&background=0D1117&color=06B6D4&bold=true&size=128`;

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 rounded bg-gray-700"></div>
            <div className="h-64 rounded bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-4">
            <Info className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BaseErrorBoundary level="component">
      <>
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 flex items-center justify-between">
              <h1 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Edit Profile
              </h1>
              <Button
                variant="primary"
                onClick={cancelEdit}
                className="border-cyan-500/20 hover:bg-cyan-500/10"
              >
                Back to Profile
              </Button>
            </div>

            {submitError && (
              <div className="mb-6 flex items-start gap-2 rounded-lg bg-red-500/10 p-4">
                <Info className="h-5 w-5 text-red-400" />
                <p className="text-sm text-red-400">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-cyan-500/20 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="space-y-6 p-6">
                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-cyan-300">
                      Username *
                    </Label>
                    <Input
                      id="username"
                      {...register('username')}
                      className={cn(
                        'border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                        errors.username &&
                          'border-red-500/50 focus:border-red-500'
                      )}
                      placeholder="Enter your username"
                      disabled={isSubmitting}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-400">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-cyan-300">
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      {...register('full_name')}
                      className={cn(
                        'border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                        errors.full_name &&
                          'border-red-500/50 focus:border-red-500'
                      )}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-red-400">
                        {errors.full_name.message}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-cyan-300">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      className={cn(
                        'min-h-[100px] border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                        errors.bio && 'border-red-500/50 focus:border-red-500'
                      )}
                      placeholder="Tell us about yourself..."
                      disabled={isSubmitting}
                    />
                    {errors.bio && (
                      <p className="text-sm text-red-400">
                        {errors.bio.message}
                      </p>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-cyan-300">
                      City
                    </Label>
                    <Input
                      id="city"
                      {...register('city')}
                      className={cn(
                        'border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                        errors.city && 'border-red-500/50 focus:border-red-500'
                      )}
                      placeholder="Enter your city"
                      disabled={isSubmitting}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-400">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  {/* Region */}
                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-cyan-300">
                      Region/State
                    </Label>
                    <Input
                      id="region"
                      {...register('region')}
                      className={cn(
                        'border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                        errors.region &&
                          'border-red-500/50 focus:border-red-500'
                      )}
                      placeholder="Enter your region or state"
                      disabled={isSubmitting}
                    />
                    {errors.region && (
                      <p className="text-sm text-red-400">
                        {errors.region.message}
                      </p>
                    )}
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="land" className="text-cyan-300">
                      Country
                    </Label>
                    <Input
                      id="land"
                      {...register('land')}
                      className={cn(
                        'border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                        errors.land && 'border-red-500/50 focus:border-red-500'
                      )}
                      placeholder="Enter your country"
                      disabled={isSubmitting}
                    />
                    {errors.land && (
                      <p className="text-sm text-red-400">
                        {errors.land.message}
                      </p>
                    )}
                  </div>

                  {/* Avatar URL with Preview */}
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url" className="text-cyan-300">
                      Avatar URL
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          id="avatar_url"
                          {...register('avatar_url')}
                          className={cn(
                            'border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500',
                            errors.avatar_url &&
                              'border-red-500/50 focus:border-red-500'
                          )}
                          placeholder="https://example.com/avatar.jpg"
                          disabled={isSubmitting}
                        />
                        {errors.avatar_url && (
                          <p className="mt-1 text-sm text-red-400">
                            {errors.avatar_url.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className="mb-1 text-xs text-gray-400">
                          Preview
                        </div>
                        <div className="relative">
                          <Avatar
                            size="xl"
                            className="ring-2 ring-cyan-500/30 ring-offset-2 ring-offset-slate-900 transition-all duration-200 hover:ring-cyan-500/60"
                          >
                            <AvatarImage
                              src={previewAvatarUrl}
                              alt="Avatar preview"
                            />
                            <AvatarFallback className="bg-slate-800 font-bold text-cyan-400">
                              {profile?.username?.charAt(0).toUpperCase() ||
                                'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-4 border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-cyan-300">
                      Privacy Settings
                    </h3>

                    {/* Profile Visibility */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="profile_visibility"
                        className="text-cyan-300"
                      >
                        Profile Visibility
                      </Label>
                      <Select
                        value={profileVisibilityValue || 'public'}
                        onValueChange={(
                          value: 'public' | 'friends' | 'private'
                        ) => setValue('profile_visibility', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="profile_visibility"
                          className="border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500"
                        >
                          <SelectValue placeholder="Select profile visibility" />
                        </SelectTrigger>
                        <SelectContent className="border-cyan-500/20 bg-gray-800">
                          <SelectItem
                            value="public"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Public
                          </SelectItem>
                          <SelectItem
                            value="friends"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Friends Only
                          </SelectItem>
                          <SelectItem
                            value="private"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Private
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Achievements Visibility */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="achievements_visibility"
                        className="text-cyan-300"
                      >
                        Achievements Visibility
                      </Label>
                      <Select
                        value={achievementsVisibilityValue || 'public'}
                        onValueChange={(
                          value: 'public' | 'friends' | 'private'
                        ) => setValue('achievements_visibility', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="achievements_visibility"
                          className="border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500"
                        >
                          <SelectValue placeholder="Select achievements visibility" />
                        </SelectTrigger>
                        <SelectContent className="border-cyan-500/20 bg-gray-800">
                          <SelectItem
                            value="public"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Public
                          </SelectItem>
                          <SelectItem
                            value="friends"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Friends Only
                          </SelectItem>
                          <SelectItem
                            value="private"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Private
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Submissions Visibility */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="submissions_visibility"
                        className="text-cyan-300"
                      >
                        Submissions Visibility
                      </Label>
                      <Select
                        value={submissionsVisibilityValue || 'public'}
                        onValueChange={(
                          value: 'public' | 'friends' | 'private'
                        ) => setValue('submissions_visibility', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="submissions_visibility"
                          className="border-cyan-500/20 bg-gray-700/50 focus:border-fuchsia-500"
                        >
                          <SelectValue placeholder="Select submissions visibility" />
                        </SelectTrigger>
                        <SelectContent className="border-cyan-500/20 bg-gray-800">
                          <SelectItem
                            value="public"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Public
                          </SelectItem>
                          <SelectItem
                            value="friends"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Friends Only
                          </SelectItem>
                          <SelectItem
                            value="private"
                            className="text-white hover:bg-cyan-500/10"
                          >
                            Private
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {hasUnsavedChanges && (
                    <>
                      <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                      <span>Unsaved changes</span>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={cancelEdit}
                    disabled={isSubmitting}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className={cn(
                      'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white',
                      'transition-all duration-200 hover:opacity-90',
                      'shadow-lg shadow-cyan-500/25',
                      (isSubmitting || !isValid) &&
                        'cursor-not-allowed opacity-50'
                    )}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={() => {}}>
          <AlertDialogContent className="border-gray-700 bg-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                Unsaved Changes
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                You have unsaved changes that will be lost if you continue. Are
                you sure you want to cancel editing?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 hover:bg-gray-700">
                Keep Editing
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancel}
                className="bg-red-600 hover:bg-red-700"
              >
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </BaseErrorBoundary>
  );
}
