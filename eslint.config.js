const js = require('@eslint/js');
const typescript = require('typescript-eslint');
const nextPlugin = require('@next/eslint-plugin-next');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const testingLibraryPlugin = require('eslint-plugin-testing-library');
const jestDomPlugin = require('eslint-plugin-jest-dom');

module.exports = [
  // Base JavaScript recommended config
  js.configs.recommended,

  // TypeScript recommended configs
  ...typescript.configs.recommended,

  // Global ignores
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

  // Main TypeScript configuration
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescript.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript.plugin,
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-interface': 'warn',

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Next.js rules
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-head-element': 'error',
      '@next/next/no-unwanted-polyfillio': 'error',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-document-import-in-page': 'error',
      '@next/next/no-typos': 'warn',
      '@next/next/no-duplicate-head': 'error',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/inline-script-id': 'error',
      '@next/next/next-script-for-ga': 'error',
      '@next/next/no-before-interactive-script-outside-document': 'error',
      '@next/next/no-assign-module-variable': 'error',

      // General rules
      'no-process-env': 'off',
      'no-const-assign': 'error',
      'no-undef': 'off', // TypeScript handles this
      'no-empty-pattern': 'warn',
      'no-useless-catch': 'warn',
    },
    settings: {
      next: {
        rootDir: '.',
      },
    },
  },

  // JavaScript files configuration
  {
    files: ['**/*.{js,jsx,cjs,mjs}', '**/*.config.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // React Testing Library test files configuration (exclude Playwright tests)
  {
    files: ['**/__tests__/**/*', '**/*.test.{ts,tsx}'],
    ignores: ['**/tests/**/*.spec.ts', '**/e2e/**/*.spec.ts'],
    plugins: {
      'testing-library': testingLibraryPlugin,
      'jest-dom': jestDomPlugin,
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

  // Playwright test files configuration
  {
    files: ['**/tests/**/*.spec.ts', '**/e2e/**/*.spec.ts'],
    rules: {
      // Allow any types in tests for flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Disable testing-library rules for Playwright tests
      'testing-library/prefer-screen-queries': 'off',
    },
  },
];
