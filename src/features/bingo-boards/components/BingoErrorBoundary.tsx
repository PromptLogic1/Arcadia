import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: 'auth' | 'general' | null;
}

export class BingoErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorType: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if error is auth-related
    if (
      error.message.includes('authentication') ||
      error.message.includes('unauthorized')
    ) {
      return { hasError: true, errorType: 'auth' };
    }
    return { hasError: true, errorType: 'general' };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-red-400">
            {this.state.errorType === 'auth'
              ? 'Please log in to access this feature'
              : 'Something went wrong with the bingo board'}
          </h3>
          <p className="mt-2 text-gray-400">
            {this.state.errorType === 'auth'
              ? 'You need to be logged in to use this feature'
              : 'Please try refreshing the page or contact support if the problem persists'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
