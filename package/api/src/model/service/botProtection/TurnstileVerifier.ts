// cspell:ignore remoteip
import { BOT_PROTECTION_PROVIDER_CLOUDFLARE } from 'veysur-common'

import {
  BotProtectionVerifier,
  BotVerifyInput,
  FetchFn,
} from './BotProtectionVerifier'

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export class TurnstileVerifier implements BotProtectionVerifier {
  readonly provider = BOT_PROTECTION_PROVIDER_CLOUDFLARE

  constructor(private readonly fetchFn: FetchFn = fetch) {}

  async verify({
    token,
    secretKey,
    remoteIp,
  }: BotVerifyInput): Promise<boolean> {
    const body = new URLSearchParams({ secret: secretKey, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    try {
      const response = await this.fetchFn(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body,
      })
      const result = (await response.json()) as { success?: boolean }
      return result?.success === true
    } catch {
      return false
    }
  }
}
