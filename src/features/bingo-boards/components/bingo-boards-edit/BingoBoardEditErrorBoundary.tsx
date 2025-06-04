'use client';

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { log } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary for Bingo Board Editor
 *
 * Catches and handles errors in the board editing interface
 * with graceful degradation and recovery options.
 */
export class BingoBoardEditErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    log.error('BingoBoardEdit Error Boundary caught an error', error, {
      component: 'BingoBoardEditErrorBoundary',
      metadata: {
        errorInfo: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    // Store error info in state
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Show user notification
    notifications.error('An unexpected error occurred', {
      description:
        'The board editor encountered an error. You can try refreshing or go back to the main page.',
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/challenge-hub';
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
          <Card className="w-full max-w-md border-red-500/20 bg-gray-800/50 p-6">
            <div className="space-y-4 text-center">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/20 p-3">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              </div>

              {/* Error Title */}
              <div>
                <h2 className="mb-2 text-xl font-semibold text-gray-100">
                  Oops! Something went wrong
                </h2>
                <p className="text-sm text-gray-400">
                  The board editor encountered an unexpected error. Don&apos;t
                  worry - your progress should be safe.
                </p>
              </div>

              {/* Error Details (in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="rounded-lg bg-gray-900/50 p-3 text-left text-xs">
                  <summary className="mb-2 cursor-pointer font-medium text-red-400">
                    Error Details (Development)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong className="text-gray-300">Error:</strong>
                      <pre className="break-words whitespace-pre-wrap text-red-300">
                        {this.state.error.message}
                      </pre>
                    </div>
                    <div>
                      <strong className="text-gray-300">Stack:</strong>
                      <pre className="max-h-32 overflow-y-auto text-xs break-words whitespace-pre-wrap text-gray-400">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleRefresh}
                  className="flex-1 border-gray-600 hover:bg-gray-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>

                <Button
                  variant="ghost"
                  onClick={this.handleGoHome}
                  className="flex-1 hover:bg-gray-700"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-500">
                If this problem persists, please try refreshing the page or
                contact support.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useBingoBoardEditErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    log.error('Bingo Board Edit Error', error, {
      component: context || 'BingoBoardEdit',
      metadata: { handledByHook: true },
    });

    notifications.error('An error occurred', {
      description: error.message || 'Please try again or contact support.',
    });
  }, []);

  return { handleError };
};
