'use client';

import React from 'react';
import { GeneralSettings } from './GeneralSettings';
import { useAuth } from '@/lib/stores/auth-store';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsComponent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-8 h-10 w-64" />
          <div className="space-y-6">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-semibold text-gray-100">
            Authentication Required
          </h2>
          <p className="text-gray-400">
            Please log in to access your account settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Account Settings</h1>
        <GeneralSettings />
      </div>
    </div>
  );
}
