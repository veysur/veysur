import {
  BotProtectionProvider,
  BotProtectionProviderName,
} from './BotProtectionProvider'

/** Loads a provider on demand so nothing is fetched for a survey without a bot check. */
export async function loadBotProtectionProvider(
  name: BotProtectionProviderName,
): Promise<BotProtectionProvider> {
  switch (name) {
    case 'cloudflare': {
      const { TurnstileProvider } = await import('./provider/TurnstileProvider')
      return new TurnstileProvider()
    }
    case 'google': {
      const { RecaptchaProvider } = await import('./provider/RecaptchaProvider')
      return new RecaptchaProvider()
    }
    case 'simple': {
      const { PowProvider } = await import('./provider/PowProvider')
      return new PowProvider()
    }
  }
}
