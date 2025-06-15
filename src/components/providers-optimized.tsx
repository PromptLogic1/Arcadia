'use client';

import { ThemeProvider } from './ui/ThemeProvider';
import { AuthProvider } from './auth/auth-provider';
import { Suspense, useState, useMemo, lazy } from 'react';
import AuthLoader from './auth/auth-loader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BaseErrorBoundary } from './error-boundaries';
import { AriaAnnouncerProvider } from './accessibility/AriaLiveRegion';

// Lazy load dev tools to keep them out of production bundle
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then(mod => ({
          default: mod.ReactQueryDevtools,
        }))
      )
    : null;

// Create stable QueryClient configuration
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: unknown) => {
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
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
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
  });

// Combined provider component to reduce nesting
export function Providers({ children }: { children: React.ReactNode }) {
  // Memoize QueryClient to prevent recreation
  const [queryClient] = useState(createQueryClient);

  // Memoize provider props to prevent re-renders
  const themeProviderProps = useMemo(
    () => ({
      attribute: 'class' as const,
      defaultTheme: 'dark' as const,
      forcedTheme: 'dark' as const,
      enableSystem: false,
      disableTransitionOnChange: true,
      storageKey: 'arcadia-theme',
    }),
    []
  );

  return (
    <BaseErrorBoundary level="layout">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider {...themeProviderProps}>
          <AriaAnnouncerProvider>
            <BaseErrorBoundary level="component">
              <Suspense fallback={<AuthLoader />}>
                <AuthProvider>{children}</AuthProvider>
              </Suspense>
            </BaseErrorBoundary>
          </AriaAnnouncerProvider>
        </ThemeProvider>
        {/* Lazy load DevTools only in development */}
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </BaseErrorBoundary>
  );
}
