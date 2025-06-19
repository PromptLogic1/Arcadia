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
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
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
  Sun: ({ className }: any) => <span className={className} data-testid="sun-icon" />,
  Moon: ({ className }: any) => <span className={className} data-testid="moon-icon" />,
  Monitor: ({ className }: any) => <span className={className} data-testid="monitor-icon" />,
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
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
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
    beforeEach(async () => {
      // Mock mounted state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([true, jest.fn()]) // mounted state
        .mockReturnValueOnce([false, jest.fn()]); // any other useState calls
    });

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
      expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
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
      
      // Click light theme
      fireEvent.click(dropdownItems[0]);
      expect(setThemeMock).toHaveBeenCalledWith('light');
      
      // Click dark theme
      fireEvent.click(dropdownItems[1]);
      expect(setThemeMock).toHaveBeenCalledWith('dark');
      
      // Click system theme
      fireEvent.click(dropdownItems[2]);
      expect(setThemeMock).toHaveBeenCalledWith('system');
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
    beforeEach(async () => {
      // Mock mounted state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([true, jest.fn()]) // mounted state
        .mockReturnValueOnce([false, jest.fn()]); // any other useState calls
    });

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
      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
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
    beforeEach(async () => {
      // Mock mounted state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([true, jest.fn()]) // mounted state
        .mockReturnValueOnce([false, jest.fn()]); // any other useState calls
    });

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
      
      const button = screen.getByRole('button');
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

      render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
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
      
      const triggerIcon = screen.getByTestId('moon-icon');
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

      // Mock mounted state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([true, jest.fn()]) // mounted state
        .mockReturnValueOnce([false, jest.fn()]); // any other useState calls

      render(<ThemeToggle />);
      
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
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

      // Mock mounted state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([true, jest.fn()]) // mounted state
        .mockReturnValueOnce([false, jest.fn()]); // any other useState calls

      render(<ThemeToggle variant="toggle" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should default to switching to 'dark' when resolvedTheme is undefined
      expect(setThemeMock).toHaveBeenCalledWith('dark');
    });
  });

  describe('dropdown menu structure', () => {
    beforeEach(async () => {
      // Mock mounted state
      jest.spyOn(React, 'useState')
        .mockReturnValueOnce([true, jest.fn()]) // mounted state
        .mockReturnValueOnce([false, jest.fn()]); // any other useState calls
    });

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