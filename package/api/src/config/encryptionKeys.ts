export interface EncryptionKeyEntry {
  id: string
  publicKey: string
  privateKey?: string
  privateKeyPassword?: string
}

export interface EncryptionConfig {
  publicKey: string
  privateKey: string
  privateKeyPassword: string
  keys: EncryptionKeyEntry[]
  activeKeyId: string
}

const OPTIONAL_STRING_FIELDS = ['privateKey', 'privateKeyPassword'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Parse `API_ENCRYPTION_KEYS`: a JSON array of
 * `{ id, publicKey, privateKey?, privateKeyPassword? }` with base64 PEMs.
 * Returns an empty array when unset. Throws on anything malformed so a bad
 * rotation config stops the API at start-up instead of corrupting data later.
 */
export function parseEncryptionKeys(
  raw: string | undefined,
): EncryptionKeyEntry[] {
  if (!raw || !raw.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('API_ENCRYPTION_KEYS is not valid JSON')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('API_ENCRYPTION_KEYS must be a non-empty JSON array')
  }

  return parsed.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.publicKey !== 'string' ||
      !entry.id ||
      !entry.publicKey
    ) {
      throw new Error(
        `API_ENCRYPTION_KEYS[${index}] needs a string "id" and "publicKey"`,
      )
    }
    for (const field of OPTIONAL_STRING_FIELDS) {
      if (entry[field] !== undefined && typeof entry[field] !== 'string') {
        throw new Error(
          `API_ENCRYPTION_KEYS[${index}].${field} must be a string`,
        )
      }
    }
    return {
      id: entry.id,
      publicKey: entry.publicKey,
      privateKey: entry.privateKey as string | undefined,
      privateKeyPassword: entry.privateKeyPassword as string | undefined,
    }
  })
}
