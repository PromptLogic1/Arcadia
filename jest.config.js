const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Root configuration (shared by all projects)
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/lib/jest/jest.setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/features/auth/testing/', // Ignore old manual test files
    // Exclude ALL Playwright tests (entire tests directory)
    '<rootDir>/tests/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/features/auth/testing/**',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [['next/babel', { 'preset-react': { runtime: 'automatic' } }]],
      },
    ],
  },
  // Fix ESM module support for Supabase, Upstash and other ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|@upstash|@testing-library|uncrypto|jose|.*\\.mjs$))',
  ],
  // Support for ES modules in tests
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Global test match for all tests
  testMatch: [
    '<rootDir>/src/features/*/test/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/src/features/*/__tests__/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  // Default test environment
  testEnvironment: 'jest-environment-jsdom',
  reporters: ['default', ['<rootDir>/lib/jest/CustomReporter.js', {}]],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
