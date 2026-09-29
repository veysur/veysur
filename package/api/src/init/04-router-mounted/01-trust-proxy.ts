import { Server } from '@datacapy/server'

// https://expressjs.com/en/guide/behind-proxies.html
export const initTrustProxy = function (server: Server) {
  server.app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])
}

export default initTrustProxy
