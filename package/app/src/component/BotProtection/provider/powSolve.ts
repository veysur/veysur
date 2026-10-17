import { sha256 } from './sha256'

const encoder = new TextEncoder()

function hasLeadingZeroBits(digest: Uint8Array, bits: number): boolean {
  const fullBytes = Math.floor(bits / 8)
  for (let i = 0; i < fullBytes; i++) {
    if (digest[i] !== 0) return false
  }
  const remainder = bits % 8
  return remainder === 0 || digest[fullBytes] >> (8 - remainder) === 0
}

/**
 * Looks for a nonce in [start, start + count) whose hash of `challenge:nonce`
 * starts with `bits` zero bits. Returns the nonce, or null if none is in range.
 */
export function searchNonce(
  challenge: string,
  bits: number,
  start: number,
  count: number,
): number | null {
  for (let nonce = start; nonce < start + count; nonce++) {
    if (
      hasLeadingZeroBits(sha256(encoder.encode(`${challenge}:${nonce}`)), bits)
    ) {
      return nonce
    }
  }
  return null
}
