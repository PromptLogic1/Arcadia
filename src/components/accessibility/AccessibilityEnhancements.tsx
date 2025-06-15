'use client';

import { useEffect, useState } from 'react';

// Accessibility enhancement utilities
export function AccessibilityEnhancements() {
  const [_userPreferences, setUserPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    darkMode: true,
  });

  useEffect(() => {
    // Detect user preferences
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const prefersHighContrast = window.matchMedia(
      '(prefers-contrast: high)'
    ).matches;
    const prefersDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    setUserPreferences({
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast,
      darkMode: prefersDarkMode,
    });

    // Add accessibility classes to document
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }

    if (prefersHighContrast) {
      document.documentElement.classList.add('high-contrast');
    }

    // Listen for changes in user preferences
    const mediaQueries = [
      {
        query: window.matchMedia('(prefers-reduced-motion: reduce)'),
        handler: (e: MediaQueryListEvent) => {
          setUserPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
          document.documentElement.classList.toggle('reduce-motion', e.matches);
        },
      },
      {
        query: window.matchMedia('(prefers-contrast: high)'),
        handler: (e: MediaQueryListEvent) => {
          setUserPreferences(prev => ({ ...prev, highContrast: e.matches }));
          document.documentElement.classList.toggle('high-contrast', e.matches);
        },
      },
    ];

    mediaQueries.forEach(({ query, handler }) => {
      query.addEventListener('change', handler);
    });

    return () => {
      mediaQueries.forEach(({ query, handler }) => {
        query.removeEventListener('change', handler);
      });
    };
  }, []);

  return null; // This component doesn't render anything
}

// Focus management utilities
export function useFocusManagement() {
  useEffect(() => {
    // Enhanced focus outline for keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

// Screen reader announcements
export function useScreenReaderAnnouncement() {
  const [announcement, setAnnouncement] = useState('');

  const announce = (
    message: string,
    _priority: 'polite' | 'assertive' = 'polite'
  ) => {
    setAnnouncement(''); // Clear first to ensure re-announcement
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  };

  return {
    announce,
    AnnouncementRegion: () => (
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>
    ),
  };
}

// Color contrast checker utility
export function checkColorContrast(
  foreground: string,
  background: string
): number {
  // Simple contrast ratio calculation
  // Note: This is a simplified version - in production, use a proper color contrast library
  const hex2rgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return [r, g, b];
  };

  const luminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * (rs || 0) + 0.7152 * (gs || 0) + 0.0722 * (bs || 0);
  };

  try {
    const [r1, g1, b1] = hex2rgb(foreground);
    const [r2, g2, b2] = hex2rgb(background);

    const lum1 = luminance(r1, g1, b1);
    const lum2 = luminance(r2, g2, b2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  } catch {
    return 1; // Return 1 if calculation fails
  }
}

// Keyboard navigation helper
export function useEnhancedKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close modals/dropdowns
      if (e.key === 'Escape') {
        const openElements = document.querySelectorAll(
          '[aria-expanded="true"]'
        );
        openElements.forEach(element => {
          if (element instanceof HTMLElement) {
            element.click(); // Close dropdown/modal
          }
        });
      }

      // Arrow key navigation for role="menu" elements
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
        const activeElement = document.activeElement;
        const menu = activeElement?.closest('[role="menu"]');

        if (menu && activeElement) {
          e.preventDefault();
          const menuItems = menu.querySelectorAll(
            '[role="menuitem"]:not([disabled])'
          );
          const currentIndex = Array.from(menuItems).indexOf(activeElement);

          let nextIndex = currentIndex;
          if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % menuItems.length;
          } else if (e.key === 'ArrowUp') {
            nextIndex =
              currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
          }

          const nextItem = menuItems[nextIndex];
          if (nextItem instanceof HTMLElement) {
            nextItem.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
