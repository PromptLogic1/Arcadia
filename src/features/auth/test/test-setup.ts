/**
 * Test Setup for Auth Feature Tests
 */

import { jest } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from '@jest/globals';

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
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
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
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
      assign: jest.fn(),
      reload: jest.fn(),
      replace: jest.fn(),
    },
    writable: true,
  });

  // Suppress console errors in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});