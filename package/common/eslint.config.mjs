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
  {
    // Constructors take their field types from the schema by merging an
    // interface into the class (`interface X extends Infer<typeof shape>`).
    // That is the intended pattern, so the declaration-merging rules are off
    // for constructor files. See docs/schema-inferred-types.md.
    files: ['src/model/constructor/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
    },
  },
  { ignores: ['dist/'] },
]
