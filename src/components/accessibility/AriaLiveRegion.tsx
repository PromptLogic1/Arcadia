'use client';

import { useEffect, useState } from 'react';

interface AriaLiveRegionProps {
  message?: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number; // milliseconds
}

export function AriaLiveRegion({
  message = '',
  priority = 'polite',
  clearAfter = 5000,
}: AriaLiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setCurrentMessage('');
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
    // Return undefined when no cleanup is needed
    return undefined;
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}

// Global announcer for use throughout the app
let announceCallback:
  | ((message: string, priority?: 'polite' | 'assertive') => void)
  | null = null;

export function setGlobalAnnouncer(
  callback: (message: string, priority?: 'polite' | 'assertive') => void
) {
  announceCallback = callback;
}

export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  if (announceCallback) {
    announceCallback(message, priority);
  }
}

// Provider component to be used at the app root
export function AriaAnnouncerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [announcement, setAnnouncement] = useState<{
    message: string;
    priority: 'polite' | 'assertive';
  }>({ message: '', priority: 'polite' });

  useEffect(() => {
    setGlobalAnnouncer((message, priority = 'polite') => {
      setAnnouncement({ message: '', priority }); // Clear first
      setTimeout(() => {
        setAnnouncement({ message, priority });
      }, 100); // Small delay to ensure screen readers pick up the change
    });
  }, []);

  return (
    <>
      {children}
      <AriaLiveRegion
        message={announcement.message}
        priority={announcement.priority}
        clearAfter={5000}
      />
    </>
  );
}
