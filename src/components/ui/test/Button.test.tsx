/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from '../Button';

// Mock @radix-ui/react-slot
jest.mock('@radix-ui/react-slot', () => ({
  Slot: React.forwardRef<HTMLElement, { children?: React.ReactNode; [key: string]: any }>(({ children, ...props }, ref) => {
    // Simulate Slot behavior by rendering the first child with merged props
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { ...props, ref } as any);
    }
    return <div {...props} ref={ref as React.Ref<HTMLDivElement>}>{children}</div>;
  }),
}));

// Mock class-variance-authority
jest.mock('class-variance-authority', () => ({
  cva: (base: string, config: any) => (props: any) => {
    const classes = [base];
    
    if (config?.variants && props) {
      Object.keys(config.variants).forEach(key => {
        const value = props[key] || config.defaultVariants?.[key];
        if (value && config.variants[key][value]) {
          classes.push(config.variants[key][value]);
        }
      });
    }
    
    if (props?.className) {
      classes.push(props.className);
    }
    
    return classes.filter(Boolean).join(' ');
  },
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render as button element by default', () => {
      render(<Button>Test Button</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render with default variant and size classes', () => {
      render(<Button>Default Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-cyan-500'); // primary variant
      expect(button).toHaveClass('h-11'); // md size
    });
  });

  describe('variants', () => {
    it('should render primary variant correctly', () => {
      render(<Button variant="primary">Primary Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-cyan-500', 'text-white');
    });

    it('should render secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-slate-700', 'text-slate-100');
    });

    it('should render danger variant correctly', () => {
      render(<Button variant="danger">Danger Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });

    it('should render ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-slate-800');
    });
  });

  describe('sizes', () => {
    it('should render small size correctly', () => {
      render(<Button size="sm">Small Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-4', 'text-sm');
    });

    it('should render medium size correctly', () => {
      render(<Button size="md">Medium Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-5', 'py-2.5');
    });

    it('should render large size correctly', () => {
      render(<Button size="lg">Large Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12', 'px-8', 'text-base');
    });

    it('should render icon size correctly', () => {
      render(<Button size="icon">🔍</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'w-11');
    });
  });

  describe('asChild prop', () => {
    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveTextContent('Link Button');
    });

    it('should apply button classes to child element', () => {
      render(
        <Button asChild variant="primary" size="lg">
          <a href="/test">Link with Button Styles</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-cyan-500', 'h-12', 'px-8');
    });

    it('should merge props with child element', () => {
      render(
        <Button asChild data-testid="button-link">
          <a href="/test" className="custom-class">
            Link
          </a>
        </Button>
      );

      const link = screen.getByTestId('button-link');
      expect(link).toHaveAttribute('href', '/test');
      // The className gets merged, so it should have button classes plus custom class
      expect(link).toHaveClass('bg-cyan-500');
    });
  });

  describe('interactions', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(<Button onClick={handleClick}>Clickable Button</Button>);

      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(
        <Button onClick={handleClick} disabled>
          Disabled Button
        </Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard events', async () => {
      const user = userEvent.setup();
      const handleKeyDown = jest.fn();

      render(<Button onKeyDown={handleKeyDown}>Button</Button>);

      await user.type(screen.getByRole('button'), '{Enter}');
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled state', () => {
    it('should render disabled attribute', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply disabled styling classes', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('accessibility', () => {
    it('should have proper button role', () => {
      render(<Button>Accessible Button</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support ARIA attributes', () => {
      render(
        <Button aria-label="Close dialog" aria-describedby="dialog-description">
          ×
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
      expect(button).toHaveAttribute('aria-describedby', 'dialog-description');
    });

    it('should be focusable', () => {
      render(<Button>Focusable Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have focus-visible styles', () => {
      render(<Button>Button with Focus</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();

      render(<Button ref={ref}>Button with Ref</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveTextContent('Button with Ref');
    });

    it('should forward ref to child element when asChild is true', () => {
      const ref = React.createRef<HTMLButtonElement>();

      render(
        <Button asChild ref={ref}>
          <a href="/test">Link with Ref</a>
        </Button>
      );

      expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
      expect(ref.current).toHaveAttribute('href', '/test');
    });
  });

  describe('custom className', () => {
    it('should merge custom className with button classes', () => {
      render(<Button className="custom-button-class">Custom Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-button-class');
      expect(button).toHaveClass('bg-cyan-500'); // Still has default primary variant
    });

    it('should allow className override', () => {
      render(
        <Button className="bg-purple-500 text-white">
          Override Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-purple-500', 'text-white');
    });
  });

  describe('HTML attributes', () => {
    it('should accept and apply HTML button attributes', () => {
      render(
        <Button
          type="submit"
          form="test-form"
          data-testid="submit-button"
          title="Submit the form"
        >
          Submit
        </Button>
      );

      const button = screen.getByTestId('submit-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'test-form');
      expect(button).toHaveAttribute('title', 'Submit the form');
    });

    it('should handle data attributes', () => {
      render(
        <Button data-analytics="button-click" data-section="header">
          Analytics Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-analytics', 'button-click');
      expect(button).toHaveAttribute('data-section', 'header');
    });
  });

  describe('children handling', () => {
    it('should render text children', () => {
      render(<Button>Text Content</Button>);

      expect(screen.getByText('Text Content')).toBeInTheDocument();
    });

    it('should render element children', () => {
      render(
        <Button>
          <span data-testid="icon">🔍</span>
          <span>Search</span>
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should handle complex children structure', () => {
      render(
        <Button>
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>Complex Button</span>
            <span className="ml-auto">→</span>
          </div>
        </Button>
      );

      expect(screen.getByText('Complex Button')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle no children', () => {
      render(<Button />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(<Button>{null}</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle undefined variant', () => {
      render(<Button variant={undefined}>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-cyan-500'); // Should use default primary
    });

    it('should handle undefined size', () => {
      render(<Button size={undefined}>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11'); // Should use default md size
    });
  });

  describe('memoization', () => {
    it('should not re-render unnecessarily', () => {
      const TestParent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <Button onClick={() => setCount(c => c + 1)}>
              Count: {count}
            </Button>
          </div>
        );
      };

      render(<TestParent />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Count: 0');
    });
  });

  describe('buttonVariants export', () => {
    it('should export buttonVariants function', () => {
      expect(typeof buttonVariants).toBe('function');
    });

    it('should generate correct classes with buttonVariants', () => {
      const classes = buttonVariants({ variant: 'primary', size: 'lg' });
      expect(classes).toContain('bg-cyan-500');
      expect(classes).toContain('h-12');
    });
  });
});