import { Server } from '@datacapy/server'

export const initApiVersionHeader = function (server: Server) {
  server.use('app', (_req, res, next) => {
    res.header('X-API-Version', process.env.BUILD_VERSION ?? 'dev')
    next()
  })
}

export default initApiVersionHeader
