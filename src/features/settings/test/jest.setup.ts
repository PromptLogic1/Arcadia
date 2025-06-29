/**
 * Jest setup for Settings feature tests
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Test utilities interface
interface TestUtils {
  localStorage: typeof localStorageMock;
}

// Global test utilities - extend globalThis
Object.assign(globalThis, {
  testUtils: {
    localStorage: localStorageMock,
  } satisfies TestUtils,
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
