import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '../ThemeToggle';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, className, onClick, disabled, ...props }: any) => (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children, className }: any) => (
    <div data-testid="dropdown-content" className={className}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="dropdown-item">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Icons', () => ({
  Sun: ({ className }: any) => (
    <span className={className} data-testid="sun-icon" />
  ),
  Moon: ({ className }: any) => (
    <span className={className} data-testid="moon-icon" />
  ),
  Monitor: ({ className }: any) => (
    <span className={className} data-testid="monitor-icon" />
  ),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hydration handling', () => {
    test('should show placeholder during initial render', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: jest.fn(),
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      const { container } = render(<ThemeToggle />);

      // During initial render, should show a disabled button with monitor icon
      const buttons = container.querySelectorAll('button');
      const placeholderButton = Array.from(buttons).find(btn => btn.disabled);
      
      if (placeholderButton) {
        expect(placeholderButton).toBeDisabled();
        expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
      }
    });

    test('should show proper content after mounting', async () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      // Wait for useEffect to run
      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      });
    });
  });

  describe('dropdown variant (default)', () => {
    test('should render dropdown with dark theme icon', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      
      // Find the trigger button specifically
      const triggerButton = screen.getByTestId('dropdown-trigger').querySelector('button');
      expect(triggerButton).toHaveAttribute('aria-label', 'Toggle theme');
    });

    test('should render dropdown with light theme icon', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: setThemeMock,
        resolvedTheme: 'light',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
      });

      render(<ThemeToggle />);

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    });

    test('should render dropdown with system theme icon', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: setThemeMock,
        resolvedTheme: 'system',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
    });

    test('should call setTheme when dropdown items are clicked', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      const dropdownItems = screen.getAllByTestId('dropdown-item');
      
      // Ensure we have the expected number of dropdown items
      expect(dropdownItems).toHaveLength(3);

      // Click light theme
      const lightThemeItem = dropdownItems[0];
      if (lightThemeItem) {
        fireEvent.click(lightThemeItem);
        expect(setThemeMock).toHaveBeenCalledWith('light');
      }

      // Click dark theme
      const darkThemeItem = dropdownItems[1];
      if (darkThemeItem) {
        fireEvent.click(darkThemeItem);
        expect(setThemeMock).toHaveBeenCalledWith('dark');
      }

      // Click system theme
      const systemThemeItem = dropdownItems[2];
      if (systemThemeItem) {
        fireEvent.click(systemThemeItem);
        expect(setThemeMock).toHaveBeenCalledWith('system');
      }
    });

    test('should highlight active theme in dropdown', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: setThemeMock,
        resolvedTheme: 'light',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
      });

      render(<ThemeToggle />);

      const dropdownItems = screen.getAllByTestId('dropdown-item');
      expect(dropdownItems[0]).toHaveClass('bg-cyan-500/20', 'text-cyan-300');
    });
  });

  describe('toggle variant', () => {
    test('should render toggle button with dark theme', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle variant="toggle" />);

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Switch to light theme' })
      ).toBeInTheDocument();
    });

    test('should render toggle button with light theme', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: setThemeMock,
        resolvedTheme: 'light',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
      });

      render(<ThemeToggle variant="toggle" />);

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Switch to dark theme' })
      ).toBeInTheDocument();
    });

    test('should toggle theme when clicked', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle variant="toggle" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(setThemeMock).toHaveBeenCalledWith('light');
    });

    test('should toggle from light to dark', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: setThemeMock,
        resolvedTheme: 'light',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'light',
      });

      render(<ThemeToggle variant="toggle" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(setThemeMock).toHaveBeenCalledWith('dark');
    });
  });

  describe('styling and accessibility', () => {
    test('should apply custom className', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      const { container } = render(<ThemeToggle className="custom-class" />);

      // Find the main trigger button
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    test('should have proper cyberpunk styling classes', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      const { container } = render(<ThemeToggle />);

      const button = container.querySelector('button');
      expect(button).toHaveClass(
        'h-11',
        'min-h-[44px]',
        'w-11',
        'min-w-[44px]',
        'rounded-full',
        'border',
        'border-cyan-500/30',
        'text-cyan-300'
      );
    });

    test('should have proper dropdown menu styling', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      const dropdownContent = screen.getByTestId('dropdown-content');
      expect(dropdownContent).toHaveClass(
        'cyber-card',
        'w-40',
        'border-cyan-400/50',
        'text-cyan-100',
        'backdrop-blur-xl'
      );
    });

    test('should have proper icon sizes', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      // Find icon in the trigger button
      const triggerIcon = screen.getByTestId('dropdown-trigger').querySelector('[data-testid="moon-icon"]');
      expect(triggerIcon).toHaveClass('h-5', 'w-5');
    });
  });

  describe('edge cases', () => {
    test('should handle undefined resolvedTheme gracefully', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: setThemeMock,
        resolvedTheme: undefined,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      // Should render monitor icon when theme is 'system' or resolvedTheme is undefined
      const triggerIcon = screen.getByTestId('dropdown-trigger').querySelector('[data-testid="monitor-icon"]');
      expect(triggerIcon).toBeInTheDocument();
    });

    test('should handle toggle variant with undefined resolvedTheme', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: setThemeMock,
        resolvedTheme: undefined,
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle variant="toggle" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should default to switching to 'dark' when resolvedTheme is undefined
      expect(setThemeMock).toHaveBeenCalledWith('dark');
    });
  });

  describe('dropdown menu structure', () => {
    test('should have all theme options in dropdown', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      const dropdownItems = screen.getAllByTestId('dropdown-item');
      expect(dropdownItems).toHaveLength(3);

      // Check that all icons are present in dropdown items
      expect(screen.getAllByTestId('sun-icon')).toHaveLength(1); // Light option
      expect(screen.getAllByTestId('moon-icon')).toHaveLength(2); // Dark option + trigger
      expect(screen.getAllByTestId('monitor-icon')).toHaveLength(1); // System option
    });

    test('should have proper text labels in dropdown items', () => {
      const setThemeMock = jest.fn();
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: setThemeMock,
        resolvedTheme: 'dark',
        themes: ['light', 'dark', 'system'],
        systemTheme: 'dark',
      });

      render(<ThemeToggle />);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });
});
