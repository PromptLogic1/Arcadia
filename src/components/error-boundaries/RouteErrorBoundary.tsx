'use client';

import { BaseErrorBoundary } from './BaseErrorBoundary';
import { usePathname } from 'next/navigation';
import type { ReactNode, ErrorInfo } from 'react';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
}

export function RouteErrorBoundary({
  children,
  routeName,
}: RouteErrorBoundaryProps) {
  const pathname = usePathname();

  // Reset error boundary when route changes
  const resetKey = pathname;

  const handleError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // Additional route-specific error handling
    console.error(`Route error in ${routeName || pathname}:`, {
      error,
      errorInfo,
      errorId,
      route: pathname,
    });
  };

  return (
    <BaseErrorBoundary
      level="page"
      onError={handleError}
      resetKeys={[resetKey]}
      resetOnPropsChange
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </BaseErrorBoundary>
  );
}
