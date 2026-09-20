import { AppConfig } from './types'

export type AppUrlTarget = 'account' | 'platform' | 'survey'

/**
 * Builds an absolute URL to another frontend app (account/survey, plus any app an extension adds),
 * respecting the per-edition domain/path-prefix config in `config/default.ts`
 * (subdomain-per-app by default, single-domain path-prefix in self-hosted).
 */
export function buildAppUrl(
  app: Pick<
    AppConfig,
    | 'accountDomain'
    | 'accountBasePath'
    | 'platformDomain'
    | 'platformBasePath'
    | 'webDomain'
  >,
  target: AppUrlTarget,
  path: string,
): string {
  const [domain, basePath] =
    target === 'account'
      ? [app.accountDomain, app.accountBasePath]
      : target === 'platform'
        ? [app.platformDomain, app.platformBasePath]
        : [app.webDomain, '/survey']
  return `https://${domain}${basePath}/${path}`
}
