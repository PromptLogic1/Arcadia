module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
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
      files: ['*.cjs', '*.js'],
      env: {
        node: true,
        es6: true
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script'
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
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
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }]
  }
} 