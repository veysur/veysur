import { Registry } from 'model/common'

import { BotProtectionVerifier } from './BotProtectionVerifier'

export class BotProtectionVerifierRegistry extends Registry<BotProtectionVerifier> {
  constructor() {
    super({
      keyExtractor: (verifier) => verifier.provider,
      errorMessagePrefix: 'Unsupported bot protection provider',
      itemTypeName: 'Provider',
    })
  }
}
