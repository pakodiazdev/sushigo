import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore build output and Cypress suite (tested separately via cypress workflow)
  globalIgnores(['dist', 'cypress/**', 'cypress.config.ts', 'cypress.config.devlab.ts']),

  // JS / JSX
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },

  // TS / TSX
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Downgraded to warn: codebase uses `any` intentionally in react-hook-form generics
      // and API response types. Enforce proper types incrementally per module.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Respect underscore prefix convention for intentionally unused vars/args
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // react-refresh is a DX rule (hot reload), not a correctness rule — warn only.
      // Context providers, utility files and hooks legitimately export non-components.
      'react-refresh/only-export-components': 'warn',
    },
  }),
])
