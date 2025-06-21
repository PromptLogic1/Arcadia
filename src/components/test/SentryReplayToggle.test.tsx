/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SentryReplayToggle, SentryReplaySettings } from '../SentryReplayToggle';

// Mock the useSentryReplayWithConsent hook
const mockUseSentryReplayWithConsent = jest.fn();
jest.mock('@/hooks/useSentryReplay', () => ({
  useSentryReplayWithConsent: () => mockUseSentryReplayWithConsent(),
}));

// Mock UI components
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="replay-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Icons', () => ({
  Video: ({ className }: any) => (
    <div className={className} data-testid="video-icon" />
  ),
  VideoOff: ({ className }: any) => (
    <div className={className} data-testid="video-off-icon" />
  ),
  Loader2: ({ className }: any) => (
    <div className={className} data-testid="loader-icon" />
  ),
}));

jest.mock('@/components/ui/Tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children, asChild }: any) => (asChild ? children : <div>{children}</div>),
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock localStorage for settings component
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn(),
  },
  writable: true,
});

describe('SentryReplayToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockReturnValue(undefined);
  });

  describe('loading state', () => {
    it('should render loading icon when isLoading is true', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: true,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByTestId('replay-button')).toBeDisabled();
    });

    it('should have correct screen reader text when loading', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: true,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(screen.getByText('Enable session replay')).toBeInTheDocument();
    });
  });

  describe('enabled state', () => {
    it('should render video icon when replay is enabled', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(screen.getByTestId('video-icon')).toBeInTheDocument();
      expect(screen.getByTestId('replay-button')).toBeDisabled();
    });

    it('should have correct screen reader text when enabled', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(screen.getByText('Session replay enabled')).toBeInTheDocument();
    });

    it('should show enabled tooltip content', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(screen.getByText('Session replay is active')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should render video-off icon when replay is disabled', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(screen.getByTestId('video-off-icon')).toBeInTheDocument();
      expect(screen.getByTestId('replay-button')).toBeEnabled();
    });

    it('should show disabled tooltip content', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(
        screen.getByText('Enable session replay to help us improve your experience')
      ).toBeInTheDocument();
    });

    it('should show consent requirement when user has not consented', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: false,
      });

      render(<SentryReplayToggle />);

      expect(
        screen.getByText('Requires consent to record sessions')
      ).toBeInTheDocument();
    });

    it('should not show consent requirement when user has consented', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      expect(
        screen.queryByText('Requires consent to record sessions')
      ).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call enable function when button is clicked', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: mockEnable,
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      await user.click(screen.getByTestId('replay-button'));

      expect(mockEnable).toHaveBeenCalledTimes(1);
    });

    it('should not call enable when already enabled', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: mockEnable,
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      await user.click(screen.getByTestId('replay-button'));

      expect(mockEnable).not.toHaveBeenCalled();
    });

    it('should not call enable when loading', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: true,
        enable: mockEnable,
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      await user.click(screen.getByTestId('replay-button'));

      expect(mockEnable).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper button attributes', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      const button = screen.getByTestId('replay-button');
      // Check that it's accessible as a button and clickable
      expect(button).toHaveRole('button');
      expect(button).toBeEnabled();
    });

    it('should have screen reader accessible text', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplayToggle />);

      const srText = screen.getByText('Enable session replay');
      expect(srText).toHaveClass('sr-only');
    });
  });
});

describe('SentryReplaySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockReturnValue(undefined);
    (window.location.reload as jest.Mock).mockClear();
  });

  describe('rendering', () => {
    it('should render settings component with title and description', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: false,
      });

      render(<SentryReplaySettings />);

      expect(screen.getByText('Session Replay')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Help us improve your experience by recording your sessions when errors occur'
        )
      ).toBeInTheDocument();
    });

    it('should render privacy information', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: false,
      });

      render(<SentryReplaySettings />);

      expect(
        screen.getByText('• Sessions are recorded only when errors occur')
      ).toBeInTheDocument();
      expect(
        screen.getByText('• All text content is masked for privacy')
      ).toBeInTheDocument();
      expect(
        screen.getByText('• You can disable this feature at any time')
      ).toBeInTheDocument();
      expect(
        screen.getByText('• Saves ~100kB of bandwidth when disabled')
      ).toBeInTheDocument();
    });
  });

  describe('enable functionality', () => {
    it('should show enable button when replay is disabled', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: false,
      });

      render(<SentryReplaySettings />);

      const button = screen.getByText('Enable');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should call enable function when enable button is clicked', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: false,
        enable: mockEnable,
        hasConsent: false,
      });

      render(<SentryReplaySettings />);

      await user.click(screen.getByText('Enable'));

      expect(mockEnable).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when enabling', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: true,
        enable: jest.fn(),
        hasConsent: false,
      });

      render(<SentryReplaySettings />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Enable')).toBeDisabled();
    });
  });

  describe('disable functionality', () => {
    it('should show disable button when replay is enabled', () => {
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplaySettings />);

      const button = screen.getByText('Disable');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should set localStorage and reload when disable button is clicked', async () => {
      const user = userEvent.setup();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: jest.fn(),
        hasConsent: true,
      });

      render(<SentryReplaySettings />);

      await user.click(screen.getByText('Disable'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sentry-replay-consent',
        'false'
      );
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('should not trigger enable function when clicking disable', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: mockEnable,
        hasConsent: true,
      });

      render(<SentryReplaySettings />);

      await user.click(screen.getByText('Disable'));

      expect(mockEnable).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should not call enable if already loading when clicking enable', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: false,
        isLoading: true,
        enable: mockEnable,
        hasConsent: false,
      });

      render(<SentryReplaySettings />);

      await user.click(screen.getByText('Enable'));

      expect(mockEnable).not.toHaveBeenCalled();
    });

    it('should not call enable if already enabled when clicking enable button', async () => {
      const user = userEvent.setup();
      const mockEnable = jest.fn();
      // Simulate a state where the component shows "Enable" but isEnabled is true
      // This tests the internal logic of handleToggle
      mockUseSentryReplayWithConsent.mockReturnValue({
        isEnabled: true,
        isLoading: false,
        enable: mockEnable,
        hasConsent: true,
      });

      render(<SentryReplaySettings />);

      // In this case, the button should show "Disable", but let's test the edge case
      // where the handler is called with isEnabled=true and isLoading=false
      const button = screen.getByText('Disable');
      await user.click(button);

      // Should trigger disable logic (localStorage + reload), not enable
      expect(mockEnable).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sentry-replay-consent',
        'false'
      );
    });
  });
});