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

// Lazy initialization to prevent module loading issues
const initSentry = async () => {
  try {
    const Sentry = await import('@sentry/nextjs');

    // Only initialize if we have a DSN
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Initialize Sentry for server-side
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
    }
  } catch (error) {
    console.error('Failed to initialize Sentry on server:', error);
  }
};

// Initialize on module load
initSentry();

// Export to make it a module
export {};
