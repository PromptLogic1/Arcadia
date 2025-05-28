import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import testingLibrary from 'eslint-plugin-testing-library'
import jestDom from 'eslint-plugin-jest-dom'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
})

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-interface': 'warn',
      
      // General rules
      'no-process-env': 'off',
      'no-const-assign': 'error',
      'no-undef': 'off', // TypeScript handles this
    },
    settings: {
      next: {
        rootDir: '.',
      },
    },
  },
  {
    files: ['*.js', '*.jsx', '*.cjs', '*.config.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      'testing-library': testingLibrary,
      'jest-dom': jestDom,
    },
    rules: {
      // Allow any types in tests for flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      
      // Testing Library best practices
      'testing-library/await-async-queries': 'error',
      'testing-library/await-async-utils': 'error',
      'testing-library/no-await-sync-queries': 'error',
      'testing-library/no-container': 'warn',
      'testing-library/no-debugging-utils': 'warn',
      'testing-library/no-dom-import': 'error',
      'testing-library/no-node-access': 'warn',
      'testing-library/no-promise-in-fire-event': 'error',
      'testing-library/no-unnecessary-act': 'warn',
      'testing-library/no-wait-for-multiple-assertions': 'error',
      'testing-library/no-wait-for-side-effects': 'error',
      'testing-library/no-wait-for-snapshot': 'error',
      'testing-library/prefer-find-by': 'warn',
      'testing-library/prefer-presence-queries': 'warn',
      'testing-library/prefer-query-by-disappearance': 'warn',
      'testing-library/prefer-screen-queries': 'warn',
      'testing-library/prefer-user-event': 'warn',
      'testing-library/render-result-naming-convention': 'warn',
      
      // Jest DOM best practices
      'jest-dom/prefer-checked': 'warn',
      'jest-dom/prefer-enabled-disabled': 'warn',
      'jest-dom/prefer-focus': 'warn',
      'jest-dom/prefer-in-document': 'warn',
      'jest-dom/prefer-required': 'warn',
      'jest-dom/prefer-to-have-attribute': 'warn',
      'jest-dom/prefer-to-have-class': 'warn',
      'jest-dom/prefer-to-have-style': 'warn',
      'jest-dom/prefer-to-have-text-content': 'warn',
      'jest-dom/prefer-to-have-value': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'coverage/**',
      '**/jest/**/*.js',
      '.vercel/**',
      'public/**',
    ],
  },
]

export default eslintConfig 