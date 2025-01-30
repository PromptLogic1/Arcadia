module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
  ignorePatterns: ['**/jest/**/*.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true
  },
  overrides: [
    {
      files: ['*.js', '*.jsx', '*.cjs'],
      env: {
        node: true,
        es6: true
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      extends: ['eslint:recommended'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-const-assign': 'error'
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    }
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-inferrable-types': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    'no-process-env': 'off'
  }
} 