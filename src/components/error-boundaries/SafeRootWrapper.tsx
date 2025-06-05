'use client';

import { RootErrorBoundary } from './RootErrorBoundary';
import { Suspense } from 'react';

export function SafeRootWrapper({ children }: { children: React.ReactNode }) {
  // Wrap in Suspense to handle async loading issues
  return (
    <Suspense fallback={null}>
      <RootErrorBoundary>{children}</RootErrorBoundary>
    </Suspense>
  );
}