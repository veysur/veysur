import { Server } from '@datacapy/server'

import { isSelfHosted } from 'config/edition'
import { ServiceProject } from 'model/service/ServiceProject'

/**
 * Loads (creating on first boot) self-hosted's single Project row and caches
 * it on `ServiceProject`, before the router is mounted — see the docblock on
 * `ServiceProject` for why this must run before any request is served.
 *
 * An extension can override `ServiceProject` entirely with a multi-project
 * implementation (no singleton cache to warm), so this is self-hosted only.
 */
export const initProject = async function (server: Server) {
  if (!isSelfHosted()) return

  const service = server.modelManager.services['project'] as ServiceProject
  await service.ensureLoaded()
  server.logger.info('[Project] Loaded')
}

export default initProject
