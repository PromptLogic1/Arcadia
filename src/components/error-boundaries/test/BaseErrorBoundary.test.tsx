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
  beforeEach(() => {
    jest.clearAllMocks();
    mockReportError.mockReturnValue('sentry-event-id-123');

    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
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

      await userEvent.click(screen.getByText('Try Again'));

      // Force a re-render to see the reset
      rerender(
        <BaseErrorBoundary>
          <TestComponent />
        </BaseErrorBoundary>
      );

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

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
      await userEvent.click(
        screen.getByText('Error Details (Development Only)')
      );

      expect(screen.getByText('Message:')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Stack:')).toBeInTheDocument();
    });

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
    jest.useFakeTimers();

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules page reload after too many errors', async () => {
      // Mock window.location.reload
      const originalReload = window.location.reload;
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: jest.fn(),
      });

      let errorCount = 0;
      const TestComponent = () => {
        errorCount++;
        throw new Error(`Test error ${errorCount}`);
      };

      render(
        <BaseErrorBoundary>
          <TestComponent />
        </BaseErrorBoundary>
      );

      // Trigger multiple errors by clicking Try Again
      for (let i = 0; i < 3; i++) {
        await userEvent.click(screen.getByText('Try Again'));
      }

      expect(mockReportMessage).toHaveBeenCalledWith(
        'Excessive errors detected, scheduling reload',
        'warning',
        expect.objectContaining({
          errorCount: 4,
        })
      );

      // Verify reload is scheduled but not called immediately
      expect(window.location.reload).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(window.location.reload).toHaveBeenCalled();

      // Restore original reload
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: originalReload,
      });
    });

    it('clears timeout on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      let errorCount = 0;
      const TestComponent = () => {
        errorCount++;
        throw new Error(`Test error ${errorCount}`);
      };

      const { unmount } = render(
        <BaseErrorBoundary>
          <TestComponent />
        </BaseErrorBoundary>
      );

      // Trigger excessive errors
      for (let i = 0; i < 3; i++) {
        await userEvent.click(screen.getByText('Try Again'));
      }

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});
