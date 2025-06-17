'use client';

import React, { Suspense, useState } from 'react';
import { ThemeProvider } from './ui/ThemeProvider';
import { AuthProvider } from './auth/auth-provider';
import AuthLoader from './auth/auth-loader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BaseErrorBoundary } from './error-boundaries';
import { AriaAnnouncerProvider } from './accessibility/AriaLiveRegion';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with optimized configuration
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time for data freshness
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Cache time for inactive queries
            gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
            // Retry configuration
            retry: (failureCount, error: unknown) => {
              // Don't retry on 401/403 errors
              if (
                error !== null &&
                typeof error === 'object' &&
                'status' in error &&
                (error.status === 401 || error.status === 403)
              ) {
                return false;
              }
              return failureCount < 3;
            },
            // Refetch configuration
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations only on network errors
            retry: (failureCount, error: unknown) => {
              if (
                error !== null &&
                typeof error === 'object' &&
                'message' in error &&
                typeof error.message === 'string' &&
                error.message.includes('network')
              ) {
                return failureCount < 2;
              }
              return false;
            },
          },
        },
      })
  );

  return (
    <BaseErrorBoundary level="layout">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
          storageKey="arcadia-theme"
        >
          <AriaAnnouncerProvider>
            <BaseErrorBoundary level="component">
              <Suspense fallback={<AuthLoader />}>
                <AuthProvider>{children}</AuthProvider>
              </Suspense>
            </BaseErrorBoundary>
          </AriaAnnouncerProvider>
        </ThemeProvider>
        {/* Only show DevTools in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </BaseErrorBoundary>
  );
}
