import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The UI talks to a generic, metadata-driven API whose row shapes are dynamic.
      '@typescript-eslint/no-explicit-any': 'off',
      // Data is loaded in effects and stored in state (classic fetch-in-effect pattern).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
