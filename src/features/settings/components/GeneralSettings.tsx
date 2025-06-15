'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/lib/stores';
import { SETTINGS_CONSTANTS } from './constants';
import { SettingsMessage } from './ui/SettingsMessage';
import { EmailUpdateSection } from './sections/EmailUpdateSection';
import { PasswordUpdateSection } from './sections/PasswordUpdateSection';
import { useSettings } from '../hooks/useSettings';

/**
 * GeneralSettings Component
 *
 * A modular implementation of the GeneralSettings component
 * following modern React patterns:
 *
 * ✅ Custom Hooks for business logic separation
 * ✅ Compound Component pattern for related components
 * ✅ React Hook Form integration with Zod validation
 * ✅ Constants extraction for maintainability
 * ✅ Reusable UI components
 * ✅ Type-safe implementation
 * ✅ Single Responsibility Principle
 * ✅ Performance optimized with proper hook usage
 */
export function GeneralSettings() {
  const { userData, authUser, isAuthenticated } = useAuth();
  const router = useRouter();

  // Modern settings hook - replaces legacy useEmailUpdate and usePasswordUpdate
  const settings = useSettings();

  // Redirect if not authenticated
  if (!isAuthenticated || !userData) {
    router.push('/login');
    return null;
  }

  const currentEmail = authUser?.email || '';

  // Determine which message to show (email or password success states)
  const getDisplayMessage = () => {
    if (settings.showPasswordSuccess) {
      return {
        text: SETTINGS_CONSTANTS.MESSAGES.PASSWORD_UPDATE_SUCCESS,
        type: 'success' as const,
      };
    }
    if (settings.showEmailSuccess) {
      return {
        text: SETTINGS_CONSTANTS.MESSAGES.EMAIL_UPDATE_SUCCESS,
        type: 'success' as const,
      };
    }
    return null;
  };

  const displayMessage = getDisplayMessage();

  return (
    <div className="space-y-6">
      {/* Global Message Display */}
      {displayMessage && (
        <SettingsMessage message={displayMessage} className="animate-fade-in" />
      )}

      {/* Account Username Section (Read-only) */}
      <div className="space-y-2">
        <Label>{SETTINGS_CONSTANTS.LABELS.ACCOUNT_USERNAME}</Label>
        <p className="mt-1 text-sm text-gray-400">{userData.username}</p>
      </div>

      {/* Email Update Section */}
      <EmailUpdateSection currentEmail={currentEmail} />

      {/* Password Update Section */}
      <PasswordUpdateSection />
    </div>
  );
}
