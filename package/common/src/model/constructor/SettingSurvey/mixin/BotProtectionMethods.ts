import { BOT_PROTECTION_PROVIDER_NONE } from '../../../service/BotProtectionConfig'
import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultBotProtection = {
  provider: BOT_PROTECTION_PROVIDER_NONE,
  cloudflare: { siteKey: '', secretKey: '' },
  google: { siteKey: '', secretKey: '' },
}

export function BotProtectionMethods<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return class extends Base {
    setBotProtectionProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.botProtection,
        defaultBotProtection,
        'botProtection',
        key,
        value,
      )
    }

    updateBotProtection(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.botProtection,
        defaultBotProtection,
        'botProtection',
        updates,
      )
    }
  }
}
