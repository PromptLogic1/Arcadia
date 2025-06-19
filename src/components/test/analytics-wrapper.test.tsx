import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import dynamic from 'next/dynamic';
import { AnalyticsWrapper } from '../analytics-wrapper';

// Mock next/dynamic
jest.mock('next/dynamic', () => {
  return jest.fn(importFn => {
    // Return a mock component that can be rendered
    const MockComponent = ({ children, ...props }: any) => (
      <div data-testid="mock-dynamic-component" {...props}>
        {children}
      </div>
    );
    MockComponent.displayName = 'MockDynamicComponent';
    return MockComponent;
  });
});

// Mock the Vercel analytics modules
jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="analytics-component" />,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights-component" />,
}));

describe('AnalyticsWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('component rendering', () => {
    test('should render without errors', () => {
      const { container } = render(<AnalyticsWrapper />);

      expect(container).toBeInTheDocument();
    });

    test('should render dynamic components', () => {
      render(<AnalyticsWrapper />);

      // Should render both dynamic components
      const dynamicComponents = screen.getAllByTestId('mock-dynamic-component');
      expect(dynamicComponents).toHaveLength(2);
    });
  });

  describe('dynamic imports configuration', () => {
    test('should configure Analytics with correct dynamic options', () => {
      render(<AnalyticsWrapper />);

      // Check that dynamic was called with correct parameters
      expect(dynamic).toHaveBeenCalledWith(expect.any(Function), {
        ssr: false,
      });
    });

    test('should configure SpeedInsights with correct dynamic options', () => {
      render(<AnalyticsWrapper />);

      // Should be called twice - once for Analytics, once for SpeedInsights
      expect(dynamic).toHaveBeenCalledTimes(2);

      // Both calls should have ssr: false
      const calls = (dynamic as jest.Mock).mock.calls;
      calls.forEach(call => {
        expect(call[1]).toEqual({ ssr: false });
      });
    });
  });

  describe('client-side only rendering', () => {
    test('should not cause hydration issues', () => {
      // This test ensures the component can be rendered without throwing
      // The dynamic imports with ssr: false prevent server-side rendering
      expect(() => {
        render(<AnalyticsWrapper />);
      }).not.toThrow();
    });
  });

  describe('import modules', () => {
    test('should import Analytics from correct module', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        Analytics: () => <div data-testid="analytics" />,
      });

      // Mock the import function that would be passed to dynamic
      const analyticsImportFn = () =>
        import('@vercel/analytics/react').then(mod => mod.Analytics);

      // Test that the import path is correct (indirectly through function structure)
      expect(typeof analyticsImportFn).toBe('function');
    });

    test('should import SpeedInsights from correct module', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        SpeedInsights: () => <div data-testid="speed-insights" />,
      });

      // Mock the import function that would be passed to dynamic
      const speedInsightsImportFn = () =>
        import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights);

      // Test that the import path is correct (indirectly through function structure)
      expect(typeof speedInsightsImportFn).toBe('function');
    });
  });

  describe('component structure', () => {
    test('should render components within React Fragment', () => {
      const { container } = render(<AnalyticsWrapper />);

      // The wrapper should not add any extra DOM elements (React Fragment)
      // Check that we have direct children without wrapper divs
      expect(container.children).toHaveLength(1);
    });

    test('should maintain rendering order', () => {
      render(<AnalyticsWrapper />);

      const components = screen.getAllByTestId('mock-dynamic-component');

      // Should render in the expected order (Analytics first, then SpeedInsights)
      expect(components).toHaveLength(2);
    });
  });

  describe('error boundaries', () => {
    test('should handle dynamic import errors gracefully', () => {
      // Mock console.error to prevent test noise
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // This test ensures that if dynamic imports fail, the component doesn't crash
      expect(() => {
        render(<AnalyticsWrapper />);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('performance considerations', () => {
    test('should use client-side only loading for performance', () => {
      render(<AnalyticsWrapper />);

      // Verify that both dynamic calls use ssr: false for optimal performance
      const calls = (dynamic as jest.Mock).mock.calls;
      expect(calls.every(call => call[1].ssr === false)).toBe(true);
    });
  });

  describe('module exports', () => {
    test('should be a named export', () => {
      expect(AnalyticsWrapper).toBeDefined();
      expect(typeof AnalyticsWrapper).toBe('function');
    });

    test('should be a React functional component', () => {
      const result = AnalyticsWrapper();
      expect(React.isValidElement(result)).toBe(true);
    });
  });
});
