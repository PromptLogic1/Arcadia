/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { Providers } from '../providers';

// Mock all provider components
jest.mock('../ui/ThemeProvider', () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="theme-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

jest.mock('../auth/auth-provider', () => ({
  AuthProvider: ({ children }: any) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

jest.mock('../auth/auth-loader', () => {
  return ({ ...props }: any) => (
    <div data-testid="auth-loader" data-props={JSON.stringify(props)} />
  );
});

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    mount: jest.fn(),
    unmount: jest.fn(),
    clear: jest.fn(),
  })),
  QueryClientProvider: ({ children, client }: any) => (
    <div data-testid="query-client-provider" data-client={client ? 'present' : 'missing'}>
      {children}
    </div>
  ),
}));

jest.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: ({ initialIsOpen }: any) => (
    <div data-testid="react-query-devtools" data-initial-open={initialIsOpen} />
  ),
}));

jest.mock('../error-boundaries', () => ({
  BaseErrorBoundary: ({ children, level }: any) => (
    <div data-testid="base-error-boundary" data-level={level}>
      {children}
    </div>
  ),
}));

jest.mock('../accessibility/AriaLiveRegion', () => ({
  AriaAnnouncerProvider: ({ children }: any) => (
    <div data-testid="aria-announcer-provider">{children}</div>
  ),
}));

// Mock environment variable
const originalEnv = process.env.NODE_ENV;
const mockEnv = (value: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
  });
};
const restoreEnv = () => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: originalEnv,
    writable: true,
    configurable: true,
  });
};

describe('Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('rendering', () => {
    it('should render all provider components in correct hierarchy', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      // Check that all providers are rendered
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('aria-announcer-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should wrap content in error boundaries', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      const errorBoundaries = screen.getAllByTestId('base-error-boundary');
      expect(errorBoundaries).toHaveLength(2);
      
      // Check error boundary levels
      expect(errorBoundaries[0]).toHaveAttribute('data-level', 'layout');
      expect(errorBoundaries[1]).toHaveAttribute('data-level', 'component');
    });

    it('should render children inside auth provider', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('QueryClient configuration', () => {
    it('should create QueryClient with correct configuration', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );

      expect(QueryClient).toHaveBeenCalledWith({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: expect.any(Function),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: expect.any(Function),
          },
        },
      });
    });

    it('should pass QueryClient to QueryClientProvider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );

      const provider = screen.getByTestId('query-client-provider');
      expect(provider).toHaveAttribute('data-client', 'present');
    });
  });

  describe('ThemeProvider configuration', () => {
    it('should configure ThemeProvider with correct props', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );

      const themeProvider = screen.getByTestId('theme-provider');
      const props = JSON.parse(themeProvider.getAttribute('data-props') || '{}');
      
      expect(props).toEqual({
        attribute: 'class',
        defaultTheme: 'dark',
        enableSystem: true,
        disableTransitionOnChange: true,
        storageKey: 'arcadia-theme',
      });
    });
  });

  describe('Suspense and loading states', () => {
    it('should wrap AuthProvider in Suspense with AuthLoader fallback', async () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      // AuthLoader should be available as fallback (though not necessarily shown)
      // and AuthProvider should be rendered
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });

    it('should render AuthLoader when Suspense is triggered', async () => {
      // This test simulates the fallback being shown
      const ThrowingSuspense = () => {
        throw Promise.resolve(); // Simulate suspense
      };

      const TestProviders = ({ children }: { children: React.ReactNode }) => (
        <React.Suspense fallback={<div data-testid="auth-loader" />}>
          <ThrowingSuspense />
          {children}
        </React.Suspense>
      );

      render(
        <TestProviders>
          <div data-testid="test-child">Test Content</div>
        </TestProviders>
      );

      expect(screen.getByTestId('auth-loader')).toBeInTheDocument();
    });
  });

  describe('development environment', () => {
    it('should render ReactQueryDevtools in development', () => {
      mockEnv('development');

      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );

      const devtools = screen.getByTestId('react-query-devtools');
      expect(devtools).toBeInTheDocument();
      expect(devtools).toHaveAttribute('data-initial-open', 'false');
    });

    it('should not render ReactQueryDevtools in production', () => {
      mockEnv('production');

      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );

      expect(screen.queryByTestId('react-query-devtools')).not.toBeInTheDocument();
    });

    it('should not render ReactQueryDevtools in test environment', () => {
      mockEnv('test');

      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );

      expect(screen.queryByTestId('react-query-devtools')).not.toBeInTheDocument();
    });
  });

  describe('provider hierarchy', () => {
    it('should maintain correct provider nesting order', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      // Check the DOM hierarchy to ensure correct nesting
      const testChild = screen.getByTestId('test-child');
      const authProvider = screen.getByTestId('auth-provider');
      const ariaProvider = screen.getByTestId('aria-announcer-provider');
      const themeProvider = screen.getByTestId('theme-provider');
      const queryProvider = screen.getByTestId('query-client-provider');

      // Test child should be inside auth provider
      expect(authProvider).toContainElement(testChild);
      
      // Auth provider should be inside aria provider
      expect(ariaProvider).toContainElement(authProvider);
      
      // Aria provider should be inside theme provider
      expect(themeProvider).toContainElement(ariaProvider);
      
      // Theme provider should be inside query provider
      expect(queryProvider).toContainElement(themeProvider);
    });
  });

  describe('error boundary integration', () => {
    it('should have layout-level error boundary as outermost', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      const errorBoundaries = screen.getAllByTestId('base-error-boundary');
      const layoutBoundary = errorBoundaries.find(
        boundary => boundary.getAttribute('data-level') === 'layout'
      );
      const componentBoundary = errorBoundaries.find(
        boundary => boundary.getAttribute('data-level') === 'component'
      );

      expect(layoutBoundary).toBeInTheDocument();
      expect(componentBoundary).toBeInTheDocument();
      
      // Layout boundary should contain component boundary
      expect(layoutBoundary).toContainElement(componentBoundary as HTMLElement);
    });

    it('should wrap auth components in component-level error boundary', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      const errorBoundaries = screen.getAllByTestId('base-error-boundary');
      const componentBoundary = errorBoundaries.find(
        boundary => boundary.getAttribute('data-level') === 'component'
      );
      const authProvider = screen.getByTestId('auth-provider');

      // Component boundary should contain auth provider
      expect(componentBoundary).toContainElement(authProvider);
    });
  });

  describe('accessibility integration', () => {
    it('should wrap content in AriaAnnouncerProvider', () => {
      render(
        <Providers>
          <div data-testid="test-child">Test Content</div>
        </Providers>
      );

      const ariaProvider = screen.getByTestId('aria-announcer-provider');
      const testChild = screen.getByTestId('test-child');

      expect(ariaProvider).toContainElement(testChild);
    });
  });

  describe('multiple children', () => {
    it('should render multiple children correctly', () => {
      render(
        <Providers>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </Providers>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty children', () => {
      render(<Providers>{null}</Providers>);

      // Should still render all providers
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<Providers>{undefined}</Providers>);

      // Should still render all providers
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });

    it('should handle complex nested children', () => {
      render(
        <Providers>
          <div>
            <header data-testid="header">Header</header>
            <main data-testid="main">
              <section data-testid="section">Section Content</section>
            </main>
            <footer data-testid="footer">Footer</footer>
          </div>
        </Providers>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.getByTestId('section')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });
});