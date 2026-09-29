import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import type { Request, Response, NextFunction } from 'express'
import { Server } from '@datacapy/server'

const LOCALE_DIR = path.join(__dirname, '../../locale')

export const initLocaleStatic = function (server: Server) {
  server.app.use(
    '/api/locale',
    (req: Request, res: Response, next: NextFunction) => {
      // req.path is already relative to the '/api/locale' mount point
      const relativePath = path.normalize(req.path).replace(/^[/\\]+/, '')
      const filePath = path.join(LOCALE_DIR, relativePath)

      // Reject any path that escapes LOCALE_DIR (e.g. via '..' segments)
      if (!filePath.startsWith(LOCALE_DIR + path.sep)) {
        res.status(403).end()
        return
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          next()
          return
        }
        // Content-derived ETag so the browser always revalidates against the actual
        // file rather than trusting a caller-supplied cache-busting query param
        // (which is a constant 'dev' value in local dev, causing stale caches).
        const etag = `"${crypto.createHash('sha1').update(data).digest('hex')}"`
        res.setHeader('ETag', etag)
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')

        if (req.headers['if-none-match'] === etag) {
          res.status(304).end()
          return
        }

        res.type('application/json')
        res.send(data)
      })
    },
  )
}

export default initLocaleStatic
