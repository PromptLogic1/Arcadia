/**
 * Test Setup for Auth Feature Tests
 */

import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  // Mock window.crypto for secure random generation
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
  });

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      reload: vi.fn(),
      replace: vi.fn(),
    },
    writable: true,
  });

  // Suppress console errors in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});