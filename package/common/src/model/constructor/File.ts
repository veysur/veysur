import { S3_DEFAULT_BUCKET, S3_PRIVATE_BUCKET } from '../../constants'
import { IdMapping } from '../../util/SurveyImportIdTranslator'
import { RepairAction } from '../../util/SurveyImportRepairer'
import { Infer } from '@datacapy/schema'
import { fileShape } from '../schema/SchemaFile'

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
export interface File extends Omit<Infer<typeof fileShape>, 'import'> {}

export default File
