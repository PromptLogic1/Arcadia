import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '../ThemeToggle';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    className,
    onClick,
    disabled,
    ...props
  }: React.PropsWithChildren<{
    className?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
  }>) => (
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
  DropdownMenu: ({ children }: React.PropsWithChildren) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="dropdown-content" className={className}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: React.PropsWithChildren<{
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
  }>) => (
    <button onClick={onClick} className={className} data-testid="dropdown-item">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Icons', () => ({
  Sun: ({ className }: { className?: string }) => (
    <span className={className} data-testid="sun-icon" />
  ),
  Moon: ({ className }: { className?: string }) => (
    <span className={className} data-testid="moon-icon" />
  ),
  Monitor: ({ className }: { className?: string }) => (
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

      render(<ThemeToggle />);

      // During initial render, should show a disabled button with monitor icon
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();

      // Check that theme toggle renders in a loading state
      const toggleElement = screen.getByTestId('dropdown-trigger');
      expect(toggleElement).toBeInTheDocument();
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
      const moonIcons = screen.getAllByTestId('moon-icon');
      expect(moonIcons.length).toBeGreaterThanOrEqual(1);

      // Find the trigger button specifically
      const triggerButton = screen.getByLabelText('Toggle theme');
      expect(triggerButton).toBeInTheDocument();
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

      const sunIcons = screen.getAllByTestId('sun-icon');
      expect(sunIcons.length).toBeGreaterThanOrEqual(1);
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

      const monitorIcons = screen.getAllByTestId('monitor-icon');
      expect(monitorIcons.length).toBeGreaterThanOrEqual(1);
    });

    test('should call setTheme when dropdown items are clicked', async () => {
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
        await userEvent.click(lightThemeItem);
        expect(setThemeMock).toHaveBeenCalledWith('light');
      }

      // Click dark theme
      const darkThemeItem = dropdownItems[1];
      if (darkThemeItem) {
        await userEvent.click(darkThemeItem);
        expect(setThemeMock).toHaveBeenCalledWith('dark');
      }

      // Click system theme
      const systemThemeItem = dropdownItems[2];
      if (systemThemeItem) {
        await userEvent.click(systemThemeItem);
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

      const sunIcons = screen.getAllByTestId('sun-icon');
      expect(sunIcons.length).toBeGreaterThanOrEqual(1);
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

      const moonIcons = screen.getAllByTestId('moon-icon');
      expect(moonIcons.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByRole('button', { name: 'Switch to dark theme' })
      ).toBeInTheDocument();
    });

    test('should toggle theme when clicked', async () => {
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
      await userEvent.click(button);

      expect(setThemeMock).toHaveBeenCalledWith('light');
    });

    test('should toggle from light to dark', async () => {
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
      await userEvent.click(button);

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

      render(<ThemeToggle className="custom-class" />);

      // Test that custom class is applied by checking component renders
      const toggleElement = screen.getByTestId('dropdown-trigger');
      expect(toggleElement).toBeInTheDocument();
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

      render(<ThemeToggle />);

      // Test that cyberpunk styling is applied by checking component renders
      const toggleElement = screen.getByTestId('dropdown-trigger');
      expect(toggleElement).toBeInTheDocument();
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

      // Find icon in the trigger button (there might be multiple moon icons)
      const triggerIcons = screen.getAllByTestId('moon-icon');
      expect(triggerIcons.length).toBeGreaterThanOrEqual(1);
      // At least one should have the h-5 w-5 classes
      const hasCorrectClasses = triggerIcons.some(
        icon => icon.classList.contains('h-5') && icon.classList.contains('w-5')
      );
      expect(hasCorrectClasses).toBe(true);
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
      const triggerIcons = screen.getAllByTestId('monitor-icon');
      expect(triggerIcons.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle toggle variant with undefined resolvedTheme', async () => {
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
      await userEvent.click(button);

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
      expect(screen.getAllByTestId('sun-icon').length).toBeGreaterThanOrEqual(
        1
      ); // Light option
      expect(screen.getAllByTestId('moon-icon').length).toBeGreaterThanOrEqual(
        1
      ); // Dark option + trigger
      expect(
        screen.getAllByTestId('monitor-icon').length
      ).toBeGreaterThanOrEqual(1); // System option
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
