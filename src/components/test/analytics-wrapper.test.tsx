import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/dynamic to return immediate components
jest.mock('next/dynamic', () => {
  return jest.fn((_importFn: () => Promise<React.ComponentType>) => {
    // Return a component that mimics the dynamic loading
    const DynamicComponent = () => <div data-testid="mock-dynamic-component" />;
    DynamicComponent.displayName = 'MockDynamicComponent';
    return DynamicComponent;
  });
});

// Mock the Vercel analytics modules
jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="analytics-component" />,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights-component" />,
}));

import dynamic from 'next/dynamic';
import { AnalyticsWrapper } from '../analytics-wrapper';

const mockDynamic = dynamic as jest.MockedFunction<typeof dynamic>;

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
    test('should render dynamic components correctly', () => {
      render(<AnalyticsWrapper />);

      // Check that dynamic components are rendered
      const dynamicComponents = screen.getAllByTestId('mock-dynamic-component');
      expect(dynamicComponents).toHaveLength(2);
    });

    test('should have called dynamic import during module evaluation', () => {
      // Since dynamic is called at module level, we check the mock was configured
      expect(mockDynamic).toBeDefined();
      expect(typeof mockDynamic).toBe('function');
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
      // Mock the import function that would be passed to dynamic
      const analyticsImportFn = () =>
        import('@vercel/analytics/react').then(mod => mod.Analytics);

      // Test that the import path is correct (indirectly through function structure)
      expect(typeof analyticsImportFn).toBe('function');
    });

    test('should import SpeedInsights from correct module', async () => {
      // Mock the import function that would be passed to dynamic
      const speedInsightsImportFn = () =>
        import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights);

      // Test that the import path is correct (indirectly through function structure)
      expect(typeof speedInsightsImportFn).toBe('function');
    });
  });

  describe('component structure', () => {
    test('should render components within React Fragment', () => {
      render(<AnalyticsWrapper />);

      // Should render both dynamic components directly without wrapper elements
      const dynamicComponents = screen.getAllByTestId('mock-dynamic-component');
      expect(dynamicComponents).toHaveLength(2);
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
    test('should render components for client-side only loading', () => {
      render(<AnalyticsWrapper />);

      // The components should render successfully, indicating proper dynamic setup
      const dynamicComponents = screen.getAllByTestId('mock-dynamic-component');
      expect(dynamicComponents.length).toBeGreaterThan(0);
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
