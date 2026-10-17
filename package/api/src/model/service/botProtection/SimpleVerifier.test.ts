// cspell:ignore nocolon
import { createHash } from 'crypto'

import { SimpleVerifier } from './SimpleVerifier'
import { MemorySingleUseStore } from './SingleUseStore'

function solve(challenge: string, bits: number): string {
  for (let nonce = 0; ; nonce++) {
    const digest = createHash('sha256').update(`${challenge}:${nonce}`).digest()
    if (SimpleVerifier.hasLeadingZeroBits(digest, bits))
      return `${challenge}:${nonce}`
  }
}

describe('SimpleVerifier', () => {
  let now: number
  const config = { signingKey: 'key', powBits: 8, minSeconds: 1 }
  const make = () =>
    new SimpleVerifier(config, new MemorySingleUseStore(), () => now)

  beforeEach(() => {
    now = 1_000_000
  })

  test('accepts a solved challenge once the minimum time has passed', async () => {
    const verifier = make()
    const { challenge, bits } = verifier.issueChallenge('s1')
    now += 1500
    expect(
      await verifier.verify({
        token: solve(challenge, bits),
        secretKey: '',
        surveyId: 's1',
      }),
    ).toBe(true)
  })

  test('rejects a solution that arrives too early', async () => {
    const verifier = make()
    const { challenge, bits } = verifier.issueChallenge('s1')
    now += 200
    expect(
      await verifier.verify({
        token: solve(challenge, bits),
        secretKey: '',
        surveyId: 's1',
      }),
    ).toBe(false)
  })

  test('accepts a challenge only once', async () => {
    const verifier = make()
    const { challenge, bits } = verifier.issueChallenge('s1')
    now += 1500
    const token = solve(challenge, bits)
    expect(
      await verifier.verify({ token, secretKey: '', surveyId: 's1' }),
    ).toBe(true)
    expect(
      await verifier.verify({ token, secretKey: '', surveyId: 's1' }),
    ).toBe(false)
  })

  test('rejects an expired challenge', async () => {
    const verifier = make()
    const { challenge, bits } = verifier.issueChallenge('s1')
    now += 301_000
    expect(
      await verifier.verify({
        token: solve(challenge, bits),
        secretKey: '',
        surveyId: 's1',
      }),
    ).toBe(false)
  })

  test('rejects a challenge issued for another survey', async () => {
    const verifier = make()
    const { challenge, bits } = verifier.issueChallenge('s1')
    now += 1500
    expect(
      await verifier.verify({
        token: solve(challenge, bits),
        secretKey: '',
        surveyId: 's2',
      }),
    ).toBe(false)
  })

  test('rejects a tampered difficulty', async () => {
    const verifier = make()
    const { challenge } = verifier.issueChallenge('s1')
    const [salt, , issuedAt, signature] = challenge.split('.')
    const easy = `${salt}.0.${issuedAt}.${signature}`
    now += 1500
    expect(
      await verifier.verify({
        token: `${easy}:0`,
        secretKey: '',
        surveyId: 's1',
      }),
    ).toBe(false)
  })

  test('rejects a wrong nonce and malformed tokens', async () => {
    const verifier = make()
    const { challenge } = verifier.issueChallenge('s1')
    now += 1500
    for (const token of ['', 'nocolon', `${challenge}:`, 'a.b.c.d:1']) {
      expect(
        await verifier.verify({ token, secretKey: '', surveyId: 's1' }),
      ).toBe(false)
    }
  })

  test('hasLeadingZeroBits counts partial bytes', () => {
    expect(
      SimpleVerifier.hasLeadingZeroBits(Buffer.from([0x00, 0x1f]), 11),
    ).toBe(true)
    expect(
      SimpleVerifier.hasLeadingZeroBits(Buffer.from([0x00, 0x20]), 11),
    ).toBe(false)
    expect(SimpleVerifier.hasLeadingZeroBits(Buffer.from([0x01]), 8)).toBe(
      false,
    )
  })
})
