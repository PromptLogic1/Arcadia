import * as Sentry from '@sentry/nextjs';

// Only initialize if we have a DSN
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  // Initialize Sentry for client-side
  Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content, but keep media playback
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  
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
  beforeSend(event) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEV_ENABLED) {
      return null;
    }
    
    // Filter out certain URLs
    if (event.request?.url) {
      const url = event.request.url;
      if (url.includes('chrome-extension://') || url.includes('moz-extension://')) {
        return null;
      }
    }
    
    // Add user context if available
    const user = typeof window !== 'undefined' ? window.localStorage.getItem('user') : null;
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

// Export required navigation hook
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;