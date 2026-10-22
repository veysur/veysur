/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS config file */
const { resolvePnpmPaths } = require('../../scripts/jest-pnpm-paths.cjs')
const base = require('./jest.base.json')
const esmDeps = require('../../scripts/jest-esm-deps.cjs')

module.exports = {
  ...base,
  ...esmDeps,
  moduleNameMapper: resolvePnpmPaths(base.moduleNameMapper, __dirname),
}
