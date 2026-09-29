/**
 * Subdomain validation constants and utilities
 * Used for both client-side and server-side subdomain validation
 */

export const SUBDOMAIN_MIN_LENGTH = 3

export const SUBDOMAIN_RESERVED_WORDS = [
  'account',
  'accounts',
  'admin',
  'admins',
  'alpha',
  'analytics',
  'api',
  'app',
  'application',
  'assets',
  'auth',
  'backup',
  'beta',
  'billing',
  'blog',
  'cdn',
  'chat',
  'cloud',
  'community',
  'console',
  'cs',
  'customer',
  'customer-service',
  'dashboard',
  'data',
  'database',
  'db',
  'demo',
  'dev',
  'developer',
  'developers',
  'doc',
  'docs',
  'documentation',
  'download',
  'email',
  'error',
  'errors',
  'feedback',
  'forum',
  'ftp',
  'git',
  'health',
  'help',
  'holding',
  'imap',
  'internal',
  'job',
  'jobs',
  'join',
  'login',
  'm',
  'mail',
  'manage',
  'mx',
  'news',
  'ns',
  'ns1',
  'ns2',
  'ns3',
  'ns4',
  'pay',
  'payments',
  'platform',
  'pop',
  'pop3',
  'portal',
  'preview',
  'registry',
  'sandbox',
  'secure',
  'service',
  'services',
  'sftp',
  'signup',
  'smtp',
  'stage',
  'staging',
  'static',
  'status',
  'support',
  'survey',
  'test',
  'upload',
  'user',
  'users',
  'veysur',
  'vpn',
  'work',
  'www',
] as const

// Stricter regex following DNS subdomain RFC standards
// Must start with letter, end with letter/number, hyphens only in middle
export const SUBDOMAIN_PREFIX_REGEX = /^[a-z]([a-z0-9-]*[a-z0-9])?$/

// Full domain (subdomain.domain.tld) — used to validate a project's full
// subdomain/domain field (e.g. "myproject.veysur.com"), not just the prefix.
export const SCHEMA_PROJECT_DOMAIN_REGEX =
  /^(?:[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/

export const SUBDOMAIN_REQUIREMENTS = [
  `Min ${SUBDOMAIN_MIN_LENGTH} characters`,
  'Only lowercase letters, numbers, and hyphens',
  'Must start and end with letter',
  'Must not be a reserved word',
]

/**
 * Validates a subdomain prefix against format and business rules
 * Compat,ible with @datacapy/schema .validate() validator
 *
 * This validates the PREFIX only (e.g., "myproject"), not the full subdomain
 *
 * @param subdomainPrefix - The subdomain prefix to validate (e.g., "myproject")
 * @returns true if valid, error message string if invalid
 */
export function validateSubdomainPrefix(
  subdomainPrefix: string,
): true | string {
  if (!subdomainPrefix || subdomainPrefix.trim() === '') {
    return 'Subdomain is required'
  }

  const trimmed = subdomainPrefix.trim().toLowerCase()

  if (trimmed.length < SUBDOMAIN_MIN_LENGTH) {
    return `Subdomain must be at least ${SUBDOMAIN_MIN_LENGTH} characters`
  }

  if (!SUBDOMAIN_PREFIX_REGEX.test(trimmed)) {
    return 'Subdomain must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number'
  }

  if ((SUBDOMAIN_RESERVED_WORDS as readonly string[]).includes(trimmed)) {
    return 'This subdomain is reserved and cannot be used'
  }

  return true
}
