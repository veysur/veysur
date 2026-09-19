import { Service } from 'mzen-server'
import type { EmailDomainBlockRepoContract } from 'model/common'

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
}
