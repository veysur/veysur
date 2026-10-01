// Writes the root CHANGELOG.md entry for a release from the per-package changelogs that
// `changeset version` has just updated. The fixed group shares one version, but each changeset
// only lands in the packages it names, so the entry is the de-duplicated union across all of them.
// Usage: node scripts/release-changelog.mjs <version>   (run from the repo root)
import { readFileSync, writeFileSync } from 'node:fs'

const PACKAGES = ['app', 'api', 'common', 'theme', 'docsite']
const HEADINGS = ['Major Changes', 'Minor Changes', 'Patch Changes']
// A changeset bullet starts with its short commit hash; dependency bumps do not.
const ENTRY_START = /^- [0-9a-f]{7,}: /

const version = process.argv[2]
if (!version) {
  console.error('usage: release-changelog.mjs <version>')
  process.exit(1)
}

const rootPath = 'CHANGELOG.md'
const root = readFileSync(rootPath, 'utf8')
if (root.includes(`\n## ${version}\n`)) {
  console.log(`CHANGELOG.md already has ${version}, leaving it as is.`)
  process.exit(0)
}

// heading -> hash -> entry text; the hash is the same in every package the changeset touched
const entries = new Map(HEADINGS.map((heading) => [heading, new Map()]))

for (const pkg of PACKAGES) {
  const lines = readFileSync(`package/${pkg}/CHANGELOG.md`, 'utf8').split('\n')
  const start = lines.indexOf(`## ${version}`)
  if (start === -1) continue

  let heading = null
  let current = null
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break
    if (line.startsWith('### ')) {
      heading = line.slice(4).trim()
      current = null
    } else if (heading && entries.has(heading) && ENTRY_START.test(line)) {
      const hash = line.slice(2, line.indexOf(':'))
      current = [line]
      entries.get(heading).set(hash, current)
    } else if (current && line.startsWith('  ')) {
      current.push(line)
    } else {
      current = null
    }
  }
}

const sections = HEADINGS.filter((heading) => entries.get(heading).size > 0).map(
  (heading) => `### ${heading}\n\n${[...entries.get(heading).values()].map((e) => e.join('\n')).join('\n')}\n`,
)
if (sections.length === 0) {
  console.error(`No changeset entries found for ${version} in package changelogs.`)
  process.exit(1)
}

const entry = `## ${version}\n\n${sections.join('\n')}\n`
const firstRelease = root.indexOf('\n## ')
writeFileSync(rootPath, `${root.slice(0, firstRelease + 1)}${entry}${root.slice(firstRelease + 1)}`)
console.log(`CHANGELOG.md: added ${version} (${sections.length} section(s)).`)
