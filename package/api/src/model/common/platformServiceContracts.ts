/**
 * Structural contracts for platform-layer collaborators that core/root services
 * consult *when present*. Core resolves them by name via getService()/getRepo()
 * and skips the behaviour entirely when the collaborator is absent (the
 * self-hosted edition, which has no billing / geo / domain-block layer).
 *
 * Keeps core free of static imports from the platform service/repo trees.
 */

export interface GeoServiceContract {
  detectCountry(args: { ip?: string }): Promise<{ country: string }>
  isCountryBlocked(countryCode: string): boolean
}

export interface ProjectSubscriptionServiceContract {
  queueFreeOnDeletion(args: { projectId: string }): Promise<unknown>
  resolveDeletionQueuedChange(args: { projectId: string }): Promise<unknown>
}

export interface VatServiceContract {
  assertVatCountryMatchesBilling(
    taxId: string | null,
    country?: string | null,
  ): void
}

export interface EmailDomainBlockRepoContract {
  isBlocked(domain: string): Promise<boolean>
}
