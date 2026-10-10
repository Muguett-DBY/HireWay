import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'worker-configuration.d.ts', '.zcode/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'Use import.meta.env in browser code.' },
        { name: 'Buffer', message: 'Use browser binary APIs in browser code.' },
        { name: 'require', message: 'Use ES module imports in browser code.' },
        {
          name: '__dirname',
          message: 'Node paths are unavailable in browsers.',
        },
        {
          name: '__filename',
          message: 'Node paths are unavailable in browsers.',
        },
      ],
    },
  },
  {
    files: ['worker/**/*.ts'],
    languageOptions: { globals: globals.worker },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
])
