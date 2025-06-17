'use client';

import React, { Suspense } from 'react';
import { RootErrorBoundary } from './RootErrorBoundary';

export function SafeRootWrapper({ children }: { children: React.ReactNode }) {
  // Wrap in Suspense to handle async loading issues
  return (
    <Suspense fallback={null}>
      <RootErrorBoundary>{children}</RootErrorBoundary>
    </Suspense>
  );
}
