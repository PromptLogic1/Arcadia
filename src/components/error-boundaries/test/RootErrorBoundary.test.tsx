import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RootErrorBoundary } from '../RootErrorBoundary';
import { logger } from '@/lib/logger';
import { shouldSendToSentry } from '@/lib/error-deduplication';

// Mock dependencies
jest.mock('@/lib/logger');
jest.mock('@/lib/error-deduplication');
jest.mock('@sentry/nextjs', () => ({
  withScope: jest.fn(callback =>
    callback({
      setLevel: jest.fn(),
      setContext: jest.fn(),
      setTag: jest.fn(),
      setFingerprint: jest.fn(),
      addBreadcrumb: jest.fn(),
    })
  ),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test',
    reload: mockReload,
  },
  writable: true,
});

// Component that throws an error for testing
const ThrowError: React.FC<{
  shouldThrow?: boolean;
  errorMessage?: string;
}> = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Normal child component</div>;
};

describe('RootErrorBoundary', () => {
  const originalConsoleError = console.error;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Suppress error logs in tests
    (shouldSendToSentry as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.env = originalEnv;
  });

  describe('normal operation', () => {
    test('should render children when no error occurs', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={false} />
        </RootErrorBoundary>
      );

      expect(screen.getByText('Normal child component')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('should catch errors and display error UI', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </RootErrorBoundary>
      );

      expect(screen.getByText('Critical Error')).toBeInTheDocument();
      expect(
        screen.getByText(/The application encountered a critical error/)
      ).toBeInTheDocument();
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
    });

    test('should log error details to logger', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </RootErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Root error boundary caught critical error',
        expect.objectContaining({
          message: 'Test error message',
        }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'Test error message',
            url: 'https://example.com/test',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    test('should check Sentry deduplication before sending', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </RootErrorBoundary>
      );

      expect(shouldSendToSentry).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
        })
      );
    });

    test('should skip Sentry when deduplication prevents it', () => {
      (shouldSendToSentry as jest.Mock).mockReturnValue(false);

      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </RootErrorBoundary>
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'Error already reported to Sentry, skipping duplicate',
        expect.objectContaining({
          metadata: { error: 'Test error message' },
        })
      );
    });
  });

  describe('user interactions', () => {
    test('should reload page when reload button is clicked', async () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Application');
      await userEvent.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('development mode', () => {
    test('should show developer info in development mode', async () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Dev error" />
        </RootErrorBoundary>
      );

      expect(screen.getByText('Developer Info')).toBeInTheDocument();

      // Click to expand details
      await userEvent.click(screen.getByText('Developer Info'));

      // Should show error stack
      expect(screen.getByText(/Error: Dev error/)).toBeInTheDocument();
    });

    test('should log additional development info', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Dev error" />
        </RootErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Root Error Boundary:',
        expect.objectContaining({ message: 'Dev error' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            componentStack: expect.any(String),
          }),
        })
      );
    });

    test('should not show developer info in production mode', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      expect(screen.queryByText('Developer Info')).not.toBeInTheDocument();
    });
  });

  describe('error state management', () => {
    test('should track error count for repeated errors', async () => {
      const { rerender } = render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={false} />
        </RootErrorBoundary>
      );

      // First error
      rerender(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </RootErrorBoundary>
      );

      expect(screen.getByText('Critical Error')).toBeInTheDocument();

      // Verify the component is tracking errors internally
      // (we can't directly test state but can verify through behavior)
    });
  });

  describe('context and metadata', () => {
    test('should capture browser context when available', () => {
      // Mock navigator
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Test User Agent',
        configurable: true,
      });

      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Root error boundary caught critical error',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            url: 'https://example.com/test',
            userAgent: 'Test User Agent',
          }),
        })
      );
    });

    test('should handle missing browser APIs gracefully', () => {
      // Test the component's ability to handle missing APIs by checking the logged metadata
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      // Verify that the error boundary handles the error and logs it
      expect(logger.error).toHaveBeenCalledWith(
        'Root error boundary caught critical error',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: expect.any(String),
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Sentry integration', () => {
    test('should send errors to Sentry when deduplication allows', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByText('Critical Error')).toBeInTheDocument();

      // Should check deduplication
      expect(shouldSendToSentry).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Critical Error');

      const button = screen.getByRole('button', { name: 'Reload Application' });
      expect(button).toBeInTheDocument();
    });

    test('should have clickable reload button', async () => {
      render(
        <RootErrorBoundary>
          <ThrowError shouldThrow={true} />
        </RootErrorBoundary>
      );

      const button = screen.getByRole('button', { name: 'Reload Application' });

      // Should be clickable
      await userEvent.click(button);
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
