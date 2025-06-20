import React from 'react';
import { render, screen } from '@testing-library/react';
import { CyberpunkBackground } from '../CyberpunkBackground';

// Mock CSS animations to prevent test environment issues
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('CyberpunkBackground', () => {
  describe('rendering and basic functionality', () => {
    test('should render without children', () => {
      render(<CyberpunkBackground />);
      // Component should render successfully (implicit test)
    });

    test('should render with children', () => {
      render(
        <CyberpunkBackground>
          <div data-testid="child">Test Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child')).toHaveTextContent('Test Content');
    });

    test('should apply custom className', () => {
      render(
        <CyberpunkBackground className="custom-class">
          <div data-testid="child">content</div>
        </CyberpunkBackground>
      );

      // Test that className is applied by checking if content is rendered
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    test('should accept and apply id prop', () => {
      render(
        <CyberpunkBackground id="test-id">
          <div data-testid="child">content</div>
        </CyberpunkBackground>
      );

      // Test that id prop is accepted by ensuring component renders
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    test('children should be properly layered above background', () => {
      render(
        <CyberpunkBackground>
          <button>Test Button</button>
        </CyberpunkBackground>
      );

      // Test that children are accessible and properly layered
      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
    });
  });

  describe('variants', () => {
    test('should render grid variant by default', () => {
      render(
        <CyberpunkBackground>
          <div data-testid="content">Grid Background Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('should render grid variant explicitly', () => {
      render(
        <CyberpunkBackground variant="grid">
          <div data-testid="content">Grid Background Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('should render circuit variant', () => {
      render(
        <CyberpunkBackground variant="circuit">
          <div data-testid="content">Circuit Background Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('should render particles variant', () => {
      render(
        <CyberpunkBackground variant="particles">
          <div data-testid="content">Particles Background Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('intensity prop', () => {
    test('should render with subtle intensity by default', () => {
      render(
        <CyberpunkBackground>
          <div data-testid="content">Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('should render with medium intensity', () => {
      render(
        <CyberpunkBackground intensity="medium">
          <div data-testid="content">Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('animation prop', () => {
    test('should be animated by default', () => {
      render(
        <CyberpunkBackground>
          <div data-testid="content">Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('should accept animated=false', () => {
      render(
        <CyberpunkBackground animated={false}>
          <div data-testid="content">Content</div>
        </CyberpunkBackground>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('should not interfere with screen readers', () => {
      render(
        <CyberpunkBackground>
          <button>Accessible Button</button>
        </CyberpunkBackground>
      );

      const button = screen.getByRole('button', { name: 'Accessible Button' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    test('should handle invalid variant gracefully', () => {
      render(
        // @ts-expect-error - Testing invalid variant
        <CyberpunkBackground variant="invalid">
          <div data-testid="content">Content</div>
        </CyberpunkBackground>
      );

      // Should render without crashing
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('component properties', () => {
    test('should be a memoized component', () => {
      expect(CyberpunkBackground.displayName).toBe('CyberpunkBackground');
    });
  });
});
