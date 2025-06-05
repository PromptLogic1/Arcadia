'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // This is the last line of defense - log everything
    const errorContext = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
    };

    logger.error('Root error boundary caught critical error', error, {
      metadata: errorContext,
    });

    // Send critical error to Sentry with maximum context
    Sentry.withScope((scope) => {
      // Mark as critical
      scope.setLevel('fatal');
      
      // Set context
      scope.setContext('rootErrorBoundary', {
        errorCount: this.state.errorCount + 1,
        ...errorContext,
      });

      // Set tags
      scope.setTag('errorBoundary', true);
      scope.setTag('errorBoundary.level', 'root');
      scope.setTag('critical', true);
      
      // Set fingerprint for grouping critical errors
      scope.setFingerprint([
        'root-error-boundary',
        error.name,
        error.message,
      ]);

      // Add breadcrumb
      scope.addBreadcrumb({
        category: 'error-boundary',
        message: 'Critical error caught by root boundary',
        level: 'fatal',
        data: errorContext,
      });

      // Capture with React context
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    });

    // Increment error count
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));

    // If we're in development, also log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Root Error Boundary:', error, errorInfo);
    }

    // For critical errors, also capture a message about app state
    if (this.state.errorCount > 0) {
      Sentry.captureMessage(
        `Root boundary caught ${this.state.errorCount + 1} errors - app unstable`,
        'error'
      );
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Critical error - show minimal UI
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="w-full max-w-md space-y-6 text-center">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-red-500">
                    Critical Error
                  </h1>
                  <p className="text-gray-400">
                    The application encountered a critical error and cannot
                    continue.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-medium text-white transition-colors hover:bg-cyan-700"
                  >
                    Reload Application
                  </button>

                  <p className="text-xs text-gray-500">
                    If this problem persists, please contact support.
                  </p>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-8 text-left">
                    <summary className="cursor-pointer text-sm text-gray-400">
                      Developer Info
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-gray-800 p-4 text-xs">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
