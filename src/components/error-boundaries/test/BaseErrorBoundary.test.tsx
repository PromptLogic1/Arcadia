import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaseErrorBoundary } from '../BaseErrorBoundary';
import { reportError, reportMessage } from '@/lib/error-reporting';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/error-reporting');
jest.mock('@/lib/logger');
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockReportError = reportError as jest.MockedFunction<typeof reportError>;
const mockReportMessage = reportMessage as jest.MockedFunction<
  typeof reportMessage
>;
const mockLog = log as jest.Mocked<typeof log>;

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('BaseErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReportError.mockReturnValue('sentry-event-id-123');

    // Suppress console.error for error boundary tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <BaseErrorBoundary>
          <div>Test content</div>
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });
  });

  describe('when error occurs', () => {
    it('catches error and displays error UI', () => {
      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('displays error ID', () => {
      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
      expect(
        screen.getByText(/Sentry ID: sentry-event-id-123/)
      ).toBeInTheDocument();
    });

    it('logs error with proper context', () => {
      render(
        <BaseErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(mockLog.error).toHaveBeenCalledWith(
        'Error boundary caught error',
        expect.any(Error),
        expect.objectContaining({
          component: 'BaseErrorBoundary',
          metadata: expect.objectContaining({
            level: 'page',
            errorMessage: 'Test error',
            errorCount: 1,
          }),
        })
      );
    });

    it('reports error to Sentry', () => {
      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'component',
          errorCount: 1,
          metadata: expect.any(Object),
        })
      );
    });

    it('calls onError callback when provided', () => {
      const mockOnError = jest.fn();

      render(
        <BaseErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) }),
        expect.any(String) // errorId
      );
    });
  });

  describe('error recovery', () => {
    it('resets error state when Try Again is clicked', async () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>No error</div>;
      };

      const { rerender } = render(
        <BaseErrorBoundary>
          <TestComponent />
        </BaseErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

      // Update the flag before clicking Try Again
      shouldThrow = false;

      const tryAgainButton = screen.getByText('Try Again');
      await userEvent.click(tryAgainButton);

      // Wait a bit for error boundary state to reset
      await new Promise(resolve => setTimeout(resolve, 100));

      // Force a re-render to see the reset
      rerender(
        <BaseErrorBoundary>
          <TestComponent />
        </BaseErrorBoundary>
      );

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    }, 15000);

    it('resets when resetKeys change', () => {
      const { rerender } = render(
        <BaseErrorBoundary resetKeys={['key1']}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

      rerender(
        <BaseErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </BaseErrorBoundary>
      );

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('resets when children change and resetOnPropsChange is true', () => {
      const { rerender } = render(
        <BaseErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

      rerender(
        <BaseErrorBoundary resetOnPropsChange={true}>
          <div>New content</div>
        </BaseErrorBoundary>
      );

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByText('New content')).toBeInTheDocument();
    });
  });

  describe('error UI variations', () => {
    it('displays page-level error message', () => {
      render(
        <BaseErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(
        screen.getByText(/This page encountered an error/)
      ).toBeInTheDocument();
    });

    it('displays layout-level error message', () => {
      render(
        <BaseErrorBoundary level="layout">
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText(/A critical error occurred/)).toBeInTheDocument();
    });

    it('hides Go Home button for layout-level errors', () => {
      render(
        <BaseErrorBoundary level="layout">
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      render(
        <BaseErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });
  });

  describe('error details in development', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('shows error details when showDetails is true in development', async () => {
      render(
        <BaseErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(
        screen.getByText('Error Details (Development Only)')
      ).toBeInTheDocument();

      // Click to expand details
      const detailsButton = screen.getByText(
        'Error Details (Development Only)'
      );
      await userEvent.click(detailsButton);

      expect(screen.getByText('Message:')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Stack:')).toBeInTheDocument();
    }, 15000);

    it('hides error details in production even when showDetails is true', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      render(
        <BaseErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      );

      expect(
        screen.queryByText('Error Details (Development Only)')
      ).not.toBeInTheDocument();

      process.env = originalEnv;
    });
  });

  describe('excessive error handling', () => {
    let mockReload: jest.Mock;
    let originalLocation: Location;

    beforeEach(() => {
      jest.useFakeTimers();
      // Save original location and create mock
      originalLocation = window.location;
      mockReload = jest.fn();

      // Mock the entire location object
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: {
          ...originalLocation,
          reload: mockReload,
        },
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      // Restore original location
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: originalLocation,
      });
    });

    it('schedules page reload after too many errors', () => {
      // Test that excessive errors trigger a reload
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'test stack' };

      // Create an instance of BaseErrorBoundary to test directly
      const instance = new BaseErrorBoundary({ children: null });

      // Manually set the error counter to 3 (just before the threshold)
      // @ts-expect-error - accessing private property for testing
      instance.errorCounter = 3;

      // Set the state first (getDerivedStateFromError would normally do this)
      instance.state = {
        hasError: true,
        error,
        errorInfo: null,
        errorId: '123',
      };

      // Trigger componentDidCatch with another error (4th error)
      instance.componentDidCatch(error, errorInfo);

      expect(mockReportMessage).toHaveBeenCalledWith(
        'Excessive errors detected, scheduling reload',
        'warning',
        expect.objectContaining({
          errorCount: 4,
        })
      );

      // Verify reload is scheduled but not called immediately
      expect(mockReload).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(mockReload).toHaveBeenCalled();
    });

    it('clears timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Create an instance and set up a reload timeout
      const instance = new BaseErrorBoundary({ children: null });

      // Set error counter high and trigger error to schedule reload
      // @ts-expect-error - accessing private property for testing
      instance.errorCounter = 3;

      const error = new Error('Test error');
      const errorInfo = { componentStack: 'test stack' };

      // Set the state first (getDerivedStateFromError would normally do this)
      instance.state = {
        hasError: true,
        error,
        errorInfo: null,
        errorId: '123',
      };

      instance.componentDidCatch(error, errorInfo);

      // Verify timeout was scheduled
      // @ts-expect-error - accessing private property for testing
      expect(instance.resetTimeoutId).not.toBeNull();

      clearTimeoutSpy.mockClear();

      // Call unmount lifecycle
      instance.componentWillUnmount();

      // The component should clear the timeout on unmount
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});
