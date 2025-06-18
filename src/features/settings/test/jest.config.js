/**
 * Jest configuration for Settings feature tests
 */

const path = require('path');

module.exports = {
  displayName: 'Settings Feature Tests',
  testMatch: [
    '<rootDir>/src/features/settings/test/**/*.test.{js,ts}',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/features/settings/test/jest.setup.ts',
  ],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/features/settings/utils/**/*.{js,ts}',
    'src/features/settings/components/**/*.{js,ts,tsx}',
    'src/features/settings/hooks/**/*.{js,ts}',
    'src/features/settings/types/**/*.{js,ts}',
    '!src/features/settings/**/*.test.{js,ts}',
    '!src/features/settings/**/*.stories.{js,ts}',
    '!src/features/settings/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    }],
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
};