'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
}

export class RealtimeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a network/realtime error
    const isNetworkError =
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('websocket') ||
      error.message.toLowerCase().includes('realtime');

    return {
      hasError: true,
      error,
      isNetworkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `RealtimeErrorBoundary caught error in ${this.props.componentName || 'component'}:`,
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
    });
  };

  render() {
    if (this.state.hasError) {
      const { isNetworkError } = this.state;

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 p-6">
          <div className="flex items-center gap-3 text-red-500">
            {isNetworkError ? (
              <WifiOff className="h-8 w-8" />
            ) : (
              <AlertTriangle className="h-8 w-8" />
            )}
            <h3 className="text-xl font-semibold">
              {isNetworkError ? 'Connection Error' : 'Real-time Error'}
            </h3>
          </div>

          <p className="max-w-md text-center text-gray-400">
            {isNetworkError
              ? 'Lost connection to the game server. Please check your internet connection.'
              : `The ${this.props.componentName || 'real-time component'} encountered an error.`}
          </p>

          <div className="flex gap-3">
            <Button
              onClick={this.handleReset}
              variant="default"
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Try Again
            </Button>

            {isNetworkError && (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Reload Page
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <BaseErrorBoundary
        level="component"
        onError={(error, errorInfo, errorId) => {
          console.error(
            `Realtime component error: ${this.props.componentName}`,
            {
              error,
              errorInfo,
              errorId,
            }
          );
        }}
      >
        {this.props.children}
      </BaseErrorBoundary>
    );
  }
}
