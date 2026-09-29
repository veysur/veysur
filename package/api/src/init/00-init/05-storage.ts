import { Server } from 'mzen-server'
import {
  createStorageAdaptor,
  createStorageMiddleware,
  verifyUploadToken,
} from 'common'
import { app as appConfig } from 'config/default'
import type { StorageConfig } from 'common'
import type { Request, Response, NextFunction } from 'express'

function buildStorageConfig(): StorageConfig {
  const s3 = appConfig.s3
  return {
    type: s3.type as 'local' | 's3',
    region: s3.region,
    publicBucket: s3.publicBucket,
    privateBucket: s3.privateBucket,
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
    publicBaseUrl: s3.publicBaseUrl,
    uploadSecret: s3.uploadSecret,
    localPath: s3.localPath,
    maxUploadSize: s3.maxUploadSize,
    endpoint: s3.endpoint,
    forcePathStyle: s3.forcePathStyle,
  }
}

async function readBody(req: Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export const initStorage = function (server: Server) {
  const storageConfig = buildStorageConfig()
  const adaptor = createStorageAdaptor(storageConfig)

  // Mount local file serving middleware (local mode only)
  const localMiddleware = createStorageMiddleware(storageConfig)
  if (localMiddleware) {
    server.app.get('/storage/:bucket/*key', localMiddleware)
  }

  // Mount upload endpoint — handles file body upload for both local and S3 modes.
  // Client PUTs raw file body to this endpoint with a signed token.
  // This must be registered on server.app BEFORE mzen-server mounts its router.
  server.app.put(
    '/api/file/upload/:bucket/*key',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const bucket = req.params.bucket as string
        // Express 5 wildcard: path segments as an array
        const key = (req.params.key as string[]).join('/')
        const token = req.query.token as string | undefined

        if (!token) {
          res.status(401).json({ error: 'Missing upload token' })
          return
        }

        let claims: { bucket: string; key: string }
        try {
          claims = verifyUploadToken(storageConfig.uploadSecret, token)
        } catch {
          res.status(403).json({ error: 'Invalid or expired upload token' })
          return
        }

        if (claims.bucket !== bucket || claims.key !== key) {
          res.status(403).json({ error: 'Token does not match upload target' })
          return
        }

        const body = await readBody(req)
        const contentType =
          (req.headers['content-type'] as string) || 'application/octet-stream'

        await adaptor.putObject({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })

        res.json({ success: true })
      } catch (err) {
        next(err)
      }
    },
  )
}

export default initStorage
