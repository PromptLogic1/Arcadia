import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NeonButton } from '../NeonButton';

describe('NeonButton', () => {
  describe('rendering', () => {
    test('should render children correctly', () => {
      render(<NeonButton>Test Button</NeonButton>);

      expect(
        screen.getByRole('button', { name: 'Test Button' })
      ).toBeInTheDocument();
    });

    test('should render with custom className', () => {
      render(<NeonButton className="custom-class">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    test('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<NeonButton ref={ref}>Test</NeonButton>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    test('should properly layer children content', () => {
      render(<NeonButton>Test Content</NeonButton>);

      // Test that the button content is properly accessible
      const button = screen.getByRole('button', { name: 'Test Content' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Test Content');
    });
  });

  describe('intensity variants', () => {
    test('should apply default intensity classes', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:scale-[1.02]', 'active:scale-[0.98]');
    });

    test('should apply none intensity variant', () => {
      render(<NeonButton intensity="none">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('hover:scale-[1.02]');
    });

    test('should apply subtle intensity variant', () => {
      render(<NeonButton intensity="subtle">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:scale-[1.01]', 'active:scale-[0.99]');
    });

    test('should apply strong intensity variant', () => {
      render(<NeonButton intensity="strong">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:scale-[1.03]', 'active:scale-[0.97]');
    });
  });

  describe('glow variants', () => {
    test('should apply default rainbow glow classes', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('before:from-cyan-500/50');
      expect(button).toHaveClass('before:via-fuchsia-500/50');
      expect(button).toHaveClass('before:to-cyan-500/50');
    });

    test('should apply cyan glow variant', () => {
      render(<NeonButton glow="cyan">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('before:from-cyan-500/50');
      expect(button).toHaveClass('before:via-cyan-400/50');
      expect(button).toHaveClass('before:to-cyan-500/50');
    });

    test('should apply fuchsia glow variant', () => {
      render(<NeonButton glow="fuchsia">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('before:from-fuchsia-500/50');
      expect(button).toHaveClass('before:via-fuchsia-400/50');
      expect(button).toHaveClass('before:to-fuchsia-500/50');
    });

    test('should apply primary glow variant', () => {
      render(<NeonButton glow="primary">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('before:from-primary/50');
      expect(button).toHaveClass('before:via-primary/70');
      expect(button).toHaveClass('before:to-primary/50');
    });
  });

  describe('overlay variants', () => {
    test('should apply default overlay classes', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('after:from-cyan-500');
      expect(button).toHaveClass('after:to-fuchsia-500');
      expect(button).toHaveClass('after:opacity-20');
      expect(button).toHaveClass('group-hover:after:opacity-30');
    });

    test('should apply none overlay variant', () => {
      render(<NeonButton overlay="none">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('after:opacity-20');
    });

    test('should apply subtle overlay variant', () => {
      render(<NeonButton overlay="subtle">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('after:from-current');
      expect(button).toHaveClass('after:to-current');
      expect(button).toHaveClass('after:opacity-5');
      expect(button).toHaveClass('group-hover:after:opacity-10');
    });

    test('should apply strong overlay variant', () => {
      render(<NeonButton overlay="strong">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('after:opacity-30');
      expect(button).toHaveClass('group-hover:after:opacity-40');
    });
  });

  describe('base button functionality', () => {
    test('should handle click events', async () => {
      const handleClick = jest.fn();
      render(<NeonButton onClick={handleClick}>Test</NeonButton>);

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('should be disabled when disabled prop is true', () => {
      render(<NeonButton disabled>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('should accept button type attribute', () => {
      render(<NeonButton type="submit">Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('accessibility', () => {
    test('should support aria-label', () => {
      render(<NeonButton aria-label="Custom Label">Test</NeonButton>);

      const button = screen.getByRole('button', { name: 'Custom Label' });
      expect(button).toBeInTheDocument();
    });

    test('should support aria-describedby', () => {
      render(
        <div>
          <NeonButton aria-describedby="description">Test</NeonButton>
          <div id="description">Button description</div>
        </div>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });

    test('should be focusable by default', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    test('should not be focusable when disabled', () => {
      render(<NeonButton disabled>Test</NeonButton>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).not.toHaveFocus();
    });
  });

  describe('variant combinations', () => {
    test('should combine all variants correctly', () => {
      render(
        <NeonButton
          intensity="strong"
          glow="cyan"
          overlay="subtle"
          className="custom-class"
        >
          Combined Test
        </NeonButton>
      );

      const button = screen.getByRole('button');

      // Check intensity
      expect(button).toHaveClass('hover:scale-[1.03]');

      // Check glow
      expect(button).toHaveClass('before:from-cyan-500/50');

      // Check overlay
      expect(button).toHaveClass('after:from-current');
      expect(button).toHaveClass('after:opacity-5');

      // Check custom class
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('animations and transitions', () => {
    test('should have transition classes for smooth animations', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-300');
      expect(button).toHaveClass('will-change-transform');
    });

    test('should have group class for hover effects', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('group');
    });

    test('should have overflow-hidden for proper effect clipping', () => {
      render(<NeonButton>Test</NeonButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('overflow-hidden');
    });
  });

  describe('type safety', () => {
    test('should accept all standard button props', () => {
      const handleClick = jest.fn();
      render(
        <NeonButton
          onClick={handleClick}
          disabled={false}
          type="button"
          aria-label="Test button"
          data-testid="neon-button"
        >
          Test
        </NeonButton>
      );

      const button = screen.getByTestId('neon-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-label', 'Test button');
    });
  });
});
