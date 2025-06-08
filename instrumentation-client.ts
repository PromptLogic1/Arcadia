import { initSentry as initSentryLazy } from '@/lib/sentry-lazy';

// Lazy import to prevent module loading issues
const initSentry = async () => {
  try {
    // Only initialize if we have a DSN
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Initialize Sentry for client-side without Replay initially
      await initSentryLazy({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

        // Integrations - Start without Replay to reduce bundle size
        integrations: [
          // Replay will be added dynamically when needed
        ],

        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Session Replay - Configured but not loaded initially
        // These settings will be used when Replay is enabled
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

        // Release tracking
        release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

        // Environment
        environment:
          process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

        // Filter out certain errors
        ignoreErrors: [
          // Browser extensions
          'Non-Error promise rejection captured',
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          // Network errors that are expected
          'NetworkError',
          'Network request failed',
        ],

        // Before sending error to Sentry
        beforeSend(
          event: Record<string, unknown>,
          hint: Record<string, unknown>
        ) {
          // Don't send events in development unless explicitly enabled
          if (
            process.env.NODE_ENV === 'development' &&
            !process.env.NEXT_PUBLIC_SENTRY_DEV_ENABLED
          ) {
            return null;
          }

          // Filter out certain URLs
          const request = event.request as { url?: string } | undefined;
          if (request?.url) {
            const url = request.url;
            if (
              url.includes('chrome-extension://') ||
              url.includes('moz-extension://')
            ) {
              return null;
            }
          }

          // Add user context if available
          const user =
            typeof window !== 'undefined'
              ? window.localStorage.getItem('user')
              : null;
          if (user) {
            try {
              const userData = JSON.parse(user);
              event.user = {
                id: userData.id,
                email: userData.email,
              };
            } catch (e) {
              // Invalid user data
            }
          }

          return event;
        },

        // Transport options are handled by withSentryConfig in next.config.ts
        // which sets tunnelRoute: '/monitoring'
      });
    }

    // Import the actual Sentry module for navigation exports
    const Sentry = await import('@sentry/nextjs');
    return Sentry;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return null;
  }
};

// Initialize Sentry
let sentryInstance: typeof import('@sentry/nextjs') | null = null;
initSentry().then(sentry => {
  sentryInstance = sentry;
});

// Export required navigation hook with fallback
export const onRouterTransitionStart = (
  href: string,
  navigationType: string
) => {
  if (sentryInstance?.captureRouterTransitionStart) {
    return sentryInstance.captureRouterTransitionStart(href, navigationType);
  }
};

// Export function to enable Replay on demand
export const enableSentryReplay = async () => {
  if (typeof window === 'undefined') return;

  const { enableReplay } = await import('@/lib/sentry-lazy');
  await enableReplay({
    maskAllText: true,
    blockAllMedia: false,
  });
};
