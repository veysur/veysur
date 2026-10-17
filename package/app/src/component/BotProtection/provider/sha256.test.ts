import { createHash } from 'crypto'

import { sha256 } from './sha256'
import { searchNonce } from './powSolve'

const encoder = new TextEncoder()
const reference = (text: string) =>
  new Uint8Array(createHash('sha256').update(text).digest())

describe('sha256', () => {
  test.each([
    '',
    'abc',
    'a'.repeat(55),
    'a'.repeat(56),
    'a'.repeat(64),
    'a'.repeat(1000),
    'salt.18.1700000000000.signature:12345',
  ])('matches node crypto for %j', (text) => {
    expect(sha256(encoder.encode(text))).toEqual(reference(text))
  })
})

describe('searchNonce', () => {
  test('finds a nonce the server side check accepts', () => {
    const nonce = searchNonce('challenge', 12, 0, 200000)
    expect(nonce).not.toBeNull()
    const digest = reference(`challenge:${nonce}`)
    expect(digest[0]).toBe(0)
    expect(digest[1] >> 4).toBe(0)
  })

  test('returns null when nothing in range qualifies', () => {
    expect(searchNonce('challenge', 40, 0, 50)).toBeNull()
  })
})
