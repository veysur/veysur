import { isSelfHosted } from 'config/edition'

/**
 * An extension may mount its own, richer `/project/*` surface (including its
 * own `putProjectTimezone`), unconditionally merged into the endpoint list alongside this core
 * config (see `composeModel.ts` — there is no dedup across endpoint configs,
 * unlike services/repos/schemas). Gate `putProjectTimezone` here to
 * self-hosted only, or an extension would register two conflicting handlers for the
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
