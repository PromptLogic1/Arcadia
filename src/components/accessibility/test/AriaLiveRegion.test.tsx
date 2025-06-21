/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  AriaLiveRegion,
  AriaAnnouncerProvider,
  setGlobalAnnouncer,
  announce,
} from '../AriaLiveRegion';

describe('AriaLiveRegion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render with correct ARIA attributes', () => {
      render(<AriaLiveRegion message="Test message" />);
      
      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('role', 'status');
      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(region).toHaveAttribute('aria-atomic', 'true');
      expect(region).toHaveClass('sr-only');
    });

    it('should render with assertive priority', () => {
      render(
        <AriaLiveRegion message="Urgent message" priority="assertive" />
      );
      
      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('aria-live', 'assertive');
    });

    it('should display the provided message', () => {
      const { container } = render(<AriaLiveRegion message="Hello world" />);
      
      expect(container).toHaveTextContent('Hello world');
    });

    it('should render empty message by default', () => {
      const { container } = render(<AriaLiveRegion />);
      
      expect(container).toHaveTextContent('');
    });
  });

  describe('message updates', () => {
    it('should update message when prop changes', () => {
      const { container, rerender } = render(<AriaLiveRegion message="First message" />);
      
      expect(container).toHaveTextContent('First message');
      
      rerender(<AriaLiveRegion message="Second message" />);
      expect(container).toHaveTextContent('Second message');
    });

    it('should clear message after specified time', () => {
      const { container } = render(
        <AriaLiveRegion message="Temporary message" clearAfter={1000} />
      );
      
      expect(container).toHaveTextContent('Temporary message');
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(container).toHaveTextContent('');
    });

    it('should not clear message when clearAfter is 0', () => {
      const { container } = render(
        <AriaLiveRegion message="Persistent message" clearAfter={0} />
      );
      
      expect(container).toHaveTextContent('Persistent message');
      
      act(() => {
        jest.advanceTimersByTime(10000); // Wait much longer than default
      });
      
      expect(container).toHaveTextContent('Persistent message');
    });

    it('should handle rapid message changes', () => {
      const { container, rerender } = render(
        <AriaLiveRegion message="First" clearAfter={1000} />
      );
      
      expect(container).toHaveTextContent('First');
      
      // Change message before clear timeout
      rerender(<AriaLiveRegion message="Second" clearAfter={1000} />);
      expect(container).toHaveTextContent('Second');
      
      // Original timeout should be cleared, only new one should be active
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(container).toHaveTextContent('Second');
      
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(container).toHaveTextContent('');
    });

    it('should handle empty string messages', () => {
      const { container, rerender } = render(<AriaLiveRegion message="Initial" />);
      
      expect(container).toHaveTextContent('Initial');
      
      rerender(<AriaLiveRegion message="" />);
      // Empty string should clear the message but the useEffect needs to trigger
      act(() => {
        jest.advanceTimersByTime(0);
      });
      expect(container).toHaveTextContent('');
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const { unmount } = render(
        <AriaLiveRegion message="Test" clearAfter={1000} />
      );
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle unmount with no active timeout', () => {
      const { unmount } = render(<AriaLiveRegion message="Test" clearAfter={0} />);
      
      expect(() => unmount()).not.toThrow();
    });
  });
});

describe('Global Announcer Functions', () => {
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
    // Reset global announcer
    setGlobalAnnouncer(mockCallback);
  });

  afterEach(() => {
    // Clear global announcer
    setGlobalAnnouncer(() => {});
  });

  describe('setGlobalAnnouncer', () => {
    it('should set the global announcer callback', () => {
      const newCallback = jest.fn();
      setGlobalAnnouncer(newCallback);
      
      announce('Test message');
      
      expect(newCallback).toHaveBeenCalledWith('Test message', 'polite');
    });
  });

  describe('announce', () => {
    it('should call global announcer with polite priority by default', () => {
      announce('Test announcement');
      
      expect(mockCallback).toHaveBeenCalledWith('Test announcement', 'polite');
    });

    it('should call global announcer with specified priority', () => {
      announce('Urgent announcement', 'assertive');
      
      expect(mockCallback).toHaveBeenCalledWith('Urgent announcement', 'assertive');
    });

    it('should not crash when no global announcer is set', () => {
      setGlobalAnnouncer(() => {}); // Clear announcer with empty function
      
      expect(() => announce('Test')).not.toThrow();
    });

    it('should handle empty messages', () => {
      announce('');
      
      expect(mockCallback).toHaveBeenCalledWith('', 'polite');
    });
  });
});

describe('AriaAnnouncerProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render children and announcement region', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test child</div>
        </AriaAnnouncerProvider>
      );
      
      expect(screen.getByText('Test child')).toBeInTheDocument();
      
      const region = screen.getByRole('status');
      expect(region).toBeInTheDocument();
    });
  });

  describe('global announcer integration', () => {
    it('should set up global announcer on mount', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      // The announcer should be set up, test by calling announce
      expect(() => announce('Test message')).not.toThrow();
    });

    it('should announce messages through global announcer', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      announce('Global announcement');
      
      const region = screen.getByRole('status');
      
      // Initially cleared
      expect(region).toHaveTextContent('');
      
      // After delay
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(region).toHaveTextContent('Global announcement');
    });

    it('should handle priority in global announcements', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      announce('Assertive message', 'assertive');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('Assertive message');
      // The AriaLiveRegion receives the priority but the component itself
      // uses it to set aria-live attribute correctly
      expect(region).toHaveAttribute('aria-live', 'assertive');
    });

    it('should clear and re-announce messages', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      const region = screen.getByRole('status');
      
      // First announcement
      announce('First message');
      
      // Should be cleared first (the provider clears to empty string first)
      expect(region).toHaveTextContent('');
      
      // After delay, first message should appear
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(region).toHaveTextContent('First message');
      
      // Second announcement should clear first, then set new message
      act(() => {
        announce('Second message');
      });
      
      // Since the announce function synchronously clears first, it should be empty
      expect(region).toHaveTextContent('');
      
      // After delay, second message should appear
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(region).toHaveTextContent('Second message');
    });

    it('should auto-clear messages after timeout', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      announce('Temporary message');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('Temporary message');
      
      // Should clear after 5000ms (default clearAfter)
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(region).toHaveTextContent('');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple providers gracefully', () => {
      // While not recommended, test that multiple providers don't break
      expect(() => {
        render(
          <AriaAnnouncerProvider>
            <AriaAnnouncerProvider>
              <div>Nested</div>
            </AriaAnnouncerProvider>
          </AriaAnnouncerProvider>
        );
      }).not.toThrow();
    });

    it('should handle rapid successive announcements', () => {
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      // Rapid announcements
      announce('Message 1');
      announce('Message 2');
      announce('Message 3');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      const region = screen.getByRole('status');
      // Should show the last message
      expect(region).toHaveTextContent('Message 3');
    });

    it('should handle announcements before provider is ready', () => {
      // Call announce before provider is rendered
      expect(() => announce('Early message')).not.toThrow();
      
      // Then render provider
      render(
        <AriaAnnouncerProvider>
          <div>Test</div>
        </AriaAnnouncerProvider>
      );
      
      // Should work normally after provider is ready
      announce('Normal message');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('Normal message');
    });
  });
});