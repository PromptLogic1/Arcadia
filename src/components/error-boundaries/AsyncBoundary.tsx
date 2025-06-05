'use client';

import { Suspense, type ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AsyncBoundaryProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  loadingMessage?: string;
}

export function AsyncBoundary({
  children,
  loadingFallback,
  errorFallback,
  loadingMessage = 'Loading...',
}: AsyncBoundaryProps) {
  const defaultLoadingFallback = (
    <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
      <LoadingSpinner />
      <p className="text-sm text-gray-400">{loadingMessage}</p>
    </div>
  );

  return (
    <BaseErrorBoundary
      level="component"
      fallback={errorFallback}
      resetOnPropsChange
    >
      <Suspense fallback={loadingFallback || defaultLoadingFallback}>
        {children}
      </Suspense>
    </BaseErrorBoundary>
  );
}
