import { fixupConfigRules } from '@eslint/compat'
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactJsx from 'eslint-plugin-react/configs/jsx-runtime.js'
import react from 'eslint-plugin-react/configs/recommended.js'
import globals from 'globals'
import ts from 'typescript-eslint'

// Import boundaries between the sub-apps, shared code, and the commercial-only
// veysur-app-cloud package. appPlatform, appAccount/billing, appAccount/support,
// and component/billing all live in a separate commercial-only package, never
// in this repo.
const cloudPackageGroup = {
  group: [
    'veysur-app-cloud',
    'veysur-app-cloud/**',
    'veysur-common-cloud',
    'veysur-common-cloud/**',
  ],
  message:
    'This code must not import veysur-app-cloud or veysur-common-cloud ' +
    '(commercial-only code, not part of this repo).',
}

const noSubAppGroup = {
  group: [
    '**/appAdmin',
    '**/appAdmin/**',
    '**/appSurvey',
    '**/appSurvey/**',
    '**/appAccount',
    '**/appAccount/**',
  ],
  message:
    'Shared code (src/component, src/hook, src/common, src/registry) must not ' +
    'import a sub-app tree (appAdmin/appSurvey/appAccount). Move the shared ' +
    'symbol down into src/.',
}

// Shared code (src/component, src/hook, src/common, src/registry): no sub-app
// imports and no cloud-only code.
const sharedImportRule = [
  'error',
  { patterns: [noSubAppGroup, cloudPackageGroup] },
]

// appAdmin / appSurvey ship in the self-hosted edition — they may not import
// cloud-only code (veysur-app-cloud, veysur-common-cloud).
const selfHostedAppImportRule = ['error', { patterns: [cloudPackageGroup] }]

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...fixupConfigRules([
    {
      ...react,
      settings: {
        react: { version: 'detect' },
      },
    },
    reactJsx,
  ]),
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    rules: {
      // TypeScript's own type checking already validates prop shapes via
      // interfaces/types; this rule doesn't understand TS and produces
      // false positives on every strictly-typed component.
      'react/prop-types': 'off',
    },
  },
  {
    files: [
      'src/component/**',
      'src/hook/**',
      'src/common/**',
      'src/registry/**',
    ],
    rules: {
      'no-restricted-imports': sharedImportRule,
    },
  },
  {
    files: ['src/appAdmin/**', 'src/appSurvey/**'],
    rules: {
      'no-restricted-imports': selfHostedAppImportRule,
    },
  },
  {
    // The public appAccount shell must not import veysur-app-cloud (the
    // billing/support/project route modules and platform sub-app) so the
    // self-hosted account build tree-shakes them. Router.tsx reaches it
    // through a PUBLIC_EDITION-gated require() (a runtime dep the
    // no-restricted-imports rule does not inspect).
    files: ['src/appAccount/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [cloudPackageGroup] }],
    },
  },
  {
    ignores: ['dist/'],
  },
]
