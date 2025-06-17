'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadIcon as Upload,
  X,
  CameraIcon as Camera,
} from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import {
  OptimizedAvatar as Avatar,
  OptimizedAvatarFallback as AvatarFallback,
  OptimizedAvatarImage as AvatarImage,
} from '@/components/ui/OptimizedAvatar';
import { notifications } from '@/lib/notifications';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import { log } from '@/lib/logger';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  username?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function AvatarUpload({
  currentAvatarUrl,
  username = 'User',
  onUpload,
  onRemove,
  disabled = false,
  size = 'xl',
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input value to allow re-selecting the same file
      e.target.value = '';

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        notifications.error(
          'Please upload a valid image file (JPEG, PNG, or WebP)'
        );
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        notifications.error('Image size must be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      setIsUploading(true);
      try {
        await onUpload(file);
        notifications.success('Avatar updated successfully!');
        log.info('Avatar uploaded', {
          metadata: { uploadFilename: file.name, size: file.size },
        });
      } catch (error) {
        notifications.error('Failed to upload avatar. Please try again.');
        log.error('Avatar upload failed', error);
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const handleRemove = useCallback(async () => {
    if (!onRemove) return;

    setIsUploading(true);
    try {
      await onRemove();
      setPreviewUrl(null);
      notifications.success('Avatar removed successfully!');
    } catch (error) {
      notifications.error('Failed to remove avatar. Please try again.');
      log.error('Avatar removal failed', error);
    } finally {
      setIsUploading(false);
    }
  }, [onRemove]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const displayUrl =
    previewUrl ||
    currentAvatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D1117&color=06B6D4&bold=true&size=200`;

  return (
    <BaseErrorBoundary level="component">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar size={size} className="ring-4 ring-gray-700">
            <AvatarImage src={displayUrl} alt={`${username}'s avatar`} />
            <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-500" />
            </div>
          )}

          <button
            onClick={handleClick}
            disabled={disabled || isUploading}
            className="absolute right-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 p-2 text-white shadow-lg transition-all hover:from-cyan-600 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Upload avatar"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
          aria-label="Avatar file input"
        />

        <div className="flex gap-2">
          <Button
            onClick={handleClick}
            disabled={disabled || isUploading}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </Button>

          {currentAvatarUrl && onRemove && (
            <Button
              onClick={handleRemove}
              disabled={disabled || isUploading}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-400">Max 5MB • JPEG, PNG, or WebP</p>
      </div>
    </BaseErrorBoundary>
  );
}
