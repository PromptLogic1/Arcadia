'use client';

import dynamic from 'next/dynamic';
import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';

// Dynamically import the UserPageEdit component
const UserPageEdit = dynamic(
  () => import('@/features/user/components/UserPageEdit'),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    ),
    ssr: false,
  }
);

export default function EditProfilePage() {
  return (
    <RouteErrorBoundary routeName="EditProfile">
      <div className="min-h-screen bg-gray-900 text-white">
        <AsyncBoundary loadingMessage="Loading profile editor...">
          <UserPageEdit />
        </AsyncBoundary>
      </div>
    </RouteErrorBoundary>
  );
}
