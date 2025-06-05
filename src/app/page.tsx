'use client';

import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RouteErrorBoundary } from '@/components/error-boundaries';

// Page Configuration
export const runtime = 'edge';
export const preferredRegion = 'auto';
export const dynamic = 'force-dynamic';

// Lazy Loading of Landing Page
const LandingPage = lazy(
  () => import('@/src/features/landing/components/index')
);

export default function Home() {
  return (
    <RouteErrorBoundary routeName="Home">
      <Suspense fallback={<LoadingSpinner />}>
        <LandingPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}
