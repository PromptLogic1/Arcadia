/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './setup.ts',
    ],
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.e2e.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'mocks/',
        'factories/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../'),
      '@/types': path.resolve(__dirname, '../../../types'),
      '@/lib': path.resolve(__dirname, '../../../lib'),
      '@/features': path.resolve(__dirname, '../../../features'),
    },
  },
});