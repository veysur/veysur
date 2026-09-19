// Jest moduleNameMapper entries point into the pnpm virtual store
// (`node_modules/.pnpm/<pkg>/...`) to pin transitive dependencies. Where that
// store sits depends on how this repo is checked out: at the workspace root when
// standalone, several levels up when nested as a submodule of a larger
// workspace. This rewrites those entries to whichever ancestor actually holds
// the file.
const fs = require('node:fs')
const path = require('node:path')

const STORE_PREFIX = /^<rootDir>\/(\.\.\/)+node_modules\//

function ancestors(dir) {
  const result = []
  for (let current = dir; ; current = path.dirname(current)) {
    result.push(current)
    if (path.dirname(current) === current) return result
  }
}

function resolvePnpmPaths(moduleNameMapper, packageDir) {
  const roots = ancestors(packageDir).reverse()
  const resolved = {}
  for (const [pattern, target] of Object.entries(moduleNameMapper)) {
    if (!STORE_PREFIX.test(target)) {
      resolved[pattern] = target
      continue
    }
    const relative = target.replace(STORE_PREFIX, '')
    // "$1"-style capture references are not real paths; check the fixed prefix.
    const probe = relative.split('$')[0]
    const root = roots.find((candidate) =>
      fs.existsSync(path.join(candidate, 'node_modules', probe)),
    )
    resolved[pattern] = root
      ? path.join(root, 'node_modules', relative)
      : target
  }
  return resolved
}

module.exports = { resolvePnpmPaths }
