import { ServerErrorForbidden } from '@datacapy/server'

export const ERROR_BOT_CHECK_FAILED = 'ERROR_BOT_CHECK_FAILED'

export const errorBotCheckFailed = () =>
  new ServerErrorForbidden({
    ref: ERROR_BOT_CHECK_FAILED,
    key: 'error.botCheckFailed',
    userMessage: 'Please complete the security check to continue',
  })

export interface ParticipantBotClaims {
  botRequired?: boolean | null
  botVerified?: boolean | null
}

/**
 * Reject a participant JWT that must pass a bot check and has not. A JWT with
 * no `botRequired` claim (survey without a check, or issued before bot
 * protection existed) passes.
 */
export function assertBotVerified(
  claims: ParticipantBotClaims | null | undefined,
): void {
  if (claims?.botRequired && !claims.botVerified) {
    throw errorBotCheckFailed()
  }
}
