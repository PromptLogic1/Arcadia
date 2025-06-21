/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

// Mock Next.js dynamic
jest.mock('next/dynamic', () => {
  return (_fn: any, _options: any) => {
    const Component = () => <div data-testid="floating-elements" />;
    return Component;
  };
});

// Mock UI components
jest.mock('@/components/ui/Icons', () => ({
  GamepadIcon: ({ className }: any) => <div className={className} data-testid="gamepad-icon" />,
}));

jest.mock('@/components/ui/NeonText', () => ({
  NeonText: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/CyberpunkBackground', () => {
  return ({ children, variant, intensity, className, ...props }: any) => (
    <div className={className} data-variant={variant} data-intensity={intensity} {...props}>
      {children}
    </div>
  );
});

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock current year to be consistent
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render footer with brand section', () => {
      render(<Footer />);

      expect(screen.getByTestId('gamepad-icon')).toBeInTheDocument();
      expect(screen.getByText('Arcadia')).toBeInTheDocument();
      expect(screen.getByText(/The ultimate cyberpunk gaming platform/)).toBeInTheDocument();
    });

    it('should render all navigation sections', () => {
      render(<Footer />);

      // Platform section
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('About Arcadia')).toBeInTheDocument();
      expect(screen.getByText('Challenge Hub')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Play Area')).toBeInTheDocument();

      // Support section
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('Help Center')).toBeInTheDocument();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
      expect(screen.getByText('Bug Reports')).toBeInTheDocument();

      // Legal section
      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
      expect(screen.getByText('Community Guidelines')).toBeInTheDocument();
    });

    it('should render social links', () => {
      render(<Footer />);

      const socialLinks = [
        { text: 'G', label: 'GitHub' },
        { text: 'T', label: 'Twitter' },
        { text: 'D', label: 'Discord' },
        { text: 'E', label: 'Email' },
      ];

      socialLinks.forEach(({ text, label }) => {
        const link = screen.getByLabelText(label);
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });

    it('should render live stats section', () => {
      render(<Footer />);

      expect(screen.getByText('Live Stats')).toBeInTheDocument();
      expect(screen.getByText('10K+')).toBeInTheDocument();
      expect(screen.getAllByText(/Players/)).toHaveLength(2); // Both responsive variants
      expect(screen.getByText('500+')).toBeInTheDocument();
      expect(screen.getByText('Challenges')).toBeInTheDocument();
      expect(screen.getByText('24/7')).toBeInTheDocument();
      expect(screen.getByText('Live Games')).toBeInTheDocument(); // Desktop variant
      expect(screen.getByText('Live')).toBeInTheDocument(); // Mobile variant
    });

    it('should render copyright and version information', () => {
      render(<Footer />);

      expect(screen.getByText('© 2024 Arcadia. All rights reserved.')).toBeInTheDocument();
      expect(screen.getByText(/Built with 💖 for the gaming community/)).toBeInTheDocument();
      expect(screen.getByText('v2.0.0')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should render background components', () => {
      render(<Footer />);

      expect(screen.getByTestId('floating-elements')).toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('should have correct href attributes for platform links', () => {
      render(<Footer />);

      const platformLinks = [
        { text: 'About Arcadia', href: '/about', testId: 'footer-platform-link-about' },
        { text: 'Challenge Hub', href: '/challenge-hub', testId: 'footer-platform-link-challenge-hub' },
        { text: 'Community', href: '/community', testId: 'footer-platform-link-community' },
        { text: 'Play Area', href: '/play-area', testId: 'footer-platform-link-play-area' },
      ];

      platformLinks.forEach(({ text, href, testId }) => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveAttribute('href', href);
        expect(link).toHaveTextContent(text);
      });
    });

    it('should have correct href attributes for support links', () => {
      render(<Footer />);

      const supportLinks = [
        { text: 'Help Center', href: '/help', testId: 'footer-support-link-help' },
        { text: 'Contact Us', href: '/contact', testId: 'footer-support-link-contact' },
        { text: 'Feedback', href: '/feedback', testId: 'footer-support-link-feedback' },
        { text: 'Bug Reports', href: '/bug-report', testId: 'footer-support-link-bug-report' },
      ];

      supportLinks.forEach(({ text, href, testId }) => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveAttribute('href', href);
        expect(link).toHaveTextContent(text);
      });
    });

    it('should have correct href attributes for legal links', () => {
      render(<Footer />);

      const legalLinks = [
        { text: 'Privacy Policy', href: '/privacy', testId: 'footer-legal-link-privacy' },
        { text: 'Terms of Service', href: '/terms', testId: 'footer-legal-link-terms' },
        { text: 'Cookie Policy', href: '/cookies', testId: 'footer-legal-link-cookies' },
        { text: 'Community Guidelines', href: '/community-guidelines', testId: 'footer-legal-link-community-guidelines' },
      ];

      legalLinks.forEach(({ text, href, testId }) => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveAttribute('href', href);
        expect(link).toHaveTextContent(text);
      });
    });

    it('should have correct href attributes for social links', () => {
      render(<Footer />);

      const socialLinks = [
        { label: 'GitHub', href: 'https://github.com/arcadia' },
        { label: 'Twitter', href: 'https://twitter.com/arcadia' },
        { label: 'Discord', href: 'https://discord.gg/arcadia' },
        { label: 'Email', href: 'mailto:hello@arcadia.com' },
      ];

      socialLinks.forEach(({ label, href }) => {
        const link = screen.getByLabelText(label);
        expect(link).toHaveAttribute('href', href);
      });
    });
  });

  describe('responsive design elements', () => {
    it('should render responsive text for players stat', () => {
      render(<Footer />);

      // Should have both variants for responsive display
      expect(screen.getByText('Active Players')).toBeInTheDocument();
      expect(screen.getByText('Players')).toBeInTheDocument();
    });

    it('should render responsive text for live games stat', () => {
      render(<Footer />);

      // Should have both variants for responsive display
      expect(screen.getByText('Live Games')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('should have accessible social links', () => {
      render(<Footer />);

      const socialLinks = ['GitHub', 'Twitter', 'Discord', 'Email'];
      
      socialLinks.forEach((label) => {
        const link = screen.getByLabelText(label);
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('aria-label', label);
      });
    });

    it('should have proper heading hierarchy', () => {
      render(<Footer />);

      expect(screen.getByRole('heading', { name: 'Platform' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Live Stats' })).toBeInTheDocument();
    });
  });

  describe('branding', () => {
    it('should render logo with correct link', () => {
      render(<Footer />);

      const logoLink = screen.getByTestId('footer-brand-link');
      expect(logoLink).toHaveAttribute('href', '/');
      expect(logoLink).toHaveTextContent('Arcadia');
    });

    it('should render brand description', () => {
      render(<Footer />);

      const description = screen.getByText(/The ultimate cyberpunk gaming platform featuring real-time multiplayer bingo/);
      expect(description).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    it('should render all stats with proper formatting', () => {
      render(<Footer />);

      const stats = [
        { value: '10K+', label: 'Players' },
        { value: '500+', label: 'Challenges' },
        { value: '24/7', label: 'Live' },
      ];

      stats.forEach(({ value, label }) => {
        expect(screen.getByText(value)).toBeInTheDocument();
        expect(screen.getAllByText(new RegExp(label)).length).toBeGreaterThan(0);
      });
    });

    it('should render stats with proper emojis', () => {
      render(<Footer />);

      expect(screen.getByText('👥')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });
  });

  describe('version and status indicators', () => {
    it('should display version number', () => {
      render(<Footer />);

      expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    });

    it('should display online status', () => {
      render(<Footer />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  describe('layout components', () => {
    it('should render CyberpunkBackground with correct props', () => {
      render(<Footer />);

      // Find the CyberpunkBackground by its test id
      const background = screen.getByTestId('footer-cyberpunk-background');
      expect(background).toBeInTheDocument();
      expect(background).toHaveAttribute('data-variant', 'circuit');
      expect(background).toHaveAttribute('data-intensity', 'medium');
    });

    it('should render FloatingElements', () => {
      render(<Footer />);

      expect(screen.getByTestId('floating-elements')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle dynamic year correctly', () => {
      jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2025);
      
      render(<Footer />);

      expect(screen.getByText('© 2025 Arcadia. All rights reserved.')).toBeInTheDocument();
    });

    it('should render all sections even with minimal content', () => {
      render(<Footer />);

      // Ensure all major sections are present
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByText('Live Stats')).toBeInTheDocument();
    });
  });
});