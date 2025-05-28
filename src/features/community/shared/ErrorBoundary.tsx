import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error in ErrorBoundary', error, {
      component: 'ErrorBoundary',
      metadata: { errorInfo: errorInfo.componentStack },
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <h2 className="text-xl font-bold text-red-500">
            Something went wrong
          </h2>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="bg-cyan-500 text-gray-900 hover:bg-cyan-600"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
