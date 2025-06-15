/**
 * Centralized error reporting utility
 * Handles Sentry integration without dynamic imports
 */

import type * as SentryTypes from '@sentry/nextjs';

let sentryInstance: typeof SentryTypes | null = null;

// Initialize Sentry reference on client side
if (typeof window !== 'undefined') {
  import('@sentry/nextjs')
    .then(Sentry => {
      sentryInstance = Sentry;
    })
    .catch(err => {
      console.warn('Failed to load Sentry:', err);
    });
}

export interface ErrorContext {
  errorId: string;
  level?: string;
  componentStack?: string | null;
  errorCount?: number;
  metadata?: Record<string, unknown>;
}

export function reportError(
  error: Error,
  context: ErrorContext
): string | undefined {
  if (!sentryInstance) {
    console.error('Error (Sentry not loaded):', error, context);
    return undefined;
  }

  let sentryEventId: string | undefined;

  sentryInstance.withScope(scope => {
    // Set error boundary context
    if (context.level) {
      scope.setTag('errorBoundary', true);
      scope.setTag('errorBoundary.level', context.level);
    }

    // Set error ID
    scope.setTag('errorId', context.errorId);

    // Set context
    scope.setContext('error', {
      errorId: context.errorId,
      level: context.level,
      errorCount: context.errorCount,
      ...context.metadata,
    });

    // Set fingerprint
    scope.setFingerprint([
      'error-boundary',
      context.level || 'unknown',
      error.name,
      error.message,
    ]);

    // Add breadcrumb
    scope.addBreadcrumb({
      category: 'error-boundary',
      message: `Error caught by ${context.level || 'unknown'} boundary`,
      level: 'error',
      data: {
        errorId: context.errorId,
        componentStack: context.componentStack,
      },
    });

    // Capture the error
    interface CaptureContext {
      contexts?: {
        react?: {
          componentStack: string | null;
        };
      };
    }

    const captureContext: CaptureContext = {};
    if (context.componentStack) {
      captureContext.contexts = {
        react: {
          componentStack: context.componentStack,
        },
      };
    }

    // We check for sentryInstance at the top of the function
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sentryEventId = sentryInstance!.captureException(error, captureContext);
  });

  return sentryEventId;
}

export function reportMessage(
  message: string,
  level: 'warning' | 'info' = 'info',
  tags?: Record<string, string | number>
): void {
  if (!sentryInstance) {
    console.log(`[${level}] ${message}`, tags);
    return;
  }

  sentryInstance.captureMessage(message, {
    level,
    tags,
  });
}
