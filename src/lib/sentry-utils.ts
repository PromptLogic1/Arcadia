import * as Sentry from '@sentry/nextjs';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Set user context in Sentry for better error tracking
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add additional context to Sentry errors
 */
export function addSentryContext() {
  // Add build info
  Sentry.setContext('build', {
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
  });

  // Add browser info (client-side only)
  if (typeof window !== 'undefined') {
    Sentry.setContext('browser', {
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
    });

    // Add performance context
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      Sentry.setContext('network', {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      });
    }
  }
}

/**
 * Capture an error with additional context
 */
export function captureErrorWithContext(
  error: Error,
  context: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) {
  Sentry.withScope((scope) => {
    // Set level
    scope.setLevel(level);
    
    // Add context
    Object.entries(context).forEach(([key, value]) => {
      scope.setContext(key, value);
    });
    
    // Capture
    return Sentry.captureException(error);
  });
}

/**
 * Add breadcrumb for better error tracking
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Track a transaction for performance monitoring
 */
export function trackTransaction(
  name: string,
  operation: string,
  callback: () => Promise<any>
) {
  // In Sentry v8, use startSpan instead of startTransaction
  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    async () => {
      try {
        const result = await callback();
        return result;
      } catch (error) {
        throw error;
      }
    }
  );
}

/**
 * Initialize Sentry user context from auth store
 */
export function initializeSentryUser() {
  // Get user from auth store
  const authUser = useAuthStore.getState().authUser;
  if (authUser) {
    setSentryUser({
      id: authUser.id,
      email: authUser.email || undefined,
    });
  }
  
  // Subscribe to auth changes
  useAuthStore.subscribe((state) => {
    if (state.authUser) {
      setSentryUser({
        id: state.authUser.id,
        email: state.authUser.email || undefined,
      });
    } else {
      setSentryUser(null);
    }
  });
}