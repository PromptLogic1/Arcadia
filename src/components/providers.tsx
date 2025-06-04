'use client';

import { ThemeProvider } from './ui/theme-provider';
import { AuthProvider } from './auth/auth-provider';
import { Suspense } from 'react';
import AuthLoader from './auth/auth-loader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

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
              const errorWithStatus = error as { status?: number };
              if (errorWithStatus?.status === 401 || errorWithStatus?.status === 403) {
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
              const errorWithMessage = error as { message?: string };
              if (errorWithMessage?.message?.includes('network')) {
                return failureCount < 2;
              }
              return false;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Suspense fallback={<AuthLoader />}>
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </ThemeProvider>
      {/* Only show DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
