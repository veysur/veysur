export type FetchFn = typeof fetch

export interface BotVerifyInput {
  /** The widget token (or `challenge:nonce` for the simple provider). */
  token: string
  /** The project's provider secret; unused by `simple`. */
  secretKey: string
  surveyId: string
  /** Omitted for anonymous surveys, which must not pass an address on. */
  remoteIp?: string
}

export interface BotProtectionVerifier {
  readonly provider: string
  verify(input: BotVerifyInput): Promise<boolean>
}
