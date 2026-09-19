import { resolveTemplate, TemplateContext } from 'veysur-common'
import { isValidEmail } from './validateEmail'

const TOKEN_PATTERN = /^\{\{\s*([\w.]+)\s*\}\}$/
const PARTICIPANT_PREFIX = 'participant.'

/**
 * Resolves a semicolon-separated notify.basic/notify.detailed recipient
 * string (literal addresses and/or {{projectOwner.email}}/{{participant.email}}/
 * {{participant.<name>}}/{{answers.<questionCode>}} placeholders) into a
 * deduplicated list of valid email addresses. Never throws - unresolvable or
 * invalid entries are dropped.
 */
export function resolveNotifyRecipients(
  recipientString: string | null | undefined,
  context: TemplateContext,
): string[] {
  if (!recipientString) return []

  const candidates: string[] = []

  for (const rawToken of recipientString.split(';')) {
    const token = rawToken.trim()
    if (!token) continue

    const match = token.match(TOKEN_PATTERN)
    if (!match) {
      candidates.push(token)
      continue
    }

    const resolved = resolveNotifyToken(match[1], context)
    if (resolved) candidates.push(resolved)
  }

  const seen = new Set<string>()
  const result: string[] = []
  for (const candidate of candidates) {
    if (!isValidEmail(candidate)) continue
    const key = candidate.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(candidate)
  }

  return result
}

/**
 * Resolves a single dotted path (the inside of a `{{...}}` token) against the
 * shared template context. `participant.<name>` is looked up
 * case-insensitively (preserving pre-migration `{P:ATTRIBUTE_x}` behaviour) -
 * every other container (`answers`/`projectOwner`/`survey`/`project`) uses
 * `resolveTemplate`'s normal case-sensitive property traversal.
 */
function resolveNotifyToken(
  path: string,
  context: TemplateContext,
): string | null {
  if (path.startsWith(PARTICIPANT_PREFIX)) {
    const attributeName = path.slice(PARTICIPANT_PREFIX.length)
    const actualKey = findCaseInsensitiveKey(context.participant, attributeName)
    if (!actualKey) return null
    path = `${PARTICIPANT_PREFIX}${actualKey}`
  }

  const resolved = resolveTemplate(`{{${path}}}`, context, {
    escape: 'none',
    onUnresolved: 'drop',
  })
  return resolved || null
}

function findCaseInsensitiveKey(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const target = key.toUpperCase()
  for (const candidateKey of Object.keys(record ?? {})) {
    if (candidateKey.toUpperCase() === target) return candidateKey
  }
  return null
}
