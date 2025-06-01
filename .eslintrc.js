module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: [
    'dist',
    'dist-electron',
    'out',
    'node_modules',
    '.eslintrc.js',
    'forge.config.js',
    'vite.config.ts',
    'ExampleApps/**/*'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  globals: {
    Electron: 'readonly',
    NodeRequire: 'readonly',
    NodeModule: 'readonly',
    NodeJS: 'readonly',
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-undef': 'error',
    'no-case-declarations': 'error',
    'no-prototype-builtins': 'warn',
    'no-redeclare': 'error',
    'no-unused-vars': 'off',
    'no-unsafe-optional-chaining': 'warn',
  },
  overrides: [
    {
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-undef': 'off',
      },
    },
  ],
}