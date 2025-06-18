/**
 * Jest configuration for Landing feature tests
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const path = require('path');
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: path.resolve(__dirname, '../../../..'),
});

const customJestConfig = {
  displayName: 'Landing Feature Tests',
  rootDir: path.resolve(__dirname, '../../../..'), // Set root to project root
  testMatch: [
    '<rootDir>/src/features/landing/test/**/*.test.{js,ts}',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/features/landing/test/jest.setup.ts',
  ],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
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
      presets: [['next/babel', { 'preset-react': { runtime: 'automatic' } }]]
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|@testing-library|.*\\.mjs$))',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  testTimeout: 10000,
};

module.exports = createJestConfig(customJestConfig);