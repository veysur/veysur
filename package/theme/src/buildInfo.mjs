import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

function git(cwd, ...args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

// Footer text for the Astro sites (website, docsite, blogsite), mirroring the
// app's AppVersion: `v0.1.0 · abc1234` self-hosted, or
// `core abc1234 · cloud def5678` in cloud (no package version). Docker builds exclude
// .git, so the SHAs arrive as build args (PUBLIC_CORE_SHA, BUILD_VERSION);
// local builds fall back to git. `packageJsonUrl` is the calling site's own
// package.json; the version is omitted when that file has none.
export function buildInfoText(packageJsonUrl) {
  const { version } = JSON.parse(
    readFileSync(fileURLToPath(packageJsonUrl), 'utf8'),
  )
  const here = fileURLToPath(new URL('.', import.meta.url))

  const coreSha =
    process.env.PUBLIC_CORE_SHA || git(here, 'rev-parse', '--short', 'HEAD')

  const isCloud = (process.env.PUBLIC_EDITION || 'cloud') !== 'self-hosted'
  const buildVersion =
    process.env.BUILD_VERSION !== 'dev' ? process.env.BUILD_VERSION : ''
  const cloudRoot = git(here, 'rev-parse', '--show-superproject-working-tree')
  const cloudSha = isCloud
    ? buildVersion ||
      (cloudRoot ? git(cloudRoot, 'rev-parse', '--short', 'HEAD') : '')
    : ''

  const shas = cloudSha
    ? [`core ${coreSha || 'dev'}`, `cloud ${cloudSha}`]
    : [coreSha || 'dev']
  return [!cloudSha && version && `v${version}`, ...shas].filter(Boolean).join(' · ')
}
