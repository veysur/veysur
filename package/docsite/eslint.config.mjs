import { fixupConfigRules } from '@eslint/compat'
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactJsx from 'eslint-plugin-react/configs/jsx-runtime.js'
import react from 'eslint-plugin-react/configs/recommended.js'
import globals from 'globals'
import ts from 'typescript-eslint'

// eslint-plugin-astro is not usable here: its parser calls a ScopeManager API
// (`scopeManager.addGlobals`) removed in ESLint 10.2, so .astro files are not
// linted yet — only .ts/.tsx. Revisit once eslint-plugin-astro / astro-eslint-parser
// catches up to current ESLint internals.
export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...fixupConfigRules([{ ...react, settings: { react: { version: 'detect' } } }, reactJsx]),
  { plugins: { 'react-hooks': reactHooks }, rules: { ...reactHooks.configs.recommended.rules } },
  { rules: { 'react/prop-types': 'off' } },
  { ignores: ['dist/', '.astro/', '**/*.astro'] },
]
