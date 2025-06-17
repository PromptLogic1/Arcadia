'use client';

import { useEffect } from 'react';
import { log } from '@/lib/logger';

export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register(
            '/sw.js',
            {
              scope: '/',
            }
          );

          // Update available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New content is available; please refresh
                  if (
                    window.confirm('New version available! Refresh to update?')
                  ) {
                    window.location.reload();
                  }
                }
              });
            }
          });

          // SW activated
          if (registration.active) {
            log.info('Service Worker active');
          }

          // Listen for messages from SW
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'CACHE_UPDATED') {
              log.info('Cache updated', { metadata: { url: event.data.url } });
            }
          });
        } catch (error) {
          log.error('Service Worker registration failed', error as Error);
        }
      };

      registerSW();

      // Cleanup on unmount
      return () => {
        // Don't unregister service worker on unmount
        // Let it persist for performance benefits
      };
    } else {
      return undefined;
    }
  }, []);

  return null; // This component doesn't render anything
}

// Helper function to check if app can be installed as PWA
export function usePWAInstall() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Show custom install button/banner
      log.info('PWA install prompt available');
    };

    const handleAppInstalled = () => {
      log.info('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null; // Hook doesn't return anything
}
