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
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2),
  },
});

// Mock crypto.createHash for Node.js - make it deterministic
const mockHash = {
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockImplementation((encoding: string) => {
    if (encoding === 'hex') {
      return 'abcdef1234567890';
    }
    return 'abcdef1234567890';
  }),
};

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHash: jest.fn().mockReturnValue(mockHash),
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

// Mock Date.now for consistent timestamps in tests
const mockDate = new Date('2024-01-15T10:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
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