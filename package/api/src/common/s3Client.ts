import { S3Adaptor, createLocalFileMiddleware } from 's3-adaptor'
import type { S3AdaptorConfig, LocalConfig } from 's3-adaptor'
import { createHmac, timingSafeEqual } from 'crypto'
import crypto from 'crypto'
import fs from 'fs'
import type { RequestHandler } from 'express'

export interface StorageConfig {
  type: 'local' | 's3'
  publicBucket: string
  privateBucket: string
  maxUploadSize: number
  region: string
  accessKeyId: string
  secretAccessKey: string
  uploadSecret: string // HMAC secret for upload tokens (both modes)
  publicBaseUrl: string // Public base URL (https://veysur.com) for upload + local download URLs
  localPath: string // Filesystem path for local mode (/data/files)
  endpoint?: string // Custom S3-compatible endpoint (e.g. Garage)
  forcePathStyle?: boolean // Required for path-style S3 endpoints (e.g. Garage)
}

// Backward-compat alias
export type S3Config = StorageConfig

function buildLocalConfig(config: StorageConfig): LocalConfig {
  return {
    storagePath: config.localPath,
    baseUrl: config.publicBaseUrl,
    secretKey: config.uploadSecret,
    buckets: {
      [config.publicBucket]: { public: true },
      [config.privateBucket]: { public: false },
    },
  }
}

/**
 * Create storage adaptor from configuration
 */
export function createStorageAdaptor(config: StorageConfig): S3Adaptor {
  const adaptorConfig: S3AdaptorConfig =
    config.type === 'local'
      ? {
          defaultType: 'local',
          local: buildLocalConfig(config),
        }
      : {
          defaultType: 's3',
          s3: {
            region: config.region,
            credentials: config.accessKeyId
              ? {
                  accessKeyId: config.accessKeyId,
                  secretAccessKey: config.secretAccessKey,
                }
              : undefined,
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
          },
        }

  return new S3Adaptor(adaptorConfig)
}

/**
 * Create local file middleware for serving stored files
 * Returns null when not in local mode
 */
export function createStorageMiddleware(
  config: StorageConfig,
): RequestHandler | null {
  if (config.type !== 'local') return null
  return createLocalFileMiddleware(buildLocalConfig(config))
}

// ─── Token signing (same algorithm as s3-adaptor TokenSigner) ─────────────────

interface UploadTokenPayload {
  bucket: string
  key: string
  exp: number
}

/**
 * Sign an upload token (HMAC-SHA256, base64url, same format as s3-adaptor)
 */
export function signUploadToken(
  secret: string,
  bucket: string,
  key: string,
  expiresIn: number = 900,
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresIn
  const payload: UploadTokenPayload = { bucket, key, exp }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

/**
 * Verify an upload token - throws on invalid/expired
 */
export function verifyUploadToken(
  secret: string,
  token: string,
): UploadTokenPayload {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) throw new Error('Invalid token')

  const data = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)

  const expected = createHmac('sha256', secret).update(data).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)

  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new Error('Invalid token signature')
  }

  let payload: UploadTokenPayload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString())
  } catch {
    throw new Error('Invalid token payload')
  }

  if (Date.now() > payload.exp * 1000) throw new Error('Token expired')

  return payload
}

/**
 * Generate a signed upload URL.
 * - local mode: HMAC token URL routed through the API upload endpoint
 * - s3 mode: pre-signed S3 PUT URL rewritten to the public nginx proxy path (/veysur-s3/)
 */
export async function generateSignedUploadUrl(
  config: StorageConfig,
  bucket: string,
  key: string,
  expiresIn: number = 900,
): Promise<string> {
  if (config.type !== 's3' || !config.endpoint) {
    const token = signUploadToken(config.uploadSecret, bucket, key, expiresIn)
    return `${config.publicBaseUrl}/api/file/upload/${bucket}/${key}?token=${token}`
  }

  const adaptor = createStorageAdaptor(config)
  const internalUrl = await adaptor.getSignedUrl({
    Bucket: bucket,
    Key: key,
    Expires: expiresIn,
    operation: 'put',
  })
  // Rewrite internal Garage endpoint to the public base URL — nginx routes PUT
  // on /veysur-files/ to Garage port 3900 with the correct Host for SigV4 verification
  return internalUrl.replace(config.endpoint, config.publicBaseUrl)
}

/**
 * Generate a signed download URL, rewriting the internal S3 endpoint to the
 * public base URL so the link is accessible from browsers (same rewrite pattern
 * as generateSignedUploadUrl).
 */
export async function generateSignedDownloadUrl(
  config: StorageConfig,
  adaptor: S3Adaptor,
  bucket: string,
  key: string,
  options: { expiresIn: number; filename?: string },
): Promise<string> {
  const baseParams = { Bucket: bucket, Key: key, Expires: options.expiresIn }
  const signedParams = options.filename
    ? {
        ...baseParams,
        ResponseContentDisposition: `attachment; filename="${options.filename}"`,
      }
    : baseParams
  const internalUrl = await adaptor.getSignedUrl(signedParams)
  if (config.type === 's3' && config.endpoint) {
    return internalUrl.replace(config.endpoint, config.publicBaseUrl)
  }
  return internalUrl
}

// ─── Object operations using adaptor ──────────────────────────────────────────

/**
 * Check if object exists in storage
 */
export async function objectExists(
  adaptor: S3Adaptor,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    const result = await adaptor.listObjects({
      Bucket: bucket,
      Prefix: key,
      MaxKeys: 10,
    })
    return result.Contents.some((obj) => obj.Key === key)
  } catch {
    return false
  }
}

