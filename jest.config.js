/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
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
    'node_modules/(?!(@supabase|jose|@auth0|@panva|superjson)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'cjs'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)'
  ],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  reporters: [
    'default',
    '<rootDir>/lib/jest/CustomReporter.ts'
  ]
}

module.exports = config 