import { S3_DEFAULT_BUCKET, S3_PRIVATE_BUCKET } from '../../constants'
import { IdMapping } from '../../util/SurveyImportIdTranslator'
import { RepairAction } from '../../util/SurveyImportRepairer'

export class File {
  _id: string
  filename: string // Original filename
  storedFilename: string // Stored filename (normalized)
  hash: string | null // SHA256 hash of file content (null = placeholder/pending upload)
  size: number // File size in bytes
  mimeType: string // MIME type
  filePath: string // S3 path/key
  uploadedAt?: Date // Timestamp when upload was confirmed (null until verification)
  createdById: string // User who uploaded
  surveyId?: string | null // Link to survey (null for project-level files)
  responseId?: string | null // Link to response (null unless participant upload)
  fileContext?: 'project' | 'survey' | 'response' | 'temp' | 'import' | null // File type discriminator
  bucketType?: 'public' | 'private' // Which bucket type this file uses (public or private)
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null // Timestamp when file was soft-deletedAt (null = active)
  refs?: Array<{ type: string; id: string }> | null // References to entities using this file
  imageSetId?: string | null // Groups the 3 image set variants together (original, edited, thumb)
  imageVariant?: string | null // 'original' | 'edited' | 'thumb'

  // Import-specific metadata (only set when fileContext = 'import')
  import?: {
    entityType?: string | null // 'survey', 'participant', etc.
    format?: string | null // 'vsst', 'csv', etc.
    options?: Record<string, unknown> | null // { force: true }
    status?: 'pending' | 'processing' | 'completed' | 'failed' | null
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

export default File
