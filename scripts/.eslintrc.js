module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  rules: {
    // Allow require() in Node.js scripts
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-commonjs': 'off',

    // Allow unused variables in catch blocks
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_?error',
      },
    ],

    // Allow console.log in scripts
    'no-console': 'off',

    // Allow process.exit in scripts
    'no-process-exit': 'off',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script', // Use script instead of module for CommonJS
  },
};
