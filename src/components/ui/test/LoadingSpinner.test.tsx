import React from 'react';
import { render, screen } from '@testing-library/react';
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
      const { container } = render(<LoadingSpinner />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('h-8', 'w-8');
    });

    test('should apply small size variant', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('h-4', 'w-4');
    });

    test('should apply large size variant', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('h-12', 'w-12');
    });

    test('should apply extra large size variant', () => {
      const { container } = render(<LoadingSpinner size="xl" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('h-16', 'w-16');
    });
  });

  describe('color variants', () => {
    test('should apply default color classes', () => {
      const { container } = render(<LoadingSpinner />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('border-white');
    });

    test('should apply primary color variant', () => {
      const { container } = render(<LoadingSpinner color="primary" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('border-primary');
    });

    test('should apply secondary color variant', () => {
      const { container } = render(<LoadingSpinner color="secondary" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('border-secondary');
    });

    test('should apply accent color variant', () => {
      const { container } = render(<LoadingSpinner color="accent" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('border-accent');
    });

    test('should apply muted color variant', () => {
      const { container } = render(<LoadingSpinner color="muted" />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('border-muted-foreground');
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
      const { container } = render(<LoadingSpinner />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass(
        'animate-spin',
        'rounded-full',
        'border-b-2',
        'will-change-transform'
      );
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
      const { container } = render(
        <LoadingSpinner size="lg" color="primary" />
      );

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('h-12', 'w-12', 'border-primary');
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
      const spinnerElement = container.querySelector('.animate-spin');

      // Check container
      expect(container).toHaveClass('custom-class');
      expect(container).not.toHaveClass('h-full', 'w-full');
      expect(container).toHaveAttribute('aria-label', 'Custom loader');

      // Check spinner
      expect(spinnerElement).toHaveClass('h-16', 'w-16', 'border-accent');
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

    test('should handle onClick events', () => {
      const handleClick = jest.fn();
      render(<LoadingSpinner onClick={handleClick} />);

      const spinner = screen.getByRole('status');
      spinner.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance optimization', () => {
    test('should use will-change-transform for GPU acceleration', () => {
      const { container } = render(<LoadingSpinner />);

      const spinnerElement = container.querySelector('.animate-spin');
      expect(spinnerElement).toHaveClass('will-change-transform');
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

      const srText = screen.getByText('');
      expect(srText).toHaveClass('sr-only');
    });

    test('should maintain consistent structure with minimal props', () => {
      const { container } = render(<LoadingSpinner />);

      expect(container.firstChild).toHaveAttribute('role', 'status');
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      expect(container.querySelector('.sr-only')).toBeInTheDocument();
    });
  });
});
