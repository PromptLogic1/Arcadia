import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalError from '../global-error';

// Mock Next.js error component
jest.mock('next/error', () => {
  const MockNextError = ({ statusCode }: { statusCode: number }) => (
    <div data-testid="next-error" data-status={statusCode}>
      Error Page - Status: {statusCode}
    </div>
  );
  MockNextError.displayName = 'MockNextError';
  return MockNextError;
});

// Mock error reporting modules
jest.mock('@/lib/error-deduplication', () => ({
  shouldSendToSentry: jest.fn(),
}));

jest.mock('@/lib/error-reporting', () => ({
  reportError: jest.fn(),
}));

import { shouldSendToSentry } from '@/lib/error-deduplication';
import { reportError } from '@/lib/error-reporting';

describe('GlobalError Component', () => {
  const mockShouldSendToSentry = shouldSendToSentry as jest.MockedFunction<typeof shouldSendToSentry>;
  const mockReportError = reportError as jest.MockedFunction<typeof reportError>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random for consistent error IDs
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    // Mock Date.now for consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders NextError component with statusCode 0', () => {
    const error = new Error('Test error');
    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={error} />);

    // GlobalError renders html and body as root elements
    // In testing environment, these are rendered within the container
    const nextError = screen.getByTestId('next-error');
    expect(nextError).toBeInTheDocument();
    expect(nextError).toHaveAttribute('data-status', '0');
    expect(nextError).toHaveTextContent('Error Page - Status: 0');
  });

  it('reports error to Sentry when shouldSendToSentry returns true', async () => {
    const error = new Error('Test error to report');
    const digest = 'test-digest-123';
    const errorWithDigest = Object.assign(error, { digest });

    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={errorWithDigest} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalled();
    });

    expect(mockShouldSendToSentry).toHaveBeenCalledWith(errorWithDigest);
    expect(mockReportError).toHaveBeenCalledWith(errorWithDigest, {
      errorId: expect.stringMatching(/^global-\d+-[a-z0-9]+$/),
      level: 'global',
      metadata: {
        digest: 'test-digest-123',
        caught: 'global-error',
        framework: 'nextjs',
      },
    });
  });

  it('does not report error when shouldSendToSentry returns false', async () => {
    const error = new Error('Duplicate error');
    mockShouldSendToSentry.mockReturnValue(false);

    render(<GlobalError error={error} />);

    await waitFor(() => {
      expect(mockShouldSendToSentry).toHaveBeenCalled();
    });

    expect(mockShouldSendToSentry).toHaveBeenCalledWith(error);
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it('generates unique error ID with timestamp and random string', async () => {
    const error = new Error('Test error');
    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={error} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          errorId: expect.stringMatching(/^global-\d+-[a-z0-9]+$/),
        })
      );
    });
  });

  it('includes error digest in metadata when available', async () => {
    const error = new Error('Test error with digest');
    const errorWithDigest = Object.assign(error, { digest: 'unique-digest-456' });
    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={errorWithDigest} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(
        errorWithDigest,
        expect.objectContaining({
          metadata: expect.objectContaining({
            digest: 'unique-digest-456',
          }),
        })
      );
    });
  });

  it('handles error without digest property', async () => {
    const error = new Error('Test error without digest');
    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={error} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            digest: undefined,
            caught: 'global-error',
            framework: 'nextjs',
          }),
        })
      );
    });
  });

  it('only reports error once on component mount', async () => {
    const error = new Error('Test error');
    mockShouldSendToSentry.mockReturnValue(true);

    const { rerender } = render(<GlobalError error={error} />);

    // Re-render with same error
    rerender(<GlobalError error={error} />);

    await waitFor(() => {
      // Should only be called once despite re-render
      expect(mockReportError).toHaveBeenCalledTimes(1);
    });
  });

  it('reports new error when error prop changes', async () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    mockShouldSendToSentry.mockReturnValue(true);

    const { rerender } = render(<GlobalError error={error1} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledTimes(1);
    });

    expect(mockReportError).toHaveBeenCalledWith(
      error1,
      expect.any(Object)
    );

    // Change to a different error
    rerender(<GlobalError error={error2} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledTimes(2);
    });

    expect(mockReportError).toHaveBeenLastCalledWith(
      error2,
      expect.any(Object)
    );
  });

  it('sets correct error reporting level as global', async () => {
    const error = new Error('Test global error');
    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={error} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'global',
        })
      );
    });
  });

  it('includes framework metadata as nextjs', async () => {
    const error = new Error('Framework error');
    mockShouldSendToSentry.mockReturnValue(true);

    render(<GlobalError error={error} />);

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          metadata: expect.objectContaining({
            framework: 'nextjs',
          }),
        })
      );
    });
  });
});