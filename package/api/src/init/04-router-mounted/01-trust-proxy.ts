import { Server } from '@datacapy/server'

// https://expressjs.com/en/guide/behind-proxies.html
export const initTrustProxy = function (server: Server) {
  server.trustProxy(['loopback', 'linklocal', 'uniquelocal'])
}

export default initTrustProxy
