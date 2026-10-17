// cspell:ignore remoteip
import { BOT_PROTECTION_PROVIDER_GOOGLE } from 'veysur-common'

import {
  BotProtectionVerifier,
  BotVerifyInput,
  FetchFn,
} from './BotProtectionVerifier'

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

/** reCAPTCHA v3: invisible, scored from 0 (bot) to 1 (human). */
export class RecaptchaVerifier implements BotProtectionVerifier {
  readonly provider = BOT_PROTECTION_PROVIDER_GOOGLE

  constructor(
    private readonly minScore: number,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async verify({
    token,
    secretKey,
    remoteIp,
  }: BotVerifyInput): Promise<boolean> {
    const body = new URLSearchParams({ secret: secretKey, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    try {
      const response = await this.fetchFn(RECAPTCHA_VERIFY_URL, {
        method: 'POST',
        body,
      })
      const result = (await response.json()) as {
        success?: boolean
        score?: number
      }
      return result?.success === true && (result.score ?? 0) >= this.minScore
    } catch {
      return false
    }
  }
}
