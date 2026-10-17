export type BotProtectionProviderName = 'cloudflare' | 'google' | 'simple'

export interface BotChallenge {
  challenge: string
  bits: number
  /** How long to wait before submitting a solution, in seconds. */
  minSeconds: number
}

/** A pending or passed bot check, as the survey page hands it to the start step. */
export interface BotCheckConfig {
  provider: BotProtectionProviderName
  siteKey: string
  verified: boolean
  fetchChallenge: () => Promise<BotChallenge>
  verify: (token: string, honeypot: string) => Promise<void>
}

export interface BotProtectionSolveOptions {
  /** Where a provider may draw UI when it needs the participant to act. */
  container: HTMLElement
  siteKey: string
  fetchChallenge: () => Promise<BotChallenge>
}

/**
 * What the start step needs from a bot check. The gate knows nothing about
 * Turnstile, reCAPTCHA or proof of work, so a provider is swappable.
 */
export interface BotProtectionProvider {
  readonly name: BotProtectionProviderName
  /** Resolves with the token the API verifies. */
  solve: (options: BotProtectionSolveOptions) => Promise<string>
}
