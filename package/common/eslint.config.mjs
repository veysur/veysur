import js from '@eslint/js'
import globals from 'globals'
import ts from 'typescript-eslint'

export default [
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    // Relaxed TS strictness is intentional here (see AGENTS.md) — `any` is
    // pervasive by design, so keep it visible without blocking commits.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  { ignores: ['dist/'] },
]
