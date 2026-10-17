import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { BOT_PROTECTION_PROVIDER_SIMPLE } from 'veysur-common'

import { BotProtectionVerifier, BotVerifyInput } from './BotProtectionVerifier'
import { SingleUseStore } from './SingleUseStore'

export interface SimpleVerifierConfig {
  /** HMAC key that signs challenges, so the server keeps no challenge state. */
  signingKey: string
  /** Leading zero bits the SHA-256 of `challenge:nonce` must have. */
  powBits: number
  /** A solution arriving sooner than this after the challenge is rejected. */
  minSeconds: number
  ttlSeconds?: number
}

export interface SimpleChallenge {
  challenge: string
  bits: number
  /** How long the browser must wait before submitting its solution. */
  minSeconds: number
}

/**
 * Self-hosted proof of work: no third party, no personal data. The server
 * signs `salt.bits.issuedAt`, bound to a scope (a survey id, or the account scope); the browser finds a nonce so
 * that SHA-256(`challenge:nonce`) starts with `bits` zero bits. Each salt is
 * accepted once.
 */
export class SimpleVerifier implements BotProtectionVerifier {
  readonly provider = BOT_PROTECTION_PROVIDER_SIMPLE
  private readonly ttlSeconds: number

  constructor(
    private readonly config: SimpleVerifierConfig,
    private readonly store: SingleUseStore,
    private readonly now: () => number = Date.now,
  ) {
    this.ttlSeconds = config.ttlSeconds ?? 300
  }

  issueChallenge(scope: string): SimpleChallenge {
    const salt = randomBytes(16).toString('base64url')
    const { powBits: bits, minSeconds } = this.config
    const payload = `${salt}.${bits}.${this.now()}`
    return {
      challenge: `${payload}.${this.sign(payload, scope)}`,
      bits,
      minSeconds,
    }
  }

  async verify({ token, surveyId }: BotVerifyInput): Promise<boolean> {
    const separator = token.lastIndexOf(':')
    if (separator < 1) return false
    const challenge = token.slice(0, separator)
    const nonce = token.slice(separator + 1)
    if (!nonce) return false

    const parts = challenge.split('.')
    if (parts.length !== 4) return false
    const [salt, bitsText, issuedAtText, signature] = parts
    const payload = `${salt}.${bitsText}.${issuedAtText}`
    if (!this.signatureMatches(signature, payload, surveyId)) return false

    const bits = Number(bitsText)
    const ageSeconds = (this.now() - Number(issuedAtText)) / 1000
    if (
      !Number.isInteger(bits) ||
      bits < this.config.powBits ||
      !(ageSeconds >= this.config.minSeconds) ||
      ageSeconds > this.ttlSeconds
    ) {
      return false
    }

    const digest = createHash('sha256').update(`${challenge}:${nonce}`).digest()
    if (!SimpleVerifier.hasLeadingZeroBits(digest, bits)) return false

    return this.store.claim(salt, this.ttlSeconds)
  }

  private sign(payload: string, scope: string): string {
    return createHmac('sha256', this.config.signingKey)
      .update(`${payload}.${scope}`)
      .digest('base64url')
  }

  private signatureMatches(
    signature: string,
    payload: string,
    surveyId: string,
  ): boolean {
    const expected = Buffer.from(this.sign(payload, surveyId))
    const actual = Buffer.from(signature)
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    )
  }

  static hasLeadingZeroBits(digest: Buffer, bits: number): boolean {
    const fullBytes = Math.floor(bits / 8)
    for (let i = 0; i < fullBytes; i++) {
      if (digest[i] !== 0) return false
    }
    const remainder = bits % 8
    if (remainder === 0) return true
    return digest[fullBytes] >> (8 - remainder) === 0
  }
}
