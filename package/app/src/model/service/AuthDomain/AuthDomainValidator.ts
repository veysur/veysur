import { AuthData } from 'hook'
import { getUserProjects } from 'common'

import { AuthDomainValidatorInterface } from './types'

// Cross-domain auth handoff only applies to cloud's subdomain-per-project
// routing - core's trimmed Project type has no `subdomain`/`domain`, so this
// local shape describes what the cloud auth payload actually populates
// projectOwn/projectAdmin entries with (see ProjectApi.ts's
// CloudProjectResponse for the same pattern).
interface CloudProject {
  subdomain?: string
  domain?: string
}

/**
 * AuthDomainValidator
 *
 * Handles domain authorization validation for cross-domain authentication.
 * Validates that target domains are in the user's authorized projects.
 */
export class AuthDomainValidator implements AuthDomainValidatorInterface {
  /**
   * Extracts all authorized domains from user's project ownership and admin records
   */
  getAuthorizedDomains = (
    authData?: AuthData,
  ): Set<string | null | undefined> => {
    const authDomains = new Set<string | null | undefined>()

    if (!authData?.user) {
      return authDomains
    }

    const projects = getUserProjects(
      authData.user.projectOwn,
      authData.user.projectAdmin,
    ) as unknown as CloudProject[]
    projects.forEach((project) => {
      authDomains.add(project?.subdomain)
      authDomains.add(project?.domain)
    })

    return authDomains
  }

  /**
   * Checks if the target URL's domain is authorized for the user
   */
  isTargetDomainAuthorized = (url: string, authData?: AuthData): boolean => {
    if (!authData?.user) {
      return false
    }

    const authDomains = this.getAuthorizedDomains(authData)
    const targetHost = this.getHostFromUrl(url)
    return authDomains.has(targetHost)
  }

  /**
   * Extracts host from URL, returns null for invalid URLs
   */
  getHostFromUrl = (url: string): string | null => {
    try {
      return new URL(url).host
    } catch {
      return null
    }
  }
}
