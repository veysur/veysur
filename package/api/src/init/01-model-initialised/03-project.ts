import { Server } from '@datacapy/server'

import { contextForProject } from 'common'
import { isSelfHosted } from 'config/edition'
import { ServiceProject } from 'model/service/ServiceProject'
import type { ServiceSettingSurvey } from 'model/service/core/ServiceSettingSurvey'

/**
 * Loads (creating on first boot) self-hosted's single Project row and caches
 * it on `ServiceProject`, before the router is mounted — see the docblock on
 * `ServiceProject` for why this must run before any request is served.
 *
 * It also creates the project's survey settings, which publishing needs. A multi-project
 * extension does that when it creates each project.
 *
 * An extension can override `ServiceProject` entirely with a multi-project
 * implementation (no singleton cache to warm), so this is self-hosted only.
 */
export const initProject = async function (server: Server) {
  if (!isSelfHosted()) return

  const service = server.modelManager.services['project'] as ServiceProject
  const project = await service.ensureLoaded()
  await (
    server.modelManager.services['settingSurvey'] as ServiceSettingSurvey
  ).initForProject(project._id, contextForProject(project._id))
  server.logger.info('[Project] Loaded')
}

export default initProject
