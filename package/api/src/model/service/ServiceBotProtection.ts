import { Service } from '@datacapy/server'
import {
  BOT_PROTECTION_ACCOUNT_SCOPE,
  BOT_PROTECTION_PROVIDER_SIMPLE,
  BotCheck,
  BotProtectionSetting,
  ResolvedBotProtection,
  resolveBotProtection,
} from 'veysur-common'
import { DataSourceRedis } from '@datacapy/om'
import type { Redis } from 'ioredis'

import {
  BotProtectionVerifierRegistry,
  errorBotCheckFailed,
  MemorySingleUseStore,
  RecaptchaVerifier,
  RedisSingleUseStore,
  SimpleChallenge,
  SimpleVerifier,
  SingleUseStore,
  TurnstileVerifier,
} from './botProtection'

/**
 * Bot checks for the survey start step. The project picks a provider and its
 * keys (`settingSurvey.botProtection`); a survey opts in with `access.botProtection`.
 * Design: docs/bot-protection.md.
 */
export class ServiceBotProtection extends Service {
  private registry: BotProtectionVerifierRegistry | null = null
  private simple: SimpleVerifier | null = null

  constructor() {
    super({
      name: 'botProtection',
    })
  }

  /** What the check is for this survey, with no secret in it. */
  resolve(
    setting: BotProtectionSetting | null | undefined,
    surveyEnabled: boolean | null | undefined,
  ): ResolvedBotProtection {
    return resolveBotProtection(setting, surveyEnabled)
  }

  /**
   * The setting a survey really uses: each value is the survey's own, else the
   * project's. Resolved live, so a key change applies to published surveys
   * the same way a project change always has.
   */
  effectiveSetting({
    survey,
    project,
  }: {
    survey: BotProtectionSetting | null | undefined
    project: BotProtectionSetting | null | undefined
  }): BotProtectionSetting {
    const keysFor = (provider: 'cloudflare' | 'google') => ({
      siteKey:
        survey?.[provider]?.siteKey?.trim() || project?.[provider]?.siteKey,
      secretKey:
        survey?.[provider]?.secretKey?.trim() ||
        project?.[provider]?.secretKey?.trim() ||
        '',
    })
    return {
      provider: survey?.provider || project?.provider,
      cloudflare: keysFor('cloudflare'),
      google: keysFor('google'),
    }
  }

  issueChallenge(surveyId: string): SimpleChallenge {
    return this.getSimpleVerifier().issueChallenge(surveyId)
  }

  /**
   * The challenge an account form (login, signup) solves, or `enabled: false`
   * when the deployment has turned the check off.
   */
  issueAccountChallenge(): { enabled: boolean } & Partial<SimpleChallenge> {
    if (!this.isAccountCheckEnabled()) return { enabled: false }
    return {
      enabled: true,
      ...this.getSimpleVerifier().issueChallenge(BOT_PROTECTION_ACCOUNT_SCOPE),
    }
  }

  /**
   * Call first in any account endpoint that takes a `botCheck`. Throws
   * `ERROR_BOT_CHECK_FAILED` unless the solution is valid, unused and
   * unexpired, and the honeypot is empty. A no-op when the check is off.
   */
  async assertAccountBotCheck(botCheck: BotCheck | null | undefined) {
    if (!this.isAccountCheckEnabled()) return
    const verified =
      !!botCheck?.token &&
      !botCheck.honeypot &&
      (await this.getSimpleVerifier().verify({
        token: botCheck.token,
        secretKey: '',
        surveyId: BOT_PROTECTION_ACCOUNT_SCOPE,
      }))
    if (!verified) throw errorBotCheckFailed()
  }

  private isAccountCheckEnabled(): boolean {
    return this.config.model.app.botProtection.accountCheckEnabled
  }

  /**
   * Verify a widget token against the project's provider. A honeypot value
   * means a form-filling bot, so it fails whatever the token says.
   */
  async verify({
    setting,
    surveyId,
    token,
    honeypot,
    remoteIp,
  }: {
    setting: BotProtectionSetting | null | undefined
    surveyId: string
    token: string
    honeypot?: string | null
    remoteIp?: string
  }): Promise<boolean> {
    if (honeypot || !token) return false
    const resolved = resolveBotProtection(setting, true)
    if (resolved.provider === 'none') return false

    const secretKey =
      resolved.provider === BOT_PROTECTION_PROVIDER_SIMPLE
        ? ''
        : setting[resolved.provider].secretKey.trim()
    return this.getRegistry()
      .get(resolved.provider)
      .verify({ token, secretKey, surveyId, remoteIp })
  }

  private getRegistry(): BotProtectionVerifierRegistry {
    if (!this.registry) {
      const { botProtection } = this.config.model.app
      this.registry = new BotProtectionVerifierRegistry()
      this.registry.register(new TurnstileVerifier())
      this.registry.register(
        new RecaptchaVerifier(botProtection.recaptchaMinScore),
      )
      this.registry.register(this.getSimpleVerifier())
    }
    return this.registry
  }

  private getSimpleVerifier(): SimpleVerifier {
    if (!this.simple) {
      const { botProtection, jwt } = this.config.model.app
      this.simple = new SimpleVerifier(
        {
          signingKey: jwt.key,
          powBits: botProtection.powBits,
          minSeconds: botProtection.minSeconds,
        },
        this.createSingleUseStore(),
      )
    }
    return this.simple
  }

  private createSingleUseStore(): SingleUseStore {
    const redis = this.modelManager.dataSources['cacheDb'] as
      DataSourceRedis | undefined
    const client = redis?.connected
      ? (redis as unknown as { client?: Redis }).client
      : undefined
    return client ? new RedisSingleUseStore(client) : new MemorySingleUseStore()
  }
}

export default ServiceBotProtection
