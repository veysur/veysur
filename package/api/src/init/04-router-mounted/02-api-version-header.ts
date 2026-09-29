import { Server } from '@datacapy/server'

export const initApiVersionHeader = function (server: Server) {
  server.app.use((_req, res, next) => {
    res.setHeader('X-API-Version', process.env.BUILD_VERSION ?? 'dev')
    next()
  })
}

export default initApiVersionHeader
