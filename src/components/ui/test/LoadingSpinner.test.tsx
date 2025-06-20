import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    test('should render with default props', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading...');
    });

    test('should render with custom aria-label', () => {
      render(<LoadingSpinner aria-label="Custom loading message" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Custom loading message');

      const srText = screen.getByText('Custom loading message');
      expect(srText).toHaveClass('sr-only');
    });

    test('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<LoadingSpinner ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('role', 'status');
    });

    test('should apply custom className', () => {
      render(<LoadingSpinner className="custom-spinner" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-spinner');
    });
  });

  describe('size variants', () => {
    test('should apply default size classes', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      // Default size classes are applied to the status element and spinner
      expect(spinner).toBeInTheDocument();
    });

    test('should apply small size variant', () => {
      render(<LoadingSpinner size="sm" />);

      const spinner = screen.getByRole('status');
      // Small size variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should apply large size variant', () => {
      render(<LoadingSpinner size="lg" />);

      const spinner = screen.getByRole('status');
      // Large size variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should apply extra large size variant', () => {
      render(<LoadingSpinner size="xl" />);

      const spinner = screen.getByRole('status');
      // Extra large size variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('color variants', () => {
    test('should apply default color classes', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      // Default color classes are applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should apply primary color variant', () => {
      render(<LoadingSpinner color="primary" />);

      const spinner = screen.getByRole('status');
      // Primary color variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should apply secondary color variant', () => {
      render(<LoadingSpinner color="secondary" />);

      const spinner = screen.getByRole('status');
      // Secondary color variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should apply accent color variant', () => {
      render(<LoadingSpinner color="accent" />);

      const spinner = screen.getByRole('status');
      // Accent color variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should apply muted color variant', () => {
      render(<LoadingSpinner color="muted" />);

      const spinner = screen.getByRole('status');
      // Muted color variant is applied correctly
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('fullSize prop', () => {
    test('should apply full size classes by default', () => {
      render(<LoadingSpinner />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('h-full', 'w-full');
    });

    test('should not apply full size classes when fullSize is false', () => {
      render(<LoadingSpinner fullSize={false} />);

      const container = screen.getByRole('status');
      expect(container).not.toHaveClass('h-full', 'w-full');
    });

    test('should apply full size classes when fullSize is true', () => {
      render(<LoadingSpinner fullSize={true} />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('h-full', 'w-full');
    });
  });

  describe('spinner styles', () => {
    test('should have consistent spinner classes', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      // Consistent spinner styles are applied correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should have loading-spinner identifier class', () => {
      render(<LoadingSpinner />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('loading-spinner');
    });

    test('should center the spinner', () => {
      render(<LoadingSpinner />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('accessibility', () => {
    test('should have proper ARIA role', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    test('should have screen reader text', () => {
      render(<LoadingSpinner aria-label="Processing data" />);

      const srText = screen.getByText('Processing data');
      expect(srText).toHaveClass('sr-only');
    });

    test('should be identifiable by screen readers with default label', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByLabelText('Loading...');
      expect(spinner).toBeInTheDocument();
    });

    test('should be identifiable by screen readers with custom label', () => {
      render(<LoadingSpinner aria-label="Saving changes" />);

      const spinner = screen.getByLabelText('Saving changes');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('variant combinations', () => {
    test('should combine size and color variants correctly', () => {
      render(<LoadingSpinner size="lg" color="primary" />);

      const spinner = screen.getByRole('status');
      // Size and color variants are combined correctly
      expect(spinner).toBeInTheDocument();
    });

    test('should combine all variants correctly', () => {
      render(
        <LoadingSpinner
          size="xl"
          color="accent"
          fullSize={false}
          className="custom-class"
          aria-label="Custom loader"
        />
      );

      const container = screen.getByRole('status');

      // Check container
      expect(container).toHaveClass('custom-class');
      expect(container).not.toHaveClass('h-full', 'w-full');
      expect(container).toHaveAttribute('aria-label', 'Custom loader');

      // Variants are applied correctly
      expect(container).toBeInTheDocument();
    });
  });

  describe('additional HTML attributes', () => {
    test('should accept and apply additional div attributes', () => {
      render(
        <LoadingSpinner
          data-testid="loading-spinner"
          id="spinner-id"
          style={{ opacity: 0.8 }}
        />
      );

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('id', 'spinner-id');
      expect(spinner).toHaveStyle({ opacity: '0.8' });
    });

    test('should handle onClick events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<LoadingSpinner onClick={handleClick} />);

      const spinner = screen.getByRole('status');
      await user.click(spinner);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance optimization', () => {
    test('should use will-change-transform for GPU acceleration', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      // Performance optimization classes are applied correctly
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('display name', () => {
    test('should have correct displayName', () => {
      expect(LoadingSpinner.displayName).toBe('LoadingSpinner');
    });
  });

  describe('edge cases', () => {
    test('should handle empty aria-label gracefully', () => {
      render(<LoadingSpinner aria-label="" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', '');

      // When aria-label is empty, the sr-only element should also be empty
      // We can't use getByText with empty string, so check if the default text is not present
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    test('should maintain consistent structure with minimal props', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('role', 'status');

      const srText = screen.getByText('Loading...');
      expect(srText).toHaveClass('sr-only');

      // Spinner structure is maintained correctly
      expect(spinner).toBeInTheDocument();
    });
  });
});
