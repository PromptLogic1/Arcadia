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
  describe('rendering', () => {
    test('should render without children', () => {
      const { container } = render(<CyberpunkBackground />);

      expect(container.firstChild).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('relative');
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
      const { container } = render(
        <CyberpunkBackground className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    test('should accept and apply id prop', () => {
      const { container } = render(<CyberpunkBackground id="test-id" />);

      expect(container.firstChild).toHaveAttribute('id', 'test-id');
    });

    test('children should have relative z-10 wrapper', () => {
      const { container } = render(
        <CyberpunkBackground>
          <div>Test</div>
        </CyberpunkBackground>
      );

      const childWrapper = container.querySelector('.relative.z-10');
      expect(childWrapper).toBeInTheDocument();
      expect(childWrapper).toHaveTextContent('Test');
    });
  });

  describe('variant: grid', () => {
    test('should render grid variant by default', () => {
      const { container } = render(<CyberpunkBackground />);

      const gridElement = container.querySelector('[style*="linear-gradient"]');
      expect(gridElement).toBeInTheDocument();
    });

    test('should apply grid background styles', () => {
      const { container } = render(<CyberpunkBackground variant="grid" />);

      const gridElement = container.querySelector('[style*="linear-gradient"]');
      expect(gridElement).toHaveStyle({
        backgroundSize: '50px 50px',
      });
      expect(gridElement?.getAttribute('style')).toContain(
        'rgba(6,182,212,0.05)'
      );
    });

    test('should have mask image for gradient effect', () => {
      const { container } = render(<CyberpunkBackground variant="grid" />);

      const gridElement = container.querySelector('[style*="linear-gradient"]');
      expect(gridElement).toHaveClass(
        '[mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]'
      );
    });
  });

  describe('variant: circuit', () => {
    test('should render circuit variant', () => {
      const { container } = render(<CyberpunkBackground variant="circuit" />);

      const circuitElement = container.querySelector(
        '[style*="linear-gradient"]'
      );
      expect(circuitElement).toBeInTheDocument();
    });

    test('should apply circuit background styles', () => {
      const { container } = render(<CyberpunkBackground variant="circuit" />);

      const circuitElement = container.querySelector(
        '[style*="linear-gradient"]'
      );
      expect(circuitElement).toHaveStyle({
        backgroundSize: '100px 100px',
      });
      expect(circuitElement?.getAttribute('style')).toContain(
        'rgba(6,182,212,0.05)'
      );
    });
  });

  describe('variant: particles', () => {
    test('should render particles variant', () => {
      const { container } = render(<CyberpunkBackground variant="particles" />);

      const particleElements = container.querySelectorAll('.bg-cyan-400\\/20');
      expect(particleElements.length).toBeGreaterThan(0);
    });

    test('should render 5 particles', () => {
      const { container } = render(<CyberpunkBackground variant="particles" />);

      const particleElements = container.querySelectorAll('.bg-cyan-400\\/20');
      expect(particleElements).toHaveLength(5);
    });

    test('particles should have consistent properties', () => {
      const { container } = render(<CyberpunkBackground variant="particles" />);

      const particleElements = container.querySelectorAll('.bg-cyan-400\\/20');
      particleElements.forEach(particle => {
        expect(particle).toHaveClass('absolute', 'h-1', 'w-1', 'rounded-full');
        expect(particle).toHaveStyle({ transform: 'translate3d(0, 0, 0)' });
      });
    });

    test('particles should have responsive visibility classes', () => {
      const { container } = render(<CyberpunkBackground variant="particles" />);

      const particleElements = container.querySelectorAll('.bg-cyan-400\\/20');
      // Particles at index 3 and 4 should have mobile hide classes
      expect(particleElements[3]).toHaveClass('hidden', 'md:block');
      expect(particleElements[4]).toHaveClass('hidden', 'md:block');
    });

    test('should have overflow-hidden container', () => {
      const { container } = render(<CyberpunkBackground variant="particles" />);

      const particleContainer = container.querySelector('.overflow-hidden');
      expect(particleContainer).toBeInTheDocument();
      expect(particleContainer).toHaveClass(
        'absolute',
        'inset-0',
        'will-change-transform'
      );
    });
  });

  describe('intensity prop', () => {
    test('should use subtle intensity by default', () => {
      const { container } = render(<CyberpunkBackground variant="grid" />);

      const gridElement = container.querySelector('[style*="linear-gradient"]');
      expect(gridElement?.getAttribute('style')).toContain(
        'rgba(6,182,212,0.05)'
      );
    });

    test('should apply medium intensity', () => {
      const { container } = render(
        <CyberpunkBackground variant="grid" intensity="medium" />
      );

      const gridElement = container.querySelector('[style*="linear-gradient"]');
      expect(gridElement?.getAttribute('style')).toContain(
        'rgba(6,182,212,0.1)'
      );
    });

    test('intensity should affect circuit variant', () => {
      const { container } = render(
        <CyberpunkBackground variant="circuit" intensity="medium" />
      );

      const circuitElement = container.querySelector(
        '[style*="linear-gradient"]'
      );
      expect(circuitElement?.getAttribute('style')).toContain(
        'rgba(6,182,212,0.1)'
      );
    });
  });

  describe('animation prop', () => {
    test('should be animated by default', () => {
      const { container } = render(<CyberpunkBackground variant="grid" />);

      const animatedElement = container.querySelector('.animate-pulse');
      expect(animatedElement).toBeInTheDocument();
      expect(animatedElement).toHaveClass('motion-reduce:animate-none');
    });

    test('should disable animation when animated=false', () => {
      const { container } = render(
        <CyberpunkBackground variant="grid" animated={false} />
      );

      const animatedElement = container.querySelector('.animate-pulse');
      expect(animatedElement).not.toBeInTheDocument();
    });

    test('should apply float animation to particles when animated', () => {
      const { container } = render(
        <CyberpunkBackground variant="particles" animated={true} />
      );

      const particleElements = container.querySelectorAll('.animate-float');
      expect(particleElements.length).toBeGreaterThan(0);
      particleElements.forEach(particle => {
        expect(particle).toHaveClass('motion-reduce:animate-none');
      });
    });

    test('should not apply float animation to particles when animated=false', () => {
      const { container } = render(
        <CyberpunkBackground variant="particles" animated={false} />
      );

      const particleElements = container.querySelectorAll('.animate-float');
      expect(particleElements).toHaveLength(0);
    });
  });

  describe('performance optimizations', () => {
    test('should use will-change-transform for GPU acceleration', () => {
      const { container } = render(<CyberpunkBackground variant="grid" />);

      const transformElement = container.querySelector(
        '.will-change-transform'
      );
      expect(transformElement).toBeInTheDocument();
    });

    test('particles should have translate3d for hardware acceleration', () => {
      const { container } = render(<CyberpunkBackground variant="particles" />);

      const particleElements = container.querySelectorAll('.bg-cyan-400\\/20');
      particleElements.forEach(particle => {
        expect(particle).toHaveStyle({ transform: 'translate3d(0, 0, 0)' });
      });
    });

    test('should be memoized component', () => {
      expect(CyberpunkBackground.displayName).toBe('CyberpunkBackground');
    });
  });

  describe('accessibility', () => {
    test('should support motion-reduce preferences', () => {
      const { container } = render(<CyberpunkBackground animated={true} />);

      const animatedElements = container.querySelectorAll(
        '[class*="motion-reduce:animate-none"]'
      );
      expect(animatedElements.length).toBeGreaterThan(0);
    });

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
      const { container } = render(
        // @ts-expect-error - Testing invalid variant
        <CyberpunkBackground variant="invalid" />
      );

      // Should render container but no background elements
      expect(container.firstChild).toHaveClass('relative');
      const backgroundElements = container.querySelectorAll(
        '[style*="linear-gradient"], .bg-cyan-400\\/20'
      );
      expect(backgroundElements).toHaveLength(0);
    });

    test('should maintain consistent particle positions across renders', () => {
      const { container: container1 } = render(
        <CyberpunkBackground variant="particles" />
      );
      const { container: container2 } = render(
        <CyberpunkBackground variant="particles" />
      );

      const particles1 = container1.querySelectorAll('.bg-cyan-400\\/20');
      const particles2 = container2.querySelectorAll('.bg-cyan-400\\/20');

      // Should have same number of particles
      expect(particles1).toHaveLength(particles2.length);

      // Should have deterministic positions (same seed)
      particles1.forEach((particle1, index) => {
        const particle2 = particles2[index];
        expect(particle1.getAttribute('style')).toBe(
          particle2.getAttribute('style')
        );
      });
    });
  });
});
