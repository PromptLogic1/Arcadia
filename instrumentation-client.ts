// Lazy load Sentry to reduce initial bundle size
let sentryModule: typeof import('@sentry/nextjs') | null = null;

// Import logger for instrumentation logging
import { log } from '@/lib/logger';

// Create a mutable reference for the navigation hook
let navigationHook: ((href: string, navigationType: string) => void) | null =
  null;

// Export a function that calls the navigation hook if available
export const onRouterTransitionStart = (
  href: string,
  navigationType: string
) => {
  if (navigationHook) {
    navigationHook(href, navigationType);
  }
};

// Async initialization function
async function initializeSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  try {
    // Dynamically import Sentry
    sentryModule = await import('@sentry/nextjs');

    // Update the navigation hook reference
    navigationHook = sentryModule.captureRouterTransitionStart;

    // Initialize Sentry
    sentryModule.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Integrations - Browser tracing for client-side
      integrations: [sentryModule.browserTracingIntegration()],

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Session Replay
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
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (
          process.env.NODE_ENV === 'development' &&
          !process.env.NEXT_PUBLIC_SENTRY_DEV_ENABLED
        ) {
          return null;
        }

        // Filter out certain URLs
        if (event.request?.url) {
          const url = event.request.url;
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
    });

    log.info('[Sentry] Client-side initialization complete');
  } catch (error) {
    log.error('[Sentry] Failed to initialize', error as Error);
  }
}

// Initialize Sentry after page load to avoid blocking
if (typeof window !== 'undefined') {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => initializeSentry());
  } else {
    setTimeout(() => initializeSentry(), 1);
  }
}
