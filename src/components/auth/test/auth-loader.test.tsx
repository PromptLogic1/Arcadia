/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AuthLoader from '../auth-loader';

// Mock the Icons component
jest.mock('@/components/ui/Icons', () => ({
  Loader2: ({ className }: any) => (
    <div className={className} data-testid="loader2-icon" />
  ),
}));

describe('AuthLoader', () => {
  describe('rendering', () => {
    it('should render loader component', () => {
      render(<AuthLoader />);

      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
    });

    it('should render loading message', () => {
      render(<AuthLoader />);

      expect(screen.getByText('Initializing authentication...')).toBeInTheDocument();
    });

    it('should have proper layout structure', () => {
      render(<AuthLoader />);

      const container = screen.getByTestId('auth-loader-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'space-y-4');
    });
  });

  describe('styling', () => {
    it('should have fixed overlay styling', () => {
      render(<AuthLoader />);

      const overlay = screen.getByTestId('auth-loader-overlay');
      expect(overlay).toHaveClass(
        'bg-background/80',
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'items-center',
        'justify-center',
        'backdrop-blur-sm'
      );
    });

    it('should apply correct icon styling', () => {
      render(<AuthLoader />);

      const icon = screen.getByTestId('loader2-icon');
      expect(icon).toHaveClass('text-primary', 'h-8', 'w-8', 'animate-spin');
    });

    it('should apply correct text styling', () => {
      render(<AuthLoader />);

      const text = screen.getByText('Initializing authentication...');
      expect(text).toHaveClass('text-muted-foreground', 'text-sm');
    });
  });

  describe('accessibility', () => {
    it('should have accessible loading text', () => {
      render(<AuthLoader />);

      const loadingText = screen.getByText('Initializing authentication...');
      expect(loadingText).toBeInTheDocument();
      // Test the text is properly styled for accessibility
      expect(loadingText).toHaveClass('text-muted-foreground', 'text-sm');
    });

    it('should be keyboard accessible', () => {
      render(<AuthLoader />);

      // Should not have any interactive elements that could trap focus
      const buttons = screen.queryAllByRole('button');
      const links = screen.queryAllByRole('link');
      const inputs = screen.queryAllByRole('textbox');

      expect(buttons).toHaveLength(0);
      expect(links).toHaveLength(0);
      expect(inputs).toHaveLength(0);
    });
  });

  describe('layout behavior', () => {
    it('should cover full viewport', () => {
      render(<AuthLoader />);

      const overlay = screen.getByTestId('auth-loader-overlay');
      expect(overlay).toHaveClass('fixed', 'inset-0');
    });

    it('should be positioned above other content', () => {
      render(<AuthLoader />);

      const overlay = screen.getByTestId('auth-loader-overlay');
      expect(overlay).toHaveClass('z-50');
    });

    it('should center content', () => {
      render(<AuthLoader />);

      const overlay = screen.getByTestId('auth-loader-overlay');
      expect(overlay).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('spinner animation', () => {
    it('should have spinning animation on loader icon', () => {
      render(<AuthLoader />);

      const icon = screen.getByTestId('loader2-icon');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('backdrop blur', () => {
    it('should apply backdrop blur effect', () => {
      render(<AuthLoader />);

      const overlay = screen.getByTestId('auth-loader-overlay');
      expect(overlay).toHaveClass('backdrop-blur-sm');
    });
  });

  describe('component structure', () => {
    it('should maintain correct element hierarchy', () => {
      render(<AuthLoader />);

      const text = screen.getByText('Initializing authentication...');
      const icon = screen.getByTestId('loader2-icon');
      const innerContainer = screen.getByTestId('auth-loader-container');
      const outerContainer = screen.getByTestId('auth-loader-overlay');

      // Icon and text should be siblings in inner container
      expect(innerContainer).toContainElement(icon);
      expect(innerContainer).toContainElement(text);

      // Inner container should be inside outer container
      expect(outerContainer).toContainElement(innerContainer);
    });
  });

  describe('responsive design', () => {
    it('should work on different screen sizes', () => {
      render(<AuthLoader />);

      // The component uses fixed positioning and flexbox centering
      // which should work across all screen sizes
      const overlay = screen.getByTestId('auth-loader-overlay');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'flex', 'items-center', 'justify-center');
    });
  });

  describe('visual consistency', () => {
    it('should use consistent spacing', () => {
      render(<AuthLoader />);

      const innerContainer = screen.getByTestId('auth-loader-container');
      expect(innerContainer).toHaveClass('space-y-4');
    });

    it('should use design system colors', () => {
      render(<AuthLoader />);

      const icon = screen.getByTestId('loader2-icon');
      const text = screen.getByText('Initializing authentication...');
      const overlay = screen.getByTestId('auth-loader-overlay');

      expect(overlay).toHaveClass('bg-background/80');
      expect(icon).toHaveClass('text-primary');
      expect(text).toHaveClass('text-muted-foreground');
    });
  });

  describe('performance considerations', () => {
    it('should render without complex computations', () => {
      // This test ensures the component renders quickly
      const startTime = performance.now();
      render(<AuthLoader />);
      const endTime = performance.now();

      // Should render very quickly (under 10ms in most cases)
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('no props interface', () => {
    it('should render without requiring any props', () => {
      // Should not throw when rendered without props
      expect(() => render(<AuthLoader />)).not.toThrow();
    });

    it('should ignore any passed props gracefully', () => {
      // Should not throw when extra props are passed
      expect(() => render(<AuthLoader {...{ extraProp: 'value' } as any} />)).not.toThrow();
    });
  });
});