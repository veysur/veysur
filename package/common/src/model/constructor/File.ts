// cspell:ignore msword wordprocessingml spreadsheetml presentationml
import { S3_DEFAULT_BUCKET, S3_PRIVATE_BUCKET } from '../../constants'
import { IdMapping } from '../../util/SurveyImportIdTranslator'
import { RepairAction } from '../../util/SurveyImportRepairer'
import type { Infer, tags as t } from '@datacapy/schema'

import type { SchemaFile } from './File.schema'

type InternalId = string & t.MaxLength<17>

type FileMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/webp'
  | 'text/csv'
  | 'text/markdown'
  | 'application/octet-stream'
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-powerpoint'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

/** @schema file construct=File strict */
export interface FileFields {
  _id: InternalId & t.Required
  filename: string & t.Required & t.MaxLength<255>
  storedFilename: string & t.Required & t.MaxLength<255>
  /** SHA256 hex string (null allowed for placeholder files) */
  hash: (string & t.MinLength<64> & t.MaxLength<64> & t.Default<null>) | null
  size: number & t.Required
  mimeType: string & t.Required & t.MaxLength<127> & t.OneOf<FileMimeType>
  filePath: string & t.Required & t.MaxLength<512>
  uploadedAt: (Date & t.Default<null>) | null
  createdById: InternalId & t.Required
  surveyId: (InternalId & t.Default<null>) | null
  responseId: (InternalId & t.Default<null>) | null
  fileContext:
    | (('project' | 'survey' | 'response' | 'temp' | 'import') &
        t.Default<null>)
    | null
  bucketType: ('public' | 'private') & t.Default<'public'>
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
  deletedAt: (Date & t.Default<null>) | null
  refs:
    | ({
        type: string & t.Required & t.MaxLength<50>
        id: InternalId & t.Required
      }[] &
        t.Default<null>)
    | null
  imageSetId: (string & t.MaxLength<128> & t.Default<null>) | null
  imageVariant: (('original' | 'edited' | 'thumb') & t.Default<null>) | null
  import:
    | ({
        entityType?: string
        format?: string
        options?: {
          force?: boolean
          surveyId?: string | null
          publicationId?: string | null
          snapshotId?: string | null
          /** parts of a project settings (.vsps) import to apply */
          apply?: (string[] & t.Default<null>) | null
        } | null
        status?:
          'pending' | 'queued' | 'processing' | 'completed' | 'failed' | null
        result?: {
          success: boolean
          entityId?: string
          entityType?: string
          hasIdTranslations?: boolean | null
          repairs?: unknown[] | null
          discards?: unknown[] | null
          warnings?: unknown[] | null
          details?: unknown[] | null
          error?: string
        } | null
      } & t.Default<null>)
    | null
}

export class File {
  // Import-specific metadata (only set when fileContext = 'import')
  import?: {
    entityType?: string | null // 'survey', 'participant', etc.
    format?: string | null // 'vsst', 'csv', etc.
    options?: Record<string, unknown> | null // { force: true }
    status?: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | null
    result?: {
      success: boolean
      entityId?: string
      entityType?: string
      translations?: IdMapping[]
      repairs?: RepairAction[]
      discards?: RepairAction[]
      warnings?: string[]
      error?: string
    } | null
  } | null

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
  }

  /**
   * Get public accessible URL for this file (proxied through nginx)
   */
  getUrl(baseUrl: string = ''): string {
    // Map bucketType to actual bucket name
    const bucketType = this.bucketType || 'public'
    const bucket =
      bucketType === 'private' ? S3_PRIVATE_BUCKET : S3_DEFAULT_BUCKET
    // Returns URL like: https://account.veysur.local/veysur-files/proj_123/abc123-file.pdf
    // or: https://account.veysur.local/veysur-private/proj_123/abc123-file.pdf
    return `${baseUrl}/${bucket}/${this.filePath}`
  }

  /**
   * Get filename for download (Content-Disposition header)
   */
  getDownloadFilename(): string {
    return this.filename
  }

  /**
   * Format file size for display
   */
  getFormattedSize(): string {
    const kb = this.size / 1024
    if (kb < 1024) return `${kb.toFixed(2)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }
}

// `import` keeps its hand-written type: its `result` shape is not in the schema.
export interface File extends Omit<Infer<SchemaFile>, 'import'> {}

export default File
