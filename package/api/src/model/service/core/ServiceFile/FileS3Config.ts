import { ServiceConfig } from 'config/types'

// Export and re-export StorageConfig as single source of truth
export { StorageConfig, S3Config } from 'common'
import { StorageConfig } from 'common'

/**
 * Build StorageConfig from service config
 *
 * Accepts `object` rather than `ServiceConfig` because callers pass
 * `this.config`, which mzen-om's `Service` base class types with its own
 * loosely-typed `ServiceConfig` — structurally compatible at runtime but not
 * assignable to our stricter local type.
 */
export function getStorageConfig(configArg: object): StorageConfig {
  const config = configArg as ServiceConfig
  return {
    type: config.model.app.s3.type as 'local' | 's3',
    region: config.model.app.s3.region,
    publicBucket: config.model.app.s3.publicBucket,
    privateBucket: config.model.app.s3.privateBucket,
    accessKeyId: config.model.app.s3.accessKeyId,
    secretAccessKey: config.model.app.s3.secretAccessKey,
    publicBaseUrl: config.model.app.s3.publicBaseUrl,
    uploadSecret: config.model.app.s3.uploadSecret,
    localPath: config.model.app.s3.localPath,
    maxUploadSize: config.model.app.s3.maxUploadSize,
    endpoint: config.model.app.s3.endpoint,
    forcePathStyle: config.model.app.s3.forcePathStyle,
  }
}

// Backward-compat alias
export const getS3Config = getStorageConfig
