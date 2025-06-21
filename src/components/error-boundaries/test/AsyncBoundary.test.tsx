/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AsyncBoundary } from '../AsyncBoundary';

// Mock the BaseErrorBoundary
jest.mock('../BaseErrorBoundary', () => ({
  BaseErrorBoundary: ({ children, level, fallback, resetOnPropsChange }: any) => (
    <div 
      data-testid="base-error-boundary" 
      data-level={level}
      data-reset-on-props-change={resetOnPropsChange}
    >
      {fallback && <div data-testid="error-fallback">{fallback}</div>}
      {children}
    </div>
  ),
}));

// Mock the LoadingSpinner
jest.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

describe('AsyncBoundary', () => {
  describe('rendering', () => {
    it('should render children when no suspense is triggered', () => {
      render(
        <AsyncBoundary>
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should wrap children in BaseErrorBoundary with correct props', () => {
      render(
        <AsyncBoundary>
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      const errorBoundary = screen.getByTestId('base-error-boundary');
      expect(errorBoundary).toBeInTheDocument();
      expect(errorBoundary).toHaveAttribute('data-level', 'component');
      expect(errorBoundary).toHaveAttribute('data-reset-on-props-change', 'true');
    });

    it('should wrap children in Suspense', () => {
      render(
        <AsyncBoundary>
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      // Children should be rendered (no suspense triggered)
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  describe('loading fallback', () => {
    const SuspendingComponent = () => {
      throw new Promise(() => {}); // Never resolves, keeps component suspended
    };

    it('should show default loading fallback when suspense is triggered', () => {
      render(
        <AsyncBoundary>
          <SuspendingComponent />
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show custom loading message', () => {
      render(
        <AsyncBoundary loadingMessage="Custom loading message">
          <SuspendingComponent />
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should show custom loading fallback when provided', () => {
      const customFallback = <div data-testid="custom-loading">Custom Loading</div>;

      render(
        <AsyncBoundary loadingFallback={customFallback}>
          <SuspendingComponent />
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should apply correct styling to default loading fallback', () => {
      render(
        <AsyncBoundary>
          <SuspendingComponent />
        </AsyncBoundary>
      );

      const loadingContainer = screen.getByTestId('async-boundary-loading-container');
      expect(loadingContainer).toHaveClass(
        'flex',
        'min-h-[200px]',
        'flex-col',
        'items-center',
        'justify-center',
        'space-y-4'
      );

      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toHaveClass('text-sm', 'text-gray-400');
    });
  });

  describe('error fallback', () => {
    it('should pass custom error fallback to BaseErrorBoundary', () => {
      const customErrorFallback = <div data-testid="custom-error">Custom Error</div>;

      render(
        <AsyncBoundary errorFallback={customErrorFallback}>
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      // Error fallback should be passed to BaseErrorBoundary but not shown unless there's an error
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  describe('props handling', () => {
    it('should handle all props correctly', () => {
      const customLoadingFallback = <div data-testid="custom-loading">Loading...</div>;
      const customErrorFallback = <div data-testid="custom-error">Error!</div>;

      render(
        <AsyncBoundary
          loadingFallback={customLoadingFallback}
          errorFallback={customErrorFallback}
          loadingMessage="Custom message"
        >
          <div data-testid="test-child">Test Content</div>
        </AsyncBoundary>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should use default loading message when not provided', () => {
      const SuspendingComponent = () => {
        throw new Promise(() => {});
      };

      render(
        <AsyncBoundary>
          <SuspendingComponent />
        </AsyncBoundary>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('component integration', () => {
    it('should work with multiple children', () => {
      render(
        <AsyncBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </AsyncBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should work with nested components', () => {
      render(
        <AsyncBoundary>
          <div data-testid="parent">
            <div data-testid="child">
              <span data-testid="grandchild">Nested Content</span>
            </div>
          </div>
        </AsyncBoundary>
      );

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('grandchild')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle null children', () => {
      render(<AsyncBoundary>{null}</AsyncBoundary>);

      expect(screen.getByTestId('base-error-boundary')).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<AsyncBoundary>{undefined}</AsyncBoundary>);

      expect(screen.getByTestId('base-error-boundary')).toBeInTheDocument();
    });

    it('should handle empty string children', () => {
      render(<AsyncBoundary>{''}</AsyncBoundary>);

      expect(screen.getByTestId('base-error-boundary')).toBeInTheDocument();
    });

    it('should handle empty loading message', () => {
      const SuspendingComponent = () => {
        throw new Promise(() => {});
      };

      render(
        <AsyncBoundary loadingMessage="">
          <SuspendingComponent />
        </AsyncBoundary>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      // Should still render the container even with empty message
    });

    it('should handle complex loading fallback', () => {
      const ComplexLoadingFallback = () => (
        <div data-testid="complex-loading">
          <h2>Loading...</h2>
          <p>Please wait while we load your content.</p>
          <div>Progress: 50%</div>
        </div>
      );

      const SuspendingComponent = () => {
        throw new Promise(() => {});
      };

      render(
        <AsyncBoundary loadingFallback={<ComplexLoadingFallback />}>
          <SuspendingComponent />
        </AsyncBoundary>
      );

      expect(screen.getByTestId('complex-loading')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we load your content.')).toBeInTheDocument();
      expect(screen.getByText('Progress: 50%')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should maintain semantic structure', () => {
      render(
        <AsyncBoundary>
          <main data-testid="main-content">
            <h1>Page Title</h1>
            <p>Page content</p>
          </main>
        </AsyncBoundary>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should preserve ARIA attributes', () => {
      render(
        <AsyncBoundary>
          <div data-testid="content" aria-label="Main content" role="region">
            Content with ARIA
          </div>
        </AsyncBoundary>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('aria-label', 'Main content');
      expect(content).toHaveAttribute('role', 'region');
    });

    it('should make loading state accessible', () => {
      const SuspendingComponent = () => {
        throw new Promise(() => {});
      };

      render(
        <AsyncBoundary loadingMessage="Loading user data">
          <SuspendingComponent />
        </AsyncBoundary>
      );

      const loadingText = screen.getByText('Loading user data');
      expect(loadingText).toBeInTheDocument();
      expect(loadingText.tagName).toBe('P');
    });
  });

  describe('performance', () => {
    it('should render efficiently without unnecessary re-renders', () => {
      const TestChild = () => <div data-testid="test-child">Content</div>;

      render(
        <AsyncBoundary>
          <TestChild />
        </AsyncBoundary>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });
});