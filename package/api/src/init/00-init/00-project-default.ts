import { Server } from 'mzen-server'
import { DEFAULT_PROJECT_ID } from 'veysur-common'

import { isSelfHosted } from 'config/edition'

/**
 * Self-hosted has exactly one project, provisioned at install time under the
 * fixed id DEFAULT_PROJECT_ID. Cloud derives X-Project-Id from the request's
 * subdomain, via its own init step in the commercial package; self-hosted has
 * no subdomain to derive it from, so it's supplied unconditionally here
 * instead.
 */
export const initProjectDefault = function (server: Server) {
  if (!isSelfHosted()) return

  server.router.use((req, _res, next) => {
    if (!req.headers['x-project-id']) {
      req.headers['x-project-id'] = DEFAULT_PROJECT_ID
    }
    next()
  })
}

export default initProjectDefault
