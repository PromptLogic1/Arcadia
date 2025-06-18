/**
 * Jest setup for Landing feature tests
 */

import '@testing-library/jest-dom';
import { setupAnalyticsMocks } from './__mocks__/analytics';

// Setup analytics mocks
setupAnalyticsMocks();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'abcd-ef12-1234-5678-90ab',
  },
});

// Mock crypto.createHash for Node.js - make it deterministic but varied

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHash: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockImplementation(function(data: string) {
      // Create a simple hash based on the input
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      this._hash = Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
      return this;
    }),
    digest: jest.fn().mockImplementation(function(encoding: string) {
      if (encoding === 'hex') {
        return this._hash + '00000000'; // Make it 16 chars like MD5
      }
      return this._hash + '00000000';
    }),
  })),
  randomUUID: jest.fn(() => 'abcd-ef12-1234-5678-90ab'),
}));

// Mock Date.now for consistent timestamps in tests
const mockDate = new Date('2024-01-15T10:00:00Z');
const OriginalDate = Date;
jest.spyOn(global, 'Date').mockImplementation((date?: string | number | Date) => {
  if (date !== undefined) {
    return new OriginalDate(date);
  }
  return new OriginalDate(mockDate);
});
Date.now = jest.fn(() => mockDate.getTime());

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://arcadia.game',
    hostname: 'arcadia.game',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));