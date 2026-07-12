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
    rules: {
      // Fast-Refresh ergonomics, NOT correctness — it fires when a file exports something
      // alongside a component (shadcn's `buttonVariants` beside `Button`; our CompanyProvider +
      // useCompany, Seo's schema helpers, main.tsx). Violating it costs a full HMR reload in dev
      // and nothing at runtime, so it must not be able to block a deploy. Kept as a warning.
      // Matches app/eslint.config.js — the two surfaces should not disagree about this.
      'react-refresh/only-export-components': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
