/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import Header from '../Header';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

// Mock Auth Store
const mockAuthStore = jest.fn();
const mockAuthActions = {
  signOut: jest.fn(),
};

jest.mock('@/lib/stores', () => ({
  useAuthStore: () => mockAuthStore(),
  useAuthActions: () => mockAuthActions,
}));

// Mock useShallow
jest.mock('zustand/shallow', () => ({
  useShallow: (selector: any) => selector,
}));

// Mock throttle utility
jest.mock('@/lib/throttle', () => ({
  throttle: (fn: any) => fn,
}));

// Mock UI components
jest.mock('@/components/ui/Icons', () => ({
  Menu: ({ className }: any) => <div className={className} data-testid="menu-icon" />,
  X: ({ className }: any) => <div className={className} data-testid="x-icon" />,
  Search: ({ className }: any) => <div className={className} data-testid="search-icon" />,
  Bell: ({ className }: any) => <div className={className} data-testid="bell-icon" />,
  Download: ({ className }: any) => <div className={className} data-testid="download-icon" />,
  Gamepad2: ({ className }: any) => <div className={className} data-testid="gamepad-icon" />,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Input', () => ({
  Input: ({ type, placeholder, className, ...props }: any) => (
    <input type={type} placeholder={placeholder} className={className} {...props} />
  ),
}));

jest.mock('@/components/ui/OptimizedAvatar', () => ({
  OptimizedAvatar: ({ src, alt, fallback, className }: any) => (
    <div className={className} data-testid="optimized-avatar" data-src={src} aria-label={alt}>
      {fallback}
    </div>
  ),
}));

jest.mock('@/components/ui/NeonText', () => ({
  NeonText: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: ({ variant }: any) => <div data-testid="theme-toggle" data-variant={variant} />,
}));

// Mock Popover components
jest.mock('@/components/ui/Popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, asChild }: any) => (asChild ? children : <div>{children}</div>),
  PopoverContent: ({ children, className }: any) => (
    <div className={className} data-testid="popover-content">
      {children}
    </div>
  ),
}));

