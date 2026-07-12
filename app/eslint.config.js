import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports' // ✅ ADD THIS
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
    plugins: {
      'unused-imports': unusedImports, // ✅ ADD THIS
    },
    rules: {
      // Fast-Refresh ergonomics, NOT correctness: it fires when a file exports something next to
      // a component (shadcn does this by design — `buttonVariants` beside `Button`; so do our
      // Pager/usePager and confirm/ConfirmHost pairs, and routes/index.tsx which exports a router
      // and no component at all). Violating it costs a full HMR reload during dev and nothing at
      // runtime. Kept visible as a warning; it must not be able to block a deploy.
      'react-refresh/only-export-components': 'warn',

      // ❌ disable default rule
      '@typescript-eslint/no-unused-vars': 'off',

      // ✅ remove unused imports automatically
      'unused-imports/no-unused-imports': 'error',

      // ✅ handle unused variables (optional but clean)
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])