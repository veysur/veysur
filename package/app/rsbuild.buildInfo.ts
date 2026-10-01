import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function git(cwd: string, ...args: string[]): string {
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

// Docker builds exclude .git, so the SHAs arrive as build args
// (PUBLIC_CORE_SHA, BUILD_VERSION); local dev and CI fall back to git.
// The cloud SHA is only meaningful in the cloud edition, where this package
// is a submodule of the cloud repo.
export function buildInfoDefine(): Record<string, string> {
  const { version } = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
  ) as { version: string }

  const coreSha =
    process.env.PUBLIC_CORE_SHA ||
    git(__dirname, 'rev-parse', '--short', 'HEAD')

  const isCloud = (process.env.PUBLIC_EDITION || 'cloud') !== 'self-hosted'
  const buildVersion =
    process.env.BUILD_VERSION !== 'dev' ? process.env.BUILD_VERSION : ''
  const cloudRoot = git(
    __dirname,
    'rev-parse',
    '--show-superproject-working-tree',
  )
  const cloudSha = isCloud
    ? buildVersion ||
      (cloudRoot ? git(cloudRoot, 'rev-parse', '--short', 'HEAD') : '')
    : ''

  return {
    'process.env.PUBLIC_APP_VERSION': JSON.stringify(version),
    'process.env.PUBLIC_CORE_SHA': JSON.stringify(coreSha || 'dev'),
    'process.env.PUBLIC_CLOUD_SHA': JSON.stringify(cloudSha),
  }
}
