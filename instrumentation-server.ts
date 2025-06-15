import { validateServerEnv } from '@/lib/config';

// Validate environment variables on server startup
try {
  validateServerEnv();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error(
    '❌ Server startup failed due to invalid environment configuration'
  );
  // Exit the process with error code
  process.exit(1);
}

// Lazy load Sentry to reduce initial bundle size
async function initializeSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  try {
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Release tracking
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

      // Environment
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

      // Filter out certain errors
      ignoreErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'],

      // Before sending error to Sentry
      beforeSend(event) {
        // Don't send events in development unless explicitly enabled
        if (
          process.env.NODE_ENV === 'development' &&
          !process.env.NEXT_PUBLIC_SENTRY_DEV_ENABLED
        ) {
          return null;
        }

        return event;
      },
    });

    console.log('[Sentry] Server-side initialization complete');
  } catch (error) {
    console.error('[Sentry] Failed to initialize on server:', error);
  }
}

// Initialize Sentry asynchronously
initializeSentry();

// Export to make it a module
export {};
