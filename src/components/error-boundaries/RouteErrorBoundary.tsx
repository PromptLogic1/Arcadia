'use client';

import { BaseErrorBoundary } from './BaseErrorBoundary';
import { usePathname } from 'next/navigation';
import { log } from '@/lib/logger';
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
    log.error(`Route error in ${routeName || pathname}`, error, {
      metadata: {
        component: 'RouteErrorBoundary',
        errorInfo,
        errorId,
        route: pathname,
        routeName,
      },
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
