import { Service, ServerErrorBadRequest } from '@datacapy/server'
import type { EmailDomainBlockRepoContract } from 'model/common'

const ERROR_DISPOSABLE_EMAIL_DOMAIN = 'ERROR_DISPOSABLE_EMAIL_DOMAIN'

const REJECTION_KEYS: Record<string, string> = {
  [ERROR_DISPOSABLE_EMAIL_DOMAIN]: 'error.disposableEmailDomain',
}

export class ServiceEmailDomainCheck extends Service {
  constructor() {
    super({ name: 'emailDomainCheck' })
  }

  async isDisposableEmailDomain(email: string): Promise<boolean> {
    const domain = email.split('@')[1]?.toLowerCase().trim()
    if (!domain) return false

    const repo = this.getRepo('emailDomainBlock') as unknown as
      EmailDomainBlockRepoContract | undefined
    if (!repo) return false // no block list (self-hosted)
    return repo.isBlocked(domain)
  }

  /**
   * The `ref` of the rule an address breaks when an account sets or changes
   * it, or `null` if acceptable. An extension overrides this to add rules.
   */
  async getRejectionRef(email: string): Promise<string | null> {
    return (await this.isDisposableEmailDomain(email))
      ? ERROR_DISPOSABLE_EMAIL_DOMAIN
      : null
  }

  /**
   * Throws a 400 carrying the broken rule's `ref`. `messages` maps a `ref` to
   * its user message; a `ref` without an entry gets a generic message.
   */
  async assertAcceptable(
    email: string,
    messages: Record<string, string> = {},
  ): Promise<void> {
    const ref = await this.getRejectionRef(email)
    if (!ref) return
    throw new ServerErrorBadRequest({
      ref,
      key: REJECTION_KEYS[ref] ?? `error.${ref}`,
      userMessage: messages[ref] ?? 'Please use a different email address',
    })
  }
}
