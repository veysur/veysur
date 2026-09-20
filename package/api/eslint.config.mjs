import js from '@eslint/js'
import globals from 'globals'
import ts from 'typescript-eslint'

// Core/shared code may not import platform-layer code. The platform trees
// themselves live in a separate `veysur-api-cloud` extension package;
// this rule keeps core from reaching back into it other than through
// model-manager.ts's lazy require().
const platformImportRule = [
  'error',
  {
    patterns: [
      {
        group: ['veysur-api-cloud', 'veysur-api-cloud/**'],
        message:
          'Core/shared/model/init code must not statically import veysur-api-cloud ' +
          '(extension code, not part of this repo). See package/api/AGENTS.md.',
      },
      {
        group: ['veysur-common-cloud', 'veysur-common-cloud/**'],
        message:
          'Core/shared code must not import veysur-common-cloud (extension code, ' +
          'not part of this repo).',
      },
    ],
  },
]

export default [
  { languageOptions: { globals: { ...globals.node } } },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    // Relaxed TS strictness is intentional here (see AGENTS.md) — `any` is
    // pervasive by design, so keep it visible without blocking commits.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Import-boundary restricted zones: core services/repos, shared + core
    // endpoints, model primitives, and init steps.
    files: [
      'src/model/service/core/**',
      'src/model/repo/core/**',
      'src/endpoint/core/**',
      'src/endpoint/shared/**',
      'src/model/constructor/**',
      'src/model/schema/**',
      'src/model/entity/**',
      'src/model/common/**',
      'src/common/**',
      'src/init/**',
    ],
    rules: {
      'no-restricted-imports': platformImportRule,
    },
  },
  { ignores: ['dist/'] },
]
