import { randomBytes } from 'node:crypto'
import { base62EncodeBsonId } from '@datacapy/id'

/**
 * Generate an opaque participant session id.
 *
 * Same shape as `genUniqueId()` — a base62 string of up to 17 chars, so it fits
 * the `CHAR(17)` generated index column @datacapy/om creates for any `*Id` field —
 * but built from 12 CSPRNG bytes instead of a BSON ObjectId, so the value
 * carries no embedded timestamp that would leak when a response was recorded.
 */
export const randomSessionId = (): string =>
  base62EncodeBsonId(randomBytes(12).toString('hex'))
