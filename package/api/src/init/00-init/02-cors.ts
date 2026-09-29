import { Server } from '@datacapy/server'

import { app as appConfig } from 'config/default'

const allowedMethods = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
const allowedHeaders = [
  'Content-Type',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
  'authorization',

  'Device-Id',
  'Device-Name',
  'Device-System',
  'Build-Version',
  'Build-Number',
  'Notification-Token',

  'X-Project-Id',
  'X-Project-Subdomain',
].join(',')

function isAllowedOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return appConfig.cors.allowedDomains.some(
      (domain: string) => host === domain || host.endsWith(`.${domain}`),
    )
  } catch {
    return false
  }
}

export const initCors = function (server: Server) {
  server.router.use(function (req, res, next) {
    const origin = req.headers.origin

    res.set('Vary', 'Origin')
    res.set('Access-Control-Allow-Methods', allowedMethods)
    res.set('Access-Control-Allow-Headers', allowedHeaders)

    if (origin && isAllowedOrigin(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    next()
  })
}

export default initCors
