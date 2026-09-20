/**
 * `subdomain`/`domain` are extension-only project fields - core's `Project` type
 * (self-hosted's single, config-sourced project) doesn't carry them, so this
 * generic constraint is declared locally rather than derived from `Project`.
 */
interface ProjectWithDomain {
  _id: string
  subdomain?: string
  domain?: string
}

/**
 * How the admin app decides which project it is operating on.
 *
 * - `subdomain` (default): match `window.location.host` against each of
 *   the user's projects' `subdomain` / `domain`. One project is served per
 *   subdomain.
 * - `single` (self-hosted): there is one project (one DB, initialised at
 *   install), so return it regardless of host.
 *
 * Baked at build time from `PUBLIC_PROJECT_SCOPE`; anything other than the exact
 * string `single` resolves to `subdomain`.
 */
export type ProjectScopeStrategy = 'subdomain' | 'single'

export function getProjectScopeStrategy(): ProjectScopeStrategy {
  return process.env.PUBLIC_PROJECT_SCOPE === 'single' ? 'single' : 'subdomain'
}

/**
 * Resolve the active project from the user's project list and the current
 * location. `projects` is the combined owned + admin list (from
 * `getUserProjects()`).
 */
export function resolveActiveProject<T extends ProjectWithDomain>(
  projects: Array<T | undefined>,
  loc: { host: string },
  strategy: ProjectScopeStrategy = getProjectScopeStrategy(),
): T | null {
  if (strategy === 'single') {
    return projects.find((project): project is T => !!project) ?? null
  }

  const byHost = new Map<string, T>()
  for (const project of projects) {
    if (!project) continue
    if (project.subdomain) byHost.set(project.subdomain, project)
    if (project.domain) byHost.set(project.domain, project)
  }
  return byHost.get(loc.host) ?? null
}
