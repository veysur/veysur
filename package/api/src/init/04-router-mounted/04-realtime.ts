import { Server } from '@datacapy/server'
import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { DataSourceRedis } from '@datacapy/om'

import { RealtimeAuthenticator } from 'realtime/RealtimeAuthenticator'
import { RealtimeGateway } from 'realtime/RealtimeGateway'
import { REALTIME_SOCKET_PATH } from 'realtime/constant'
import type { ServiceRealtime } from 'model/service/ServiceRealtime'

/**
 * Attach the socket.io server to the HTTP server. Websocket transport only, so
 * no sticky sessions are needed behind a load balancer. With Redis, the adapter
 * fans events out across API pods (and receives the worker's emitter publishes).
 */
export const initRealtime = function (server: Server) {
  const modelManager = server.modelManager
  const io = new SocketServer(server.server, {
    path: REALTIME_SOCKET_PATH,
    transports: ['websocket'],
    serveClient: false,
  })

  const redis = modelManager.dataSources['cacheDb'] as
    DataSourceRedis | undefined
  if (redis) {
    const pubClient = redis.duplicate({ keyPrefix: undefined })
    const subClient = redis.duplicate({ keyPrefix: undefined })
    io.adapter(createAdapter(pubClient, subClient))
  }

  const gateway = new RealtimeGateway(
    io,
    new RealtimeAuthenticator(
      server.config.model.app.jwt,
      modelManager.getSchema('jwtAdmin'),
    ),
  )
  gateway.start()

  const realtime = modelManager.getService('realtime') as ServiceRealtime
  realtime.attachIo(io)

  return async () => {
    gateway.stop()
    realtime.attachIo(null)
    await io.close()
  }
}

export default initRealtime
