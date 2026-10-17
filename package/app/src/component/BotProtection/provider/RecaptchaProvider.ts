// cspell:ignore grecaptcha Grecaptcha
import {
  BotProtectionProvider,
  BotProtectionSolveOptions,
} from '../BotProtectionProvider'
import { loadScript } from './loadScript'

const RECAPTCHA_SRC = 'https://www.google.com/recaptcha/api.js?render='
const ACTION = 'survey_start'

interface GrecaptchaApi {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaApi
  }
}

/** reCAPTCHA v3: invisible, scored on the server. */
export class RecaptchaProvider implements BotProtectionProvider {
  readonly name = 'google'

  async solve({ siteKey }: BotProtectionSolveOptions) {
    await loadScript(`${RECAPTCHA_SRC}${encodeURIComponent(siteKey)}`)
    const grecaptcha = window.grecaptcha
    if (!grecaptcha) throw new Error('reCAPTCHA did not load')

    await new Promise<void>((resolve) => grecaptcha.ready(resolve))
    return grecaptcha.execute(siteKey, { action: ACTION })
  }
}
