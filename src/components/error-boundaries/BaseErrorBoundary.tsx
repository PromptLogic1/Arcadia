'use client';

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home } from '@/components/ui/Icons';
import Link from 'next/link';
import { reportError, reportMessage } from '@/lib/error-reporting';
import { log } from '@/lib/logger';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  sentryEventId?: string;
}

export interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'layout' | 'component';
  showDetails?: boolean;
}

export class BaseErrorBoundary extends Component<
  BaseErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private errorCounter = 0;

  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    const { errorId } = this.state;

    // Increment error counter
    this.errorCounter++;

    // Create error context
    const errorContext = {
      errorId,
      level,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: this.errorCounter,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Log error locally
    log.error('Error boundary caught error', error, {
      component: 'BaseErrorBoundary',
      metadata: errorContext,
    });

    // Send to Sentry with additional context
    const sentryEventId = reportError(error, {
      errorId,
      level,
      componentStack: errorInfo.componentStack,
      errorCount: this.errorCounter,
      metadata: errorContext,
    });

    // Store error info and Sentry event ID
    this.setState({
      errorInfo,
      sentryEventId,
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo, errorId);

    // If we're getting too many errors, reload the page after a delay
    if (this.errorCounter > 3) {
      log.error('Too many errors detected, scheduling page reload', undefined, {
        metadata: { errorCount: this.errorCounter },
      });

      // Report excessive errors to Sentry
      reportMessage('Excessive errors detected, scheduling reload', 'warning', {
        errorCount: this.errorCounter,
        errorBoundaryLevel: level,
      });

      this.resetTimeoutId = setTimeout(() => {
        window.location.reload();
      }, 5000);
    }
  }

  componentDidUpdate(prevProps: BaseErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Reset on prop changes if enabled
      if (resetOnPropsChange && prevProps.children !== this.props.children) {
        this.resetErrorBoundary();
      }

      // Reset if resetKeys changed
      if (
        resetKeys &&
        prevProps.resetKeys &&
        resetKeys.some(
          (key, idx) => prevProps.resetKeys && key !== prevProps.resetKeys[idx]
        )
      ) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    this.errorCounter = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const {
      fallback,
      children,
      level = 'component',
      showDetails = false,
    } = this.props;

    if (hasError && error) {
      // If custom fallback provided, use it
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI based on level
      return (
        <div
          className="error-boundary flex min-h-[400px] items-center justify-center p-8"
          data-testid="error-boundary"
        >
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-100">
                {level === 'page'
                  ? 'Page Error'
                  : level === 'layout'
                    ? 'Application Error'
                    : 'Something went wrong'}
              </h2>
              <p className="text-gray-400">
                {level === 'page'
                  ? "This page encountered an error and couldn't load properly."
                  : level === 'layout'
                    ? 'A critical error occurred. Please try refreshing the page.'
                    : 'An unexpected error occurred in this section.'}
              </p>
            </div>

            {/* Error ID for support */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Error ID: {errorId}</p>
              {this.state.sentryEventId && (
                <p className="text-xs text-gray-500">
                  Sentry ID: {this.state.sentryEventId}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={this.resetErrorBoundary}
                variant="primary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>

              {level !== 'layout' && (
                <Link href="/">
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </Link>
              )}
            </div>

            {/* Error details (development only) */}
            {showDetails && process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="overflow-auto rounded bg-gray-800 p-3">
                    <p className="font-semibold text-red-400">Message:</p>
                    <p className="text-gray-300">{error.message}</p>
                  </div>
                  <div className="max-h-40 overflow-auto rounded bg-gray-800 p-3">
                    <p className="font-semibold text-red-400">Stack:</p>
                    <pre className="whitespace-pre-wrap text-gray-300">
                      {error.stack}
                    </pre>
                  </div>
                  {errorInfo && (
                    <div className="max-h-40 overflow-auto rounded bg-gray-800 p-3">
                      <p className="font-semibold text-red-400">
                        Component Stack:
                      </p>
                      <pre className="whitespace-pre-wrap text-gray-300">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
