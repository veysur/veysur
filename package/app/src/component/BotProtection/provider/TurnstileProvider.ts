import {
  BotProtectionProvider,
  BotProtectionSolveOptions,
} from '../BotProtectionProvider'
import { loadScript } from './loadScript'

const TURNSTILE_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      appearance: 'interaction-only'
      callback: (token: string) => void
      'error-callback': () => void
      'expired-callback': () => void
    },
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/** Turnstile in `interaction-only` mode: it shows UI only when it cannot decide silently. */
export class TurnstileProvider implements BotProtectionProvider {
  readonly name = 'cloudflare'

  async solve({ container, siteKey }: BotProtectionSolveOptions) {
    await loadScript(TURNSTILE_SRC)
    const turnstile = window.turnstile
    if (!turnstile) throw new Error('Turnstile did not load')

    return new Promise<string>((resolve, reject) => {
      const widgetId = turnstile.render(container, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        callback: (token) => {
          turnstile.remove(widgetId)
          resolve(token)
        },
        'error-callback': () => reject(new Error('Turnstile failed')),
        'expired-callback': () => reject(new Error('Turnstile expired')),
      })
    })
  }
}
