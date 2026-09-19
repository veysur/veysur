import { isSelfHosted } from 'config/edition'

/**
 * Cloud mounts its own, richer `/project/*` surface (create/rename/delete/
 * restore/subdomain, plus its own `putProjectTimezone`) from the commercial
 * package, unconditionally merged into the endpoint list alongside this core
 * config (see `composeModel.ts` — there is no dedup across endpoint configs,
 * unlike services/repos/schemas). Gate `putProjectTimezone` here to
 * self-hosted only, or cloud would register two conflicting handlers for the
 * same route.
 */
export const projectConfig = {
  service: 'project',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: isSelfHosted()
    ? {
        putProjectTimezone: {
          path: '/:projectId/timezone',
          method: 'updateTimezone',
          verbs: ['put'],
          data: {
            projectId: { src: 'param' },
            timezone: { src: 'body', required: true },
          },
          acl: {
            rules: [{ allow: true, role: 'projectOwner' }],
          },
        },
      }
    : {},
}

export default projectConfig
