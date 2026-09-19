import { fileURLToPath } from 'node:url'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// Tutorial media (mp4 + sibling jpg poster) is authored in the external/media
// submodule and copied into public/media/ for local `pnpm dev`. In k3d/stage/prod
// nginx proxies /media/ straight to the Garage veysur-files bucket instead, so these
// files must never be committed here or baked into the Docker image (public/media/ is
// gitignored, and this runs from predev only — never prebuild).
const dir = path.dirname(fileURLToPath(import.meta.url))
const sourceDir = path.join(dir, '..', '..', '..', 'external', 'media')
const outDir = path.join(dir, '..', 'public', 'media')

const MEDIA_EXT = new Set(['.mp4', '.jpg', '.jpeg', '.vtt'])

if (!existsSync(sourceDir)) {
  console.warn(
    `media-sync: ${sourceDir} not found (submodule not checked out) — skipping`,
  )
  process.exit(0)
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
await cp(sourceDir, outDir, {
  recursive: true,
  filter: (src) => {
    const base = path.basename(src)
    if (base.startsWith('.')) return false
    const ext = path.extname(src).toLowerCase()
    return ext === '' || MEDIA_EXT.has(ext)
  },
})

console.log(`media-sync: copied tutorial media into ${path.relative(process.cwd(), outDir)}`)
