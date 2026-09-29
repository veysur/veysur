import { Server } from '@datacapy/server'
import { DataSourceRedis } from '@datacapy/om'

import { authHandoffStore } from 'service/auth-handoff/AuthHandoffStore'

/**
 * Wire the Redis datasource into the auth handoff token store, mirroring
 * initRateLimitRedis (src/init/00-init/07-rate-limit.ts) - same shared
 * `cacheDb` datasource, no new Redis connection.
 */
export const initAuthHandoffRedis = async function (server: Server) {
  const redis =
    (server.modelManager.dataSources['cacheDb'] as DataSourceRedis) || null
  authHandoffStore.init(redis)
}

export default initAuthHandoffRedis
