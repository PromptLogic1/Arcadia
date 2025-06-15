'use client';

import React, { lazy, Suspense } from 'react';
import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';
import { Skeleton } from '@/components/ui/Skeleton';

// Dynamic import for PlayAreaHub to reduce initial bundle size
const PlayAreaHub = lazy(() =>
  import('@/features/play-area/components/PlayAreaHub').then(module => ({
    default: module.PlayAreaHub,
  }))
);

export default function PlayAreaClientContent() {
  return (
    <RouteErrorBoundary routeName="PlayArea">
      <AsyncBoundary loadingMessage="Loading play area...">
        <Suspense
          fallback={
            <div className="container mx-auto p-6">
              <Skeleton className="mb-8 h-12 w-64" />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            </div>
          }
        >
          <PlayAreaHub />
        </Suspense>
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
