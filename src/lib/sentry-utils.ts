// Lazy import Sentry to prevent webpack loading issues
import { useAuthStore } from '@/lib/stores/auth-store';

// Augment the Navigator interface for Network Information API
declare global {
  interface Navigator {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    };
  }
}

/**
 * Set user context in Sentry for better error tracking
 */
export function setSentryUser(
  user: { id: string; email?: string; username?: string } | null
): void {
  try {
    import('@sentry/nextjs')
      .then(({ setUser }) => {
        if (user) {
          setUser({
            id: user.id,
            email: user.email,
            username: user.username,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      });
  } catch {
    // Silently fail if dynamic import is not supported
  }
}

/**
 * Add additional context to Sentry errors
 */
export function addSentryContext(): void {
  try {
    import('@sentry/nextjs')
      .then(({ setContext }) => {
        // Add build info
        setContext('build', {
          version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
          environment: process.env.NODE_ENV,
          buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
        });

        // Add browser info (client-side only)
        if (typeof window !== 'undefined') {
          setContext('browser', {
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
          // Now TypeScript knows about the connection property through global augmentation
          if (navigator.connection) {
            setContext('network', {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt,
            });
          }
        }
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      });
  } catch {
    // Silently fail if dynamic import is not supported
  }
}

/**
 * Capture an error with additional context
 */
export function captureErrorWithContext(
  error: Error,
  context: Record<string, Record<string, unknown> | null>,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'error'
): void {
  try {
    import('@sentry/nextjs')
      .then(({ withScope, captureException }) => {
        withScope(scope => {
          // Set level
          scope.setLevel(level);

          // Add context
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value);
          });

          // Capture
          captureException(error);
        });
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      });
  } catch {
    // Silently fail if dynamic import is not supported
  }
}

/**
 * Add breadcrumb for better error tracking
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info'
): void {
  try {
    import('@sentry/nextjs')
      .then(({ addBreadcrumb: sentryAddBreadcrumb }) => {
        sentryAddBreadcrumb({
          message,
          category,
          level,
          data,
          timestamp: Date.now() / 1000,
        });
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      });
  } catch {
    // Silently fail if dynamic import is not supported
  }
}

/**
 * Track a transaction for performance monitoring
 */
export function trackTransaction<T>(
  name: string,
  operation: string,
  callback: () => Promise<T>
): Promise<T> {
  try {
    return import('@sentry/nextjs')
      .then(({ startSpan }) => {
        // In Sentry v8, use startSpan instead of startTransaction
        return startSpan(
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
      })
      .catch(() => {
        // Fallback to just running the callback if Sentry is not available
        return callback();
      });
  } catch (error) {
    // Fallback to just running the callback if dynamic import is not supported
    return callback();
  }
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
  useAuthStore.subscribe(state => {
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
