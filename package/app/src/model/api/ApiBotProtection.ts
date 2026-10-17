import { BotChallenge } from 'component/BotProtection/BotProtectionProvider'

import { Api } from './Api'
import { ErrorRest } from './ErrorRest'

/** `enabled: false` when the deployment has turned the account bot check off. */
export type AccountChallenge =
  { enabled: false } | ({ enabled: true } & BotChallenge)

export class ApiBotProtection extends Api {
  /** A proof-of-work challenge for login, signup and other account forms. */
  async accountChallenge(): Promise<AccountChallenge> {
    try {
      return await this.getClient().post<AccountChallenge>(
        '/bot-protection/challenge',
        {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