/**
 * Get the byte size of a single object, or null if it doesn't exist
 */
export async function getObjectSize(
  adaptor: S3Adaptor,
  bucket: string,
  key: string,
): Promise<number | null> {
  try {
    const result = await adaptor.listObjects({
      Bucket: bucket,
      Prefix: key,
      MaxKeys: 10,
    })
    return result.Contents.find((obj) => obj.Key === key)?.Size ?? null
  } catch {
    return null
  }
}

/**
 * List all objects with a given prefix
 * Note: pagination via continuation token is not yet supported by s3-adaptor API
 */
export async function listStorageObjects(
  adaptor: S3Adaptor,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const result = await adaptor.listObjects({ Bucket: bucket, Prefix: prefix })
  return result.Contents.map((obj) => obj.Key)
}

/**
 * Delete all objects with a given prefix
 */
export async function deleteStorageObjectsByPrefix(
  adaptor: S3Adaptor,
  bucket: string,
  prefix: string,
): Promise<{ deletedCount: number; keys: string[] }> {
  const keys = await listStorageObjects(adaptor, bucket, prefix)

  for (const key of keys) {
    try {
      await adaptor.deleteObject({ Bucket: bucket, Key: key })
    } catch {
      // ignore individual delete failures
    }
  }

  return { deletedCount: keys.length, keys }
}

// ─── Image set path utilities ─────────────────────────────────────────────────

/**
 * Generate the base S3 path for an image set (all 3 variant files share this prefix)
 */
export function generateImageSetBasePath(
  imageSetId: string,
  context: {
    projectId?: string | null
    surveyId?: string | null
    responseId?: string | null
    fileContext?: 'project' | 'survey' | 'response' | 'temp' | 'import' | null
    pathPrefix?: string | null
  },
): string {
  const { projectId, surveyId, responseId, fileContext, pathPrefix } = context

  if (pathPrefix) {
    return `${pathPrefix}/imgset-${imageSetId}`
  }

  if (fileContext === 'response' && projectId && surveyId && responseId) {
    return `project-${projectId}/survey/${surveyId}/response/${responseId}/imgset-${imageSetId}`
  }

  if (fileContext === 'survey' && projectId && surveyId) {
    return `project-${projectId}/survey/${surveyId}/imgset-${imageSetId}`
  }

  return `project-${projectId}/imgset-${imageSetId}`
}

// ─── Path/filename utilities ───────────────────────────────────────────────────

/**
 * Generate stored filename from original filename and hash
 * Format: {normalized-filename}_{hash-16-chars}.{normalized-extension}
 */
export function generateStoredFilename(
  originalFilename: string,
  hash: string,
): string {
  const hashSuffix = hash.substring(0, 16)

  const lastDot = originalFilename.lastIndexOf('.')
  const basename =
    lastDot > 0 ? originalFilename.substring(0, lastDot) : originalFilename
  const extension = lastDot > 0 ? originalFilename.substring(lastDot + 1) : ''

  const normalizedBasename = basename
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  const normalizedExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10)

  return normalizedExtension
    ? `${normalizedBasename}_${hashSuffix}.${normalizedExtension}`
    : `${normalizedBasename}_${hashSuffix}`
}

/**
 * Number of hash buckets response-attached files are spread across, both in
 * live S3 storage and in the `.vssp`/`.vssa` export archive layout (see
 * `VsspExportCollector`). Bounds the number of `response/{bucket}/` prefixes
 * under a survey regardless of response volume. Safe to change later: keys
 * are computed once at write time and then persisted (`File.filePath`), so a
 * change only affects new uploads, never existing ones.
 */
export const RESPONSE_FILE_BUCKET_COUNT = 256

/**
 * Deterministic hash bucket for a response's attached files, derived purely
 * from responseId so no batch/sequence state needs to be stored on the
 * response itself.
 */
export function responseFileBucket(responseId: string): string {
  const hash = crypto.createHash('md5').update(responseId).digest()
  const bucket = hash.readUInt32BE(0) % RESPONSE_FILE_BUCKET_COUNT
  return String(bucket).padStart(3, '0')
}

/**
 * Generate file path using context-based organization
 */
export function generateFilePath(
  projectId: string,
  storedFilename: string,
  context: {
    surveyId?: string | null
    responseId?: string | null
    fileContext?: 'project' | 'survey' | 'response' | 'temp' | 'import' | null
  },
): string {
  const surveyId = context.surveyId || null
  const responseId = context.responseId || null
  const fileContextType = context.fileContext || null

  if (fileContextType === 'response' && surveyId && responseId) {
    const bucket = responseFileBucket(responseId)
    return `project-${projectId}/survey/${surveyId}/response/${bucket}/${responseId}/${storedFilename}`
  }

  if (fileContextType === 'survey' && surveyId) {
    return `project-${projectId}/survey/${surveyId}/${storedFilename}`
  }

  if (fileContextType === 'temp') {
    return `project-${projectId}/temp/${storedFilename}`
  }

  if (fileContextType === 'import') {
    return `project-${projectId}/import/${storedFilename}`
  }

  return `project-${projectId}/${storedFilename}`
}

/**
 * Generate file path for platform-scoped (non-project) files, e.g. support ticket attachments
 */
export function generatePlatformFilePath(
  pathPrefix: string,
  storedFilename: string,
): string {
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${pathPrefix}/${year}/${month}/${storedFilename}`
}

/**
 * Calculate SHA256 hash from buffer
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Calculate SHA256 hash from a readable file stream
 */
export function calculateFileHashFromPath(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}
