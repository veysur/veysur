#!/usr/bin/env node
// Materialises the three generated composition-seam gate files
// (src/appAccount/cloudComposition.tsx, src/appAdmin/cloudFeatureGate.ts,
// src/cloudTailwindSource.css — all gitignored, see package/app/.gitignore)
// before every dev/build run.
//
// A checkout that includes the extension drops its own private generator at
// `<repo-root>/scripts/generate-cloud-composition.mjs` — one level above
// this whole submodule, never committed here — which knows how to wire in
// the real `veysur-app-cloud` package. When that file isn't present (a
// standalone self-hosted checkout), this script falls back to copying the
// committed `*Default.*` stub onto each generated path, which is always
// self-hosted-safe.
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(here, '..')

const privateGeneratorPath = path.resolve(
  appRoot,
  '../../../../scripts/generate-cloud-composition.mjs',
)

const GATES = [
  { dir: 'appAccount', name: 'cloudComposition', ext: 'tsx' },
  { dir: 'appAdmin', name: 'cloudFeatureGate', ext: 'ts' },
  { dir: '', name: 'cloudTailwindSource', ext: 'css' },
]

async function run() {
  if (existsSync(privateGeneratorPath)) {
    const { generate } = await import(privateGeneratorPath)
    generate(appRoot)
    return
  }

  for (const { dir, name, ext } of GATES) {
    copyFileSync(
      path.join(appRoot, 'src', dir, `${name}Default.${ext}`),
      path.join(appRoot, 'src', dir, `${name}.${ext}`),
    )
  }
}

await run()
