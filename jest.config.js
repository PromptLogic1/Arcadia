/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/test/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', { 
      presets: [
        '@babel/preset-env',
        ['@babel/preset-typescript', { 
          tsconfig: './tsconfig.jest.json' 
        }]
      ]
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|jose|@auth0|@panva|superjson|node-fetch)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'cjs'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/test/'
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  reporters: [
    'default',
    '<rootDir>/lib/jest/CustomReporter.js'
  ],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.jest.json'
    }
  }
}

module.exports = config 