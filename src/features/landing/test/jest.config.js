/**
 * Jest configuration for Landing feature tests
 */

const path = require('path');

module.exports = {
  displayName: 'Landing Feature Tests',
  testMatch: [
    '<rootDir>/src/features/landing/test/**/*.test.{js,ts}',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/features/landing/test/jest.setup.ts',
  ],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/features/landing/utils/**/*.{js,ts}',
    'src/features/landing/components/**/*.{js,ts,tsx}',
    '!src/features/landing/**/*.test.{js,ts}',
    '!src/features/landing/**/*.stories.{js,ts}',
    '!src/features/landing/**/__mocks__/**',
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
};