/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS config file */
const { resolvePnpmPaths } = require('../../scripts/jest-pnpm-paths.cjs')
const base = require('./jest.base.json')

module.exports = {
  ...base,
  moduleNameMapper: resolvePnpmPaths(base.moduleNameMapper, __dirname),
}
