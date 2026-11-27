import { validateSubdomainPrefix } from './subdomain-validator'

const FALLBACK_SUFFIX = '-project'

// Leaves room for a "-NN" collision suffix inside the 63 character DNS label limit.
const MAX_BASE_LENGTH = 50

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[0-9]+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/g, '')
}

const isValidPrefix = (prefix: string): boolean =>
  validateSubdomainPrefix(prefix) === true

/**
 * Suggests a subdomain prefix from a project name. A name that reduces to
 * something reserved or too short ("Test", "Ab") gets a suffix so the user is
 * not shown an error on a field they have not touched. Returns '' when no
 * valid suggestion exists, so the caller leaves the field empty.
 */
export function generateSubdomain(name: string): string {
  const base = slugify(name)
  if (!base) {
    return ''
  }
  if (isValidPrefix(base)) {
    return base
  }
  const withSuffix = `${base}${FALLBACK_SUFFIX}`
  return isValidPrefix(withSuffix) ? withSuffix : ''
}

/**
 * Ordered subdomain prefixes to try for a name: the suggestion, then
 * `<suggestion>-2` up to `<suggestion>-<count>`. Empty when the name yields no
 * valid suggestion, so the caller falls back to a generated name.
 */
export function subdomainCandidates(name: string, count = 10): string[] {
  const base = generateSubdomain(name)
  if (!base) {
    return []
  }
  const candidates = [base]
  for (let n = 2; n <= count; n++) {
    candidates.push(`${base}-${n}`)
  }
  return candidates
}