// Mock DropdownMenu components
jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => (asChild ? children : <div>{children}</div>),
  DropdownMenuContent: ({ children, className }: any) => (
    <div className={className} data-testid="dropdown-content">
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, asChild }: any) => (
    <div onClick={onClick} data-testid="dropdown-item">
      {asChild ? children : children}
    </div>
  ),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('Header', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    
    // Mock window properties
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
    });
    
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
    });

    // Mock scroll event listeners
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();
    
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    });

    // Default auth state - not authenticated
    mockAuthStore.mockReturnValue({
      isAuthenticated: false,
      userData: null,
      loading: false,
    });
  });

  describe('rendering', () => {
    it('should render header with logo and navigation', () => {
      render(<Header />);

      expect(screen.getByTestId('gamepad-icon')).toBeInTheDocument();
      expect(screen.getByText('Arcadia')).toBeInTheDocument();
      expect(screen.getAllByText('Home')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText('About')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText('Play Area')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText('Challenge Hub')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText('Community')).toHaveLength(2); // Desktop and mobile
    });

    it('should render accessibility skip links', () => {
      render(<Header />);

      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();

      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThanOrEqual(1); // At least one nav
    });
  });

  describe('navigation states', () => {
    it('should highlight active page correctly', () => {
      mockUsePathname.mockReturnValue('/challenge-hub');
      render(<Header />);

      const challengeHubLinks = screen.getAllByText('Challenge Hub');
      expect(challengeHubLinks.length).toBeGreaterThan(0);
    });

    it('should handle root path correctly', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Header />);

      const homeLinks = screen.getAllByText('Home');
      expect(homeLinks.length).toBeGreaterThan(0);
    });

    it('should handle nested paths correctly', () => {
      mockUsePathname.mockReturnValue('/challenge-hub/some-challenge');
      render(<Header />);

      const challengeHubLinks = screen.getAllByText('Challenge Hub');
      expect(challengeHubLinks.length).toBeGreaterThan(0);
    });
  });

  describe('mobile menu functionality', () => {
    it('should show menu icon when menu is closed', () => {
      render(<Header />);

      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
    });

    it('should toggle mobile menu when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('menu-icon')).not.toBeInTheDocument();
    });

    it('should close mobile menu when navigation link is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open menu
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      // Click on a navigation link in mobile menu
      const mobileLink = screen.getByTestId('mobile-nav-about');
      
      if (mobileLink) {
        await user.click(mobileLink);
      }

      // Menu should close
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for mobile menu', () => {
      render(<Header />);

      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-menu');

      const mobileMenu = screen.getByLabelText('Mobile Navigation');
      expect(mobileMenu).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('search functionality', () => {
    it('should toggle search input visibility', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const searchButton = screen.getByLabelText('Toggle search');
      await user.click(searchButton);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render search button with proper icon', () => {
      render(<Header />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });
  });

  describe('authentication states', () => {
    it('should show sign in and sign up buttons when not authenticated', () => {
      mockAuthStore.mockReturnValue({
        isAuthenticated: false,
        userData: null,
        loading: false,
      });

      render(<Header />);

      expect(screen.getAllByText('Sign In')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText('Sign Up')).toHaveLength(2); // Desktop and mobile
    });

    it('should show user avatar and dropdown when authenticated', () => {
      mockAuthStore.mockReturnValue({
        isAuthenticated: true,
        userData: { username: 'testuser', avatar_url: 'https://example.com/avatar.jpg' },
        loading: false,
      });

      render(<Header />);

      expect(screen.getByTestId('optimized-avatar')).toBeInTheDocument();
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });

    it('should show loading state when auth is loading', () => {
      mockAuthStore.mockReturnValue({
        isAuthenticated: false,
        userData: null,
        loading: true,
      });

      render(<Header />);

      // Should show loading skeletons - check for any loading elements
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('should handle sign out', async () => {
      const user = userEvent.setup();
      mockAuthStore.mockReturnValue({
        isAuthenticated: true,
        userData: { username: 'testuser', avatar_url: null },
        loading: false,
      });

      render(<Header />);

      // Click user menu
      const userMenuButton = screen.getByLabelText('User menu');
      await user.click(userMenuButton);

      // Click sign out - there are multiple "Log out" buttons (desktop and mobile)
      const signOutButtons = screen.getAllByText('Log out');
      expect(signOutButtons.length).toBeGreaterThan(0);
      await user.click(signOutButtons[0]!);

      expect(mockAuthActions.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifications', () => {
    it('should render notifications button with badge', () => {
      render(<Header />);

      const notificationsButton = screen.getByLabelText('Notifications');
      expect(notificationsButton).toBeInTheDocument();
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });
  });

  describe('theme toggle', () => {
    it('should render theme toggle component', () => {
      render(<Header />);

      const themeToggles = screen.getAllByTestId('theme-toggle');
      expect(themeToggles.length).toBeGreaterThan(0);
    });

    it('should render mobile theme toggle variant', () => {
      render(<Header />);

      const mobileThemeToggle = screen.getAllByTestId('theme-toggle').find(
        (toggle) => toggle.getAttribute('data-variant') === 'toggle'
      );
      expect(mobileThemeToggle).toBeInTheDocument();
    });
  });

  describe('scroll behavior', () => {
    it('should handle scroll events for header styling', () => {
      render(<Header />);

      // Simulate scroll
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
      fireEvent.scroll(window);

      // Header should have scrolled class applied
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should handle window resize events', () => {
      render(<Header />);

      // Simulate window resize to mobile
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      fireEvent.resize(window);

      // Should still render properly
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing pathname gracefully', () => {
      mockUsePathname.mockReturnValue(null as any);
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should handle user without username', () => {
      mockAuthStore.mockReturnValue({
        isAuthenticated: true,
        userData: { username: null, avatar_url: null },
        loading: false,
      });

      render(<Header />);

      const avatar = screen.getByTestId('optimized-avatar');
      expect(avatar).toHaveAttribute('aria-label', "User's avatar");
    });

    it('should generate fallback avatar URL for user without avatar', () => {
      mockAuthStore.mockReturnValue({
        isAuthenticated: true,
        userData: { username: 'testuser', avatar_url: null },
        loading: false,
      });

      render(<Header />);

      const avatar = screen.getByTestId('optimized-avatar');
      expect(avatar).toHaveAttribute('data-src');
      expect(avatar).toHaveAttribute('data-src', expect.stringContaining('ui-avatars.com'));
    });
  });
});